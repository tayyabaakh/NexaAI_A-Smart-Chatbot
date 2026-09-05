import os
import certifi
import asyncio
import json
import uuid
from pathlib import Path
from contextlib import asynccontextmanager
import base64
from io import BytesIO
from huggingface_hub import InferenceClient


from dotenv import load_dotenv
from pydantic import BaseModel
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from agent import get_agent
from database import (
    init_db,
    save_chat_message,
    get_chat_history,
    create_or_update_conversation,
    list_conversations
)
from rag import add_document_to_rag
from tools import set_current_thread_id

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

Path("uploads").mkdir(exist_ok=True)
Path("data").mkdir(exist_ok=True)

init_db()

# Global checkpointer reference
checkpointer_instance: AsyncSqliteSaver | None = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global checkpointer_instance
    # Initialize SQLite Async Checkpointer context during server lifecycle
    async with AsyncSqliteSaver.from_conn_string("data/langgraph_checkpoints.sqlite") as saver:
        checkpointer_instance = saver
        yield

app = FastAPI(title="NexaAI Backend API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


TOOL_THINKING_MAP = {
    "tavily_search_results_json": "🌐 Searching the web...",
    "tavily_search": "🌐 Searching the web...",
    "search_uploaded_documents": "📄 Searching uploaded documents...",
    "calculator": "🧮 Calculating...",
    "remember_this": "🧠 Updating memory...",
    "recall_memory": "🧠 Recalling memory...",
}

def get_thinking_status(tool_name: str) -> str:
    return TOOL_THINKING_MAP.get(tool_name.lower(), f"⚙️ Executing {tool_name}...")


@app.get("/health")
async def root():
    return {"status": "online", "message": "NexaAI Backend API is running"}

# Initialize Hugging Face Inference Client (uses HF_TOKEN from .env)
hf_client = InferenceClient(token=os.getenv("HF_TOKEN"))

class ImageGenerateRequest(BaseModel):
    prompt: str

@app.post("/generate-image")
async def generate_image(request: ImageGenerateRequest):
    prompt = request.prompt.strip()
    if not prompt:
        return JSONResponse(
            {"success": False, "message": "Prompt is required."},
            status_code=400
        )

    try:
        # Run inference using FLUX.1-dev or stabilityai/stable-diffusion-xl-base-1.0
        image = hf_client.text_to_image(
            prompt,
            model="black-forest-labs/FLUX.1-schnell"
        )

        # Convert PIL Image to Base64 Data URL for easy streaming to React
        buffered = BytesIO()
        image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        data_url = f"data:image/jpeg;base64,{img_str}"

        return JSONResponse({
            "success": True,
            "imageUrl": data_url
        })

    except Exception as e:
        print(f"[IMAGE GENERATION ERROR]: {e}")
        return JSONResponse(
            {"success": False, "message": str(e)},
            status_code=500
        )


@app.get("/conversations")
async def conversations():
    items = list_conversations()
    return {
        "conversations": [
            {
                "thread_id": item.thread_id,
                "title": item.title,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat()
            }
            for item in items
        ]
    }


@app.get("/history/{thread_id}")
async def history(thread_id: str):
    messages = get_chat_history(thread_id)
    return {
        "messages": [
            {
                "role": msg.role,
                "content": msg.content
            }
            for msg in messages
        ]
    }


@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    thread_id: str = Form(...)
):
    try:
        allowed_extensions = [".pdf", ".docx", ".txt", ".md", ".py", ".csv"]
        filename = file.filename or "uploaded_file"
        suffix = Path(filename).suffix.lower()

        if suffix not in allowed_extensions:
            return JSONResponse(
                {
                    "success": False,
                    "message": "Unsupported file type. Upload PDF, DOCX, TXT, MD, PY, or CSV."
                },
                status_code=400
            )

        file_id = str(uuid.uuid4())
        safe_filename = filename.replace(" ", "_")
        file_path = f"uploads/{file_id}_{safe_filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        create_or_update_conversation(thread_id, f"Uploaded: {safe_filename}")

        result = add_document_to_rag(
            file_path=file_path,
            thread_id=thread_id
        )

        return JSONResponse({
            "success": True,
            "message": f"Uploaded {result['filename']} and created {result['chunks']} chunks."
        })

    except Exception as e:
        return JSONResponse(
            {
                "success": False,
                "message": str(e)
            },
            status_code=500
        )


def sse_data(payload: dict) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def extract_text_from_chunk(chunk) -> str:
    content = getattr(chunk, "content", "")

    if not content:
        return ""

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        text_parts = []
        for item in content:
            if isinstance(item, str):
                text_parts.append(item)
            elif isinstance(item, dict):
                if item.get("type") == "text" and isinstance(item.get("text"), str):
                    text_parts.append(item["text"])
                elif isinstance(item.get("text"), str):
                    text_parts.append(item["text"])
                elif isinstance(item.get("content"), str):
                    text_parts.append(item["content"])

        return "".join(text_parts)

    return ""


def extract_thinking_from_chunk(chunk) -> str:
    additional_kwargs = getattr(chunk, "additional_kwargs", {})
    if "thinking" in additional_kwargs:
        return str(additional_kwargs["thinking"])
    
    content = getattr(chunk, "content", [])
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "thinking":
                return item.get("thinking", "")
    return ""


class ChatRequest(BaseModel):
    message: str
    thread_id: str = "default"
    model: str = "mixtral-8x7b-32768"


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    user_message = request.message
    thread_id = request.thread_id
    selected_model = request.model

    if not user_message.strip():
        return JSONResponse(
            {"error": "Message is required."},
            status_code=400
        )

    create_or_update_conversation(thread_id, user_message)
    save_chat_message(thread_id, "user", user_message)

    set_current_thread_id(thread_id)

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    async def event_generator():
        final_answer = ""
        last_thinking_msg = ""

        try:
            agent = await get_agent(selected_model, checkpointer_instance)

            inputs = {
                "messages": [
                    HumanMessage(content=user_message)
                ]
            }

            initial_thinking = "🤔 Analyzing your question..."
            last_thinking_msg = initial_thinking
            yield sse_data({"type": "thinking", "text": initial_thinking})

            async for event in agent.astream_events(inputs, config=config, version="v2"):
                kind = event.get("event")

                if kind == "on_tool_start":
                    tool_name = event.get("name", "")
                    thinking_str = get_thinking_status(tool_name)

                    if thinking_str != last_thinking_msg:
                        last_thinking_msg = thinking_str
                        yield sse_data({"type": "thinking", "text": thinking_str})

                elif kind == "on_tool_end":
                    status_str = "🧠 Synthesizing findings..."
                    if status_str != last_thinking_msg:
                        last_thinking_msg = status_str
                        yield sse_data({"type": "thinking", "text": status_str})

                elif kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")

                    thinking_token = extract_thinking_from_chunk(chunk)
                    if thinking_token:
                        yield sse_data({"type": "thinking", "text": thinking_token})

                    if getattr(chunk, "tool_call_chunks", None) or getattr(chunk, "tool_calls", None):
                        continue

                    token = extract_text_from_chunk(chunk)
                    if token:
                        final_answer += token
                        yield sse_data({"type": "text", "text": token})

                await asyncio.sleep(0)

            if final_answer.strip():
                save_chat_message(thread_id, "assistant", final_answer)

            yield sse_data({"done": True})

        except Exception as e:
            print(f"[STREAM ERROR]: {e}")
            yield sse_data({"type": "thinking", "text": f"Error: {str(e)}"})
            yield sse_data({"done": True})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# Serve static frontend files
frontend_dist = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Serve index.html for React SPA routing
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )