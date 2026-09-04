# import os
# from pathlib import Path
# from agent import get_agent, ALLOWED_MODELS
# from langchain_core.messages import HumanMessage
# from database import init_db
# from rag import add_document_to_rag, retrieve_from_rag
# from tools import set_current_thread_id

# init_db()

# # Use a .txt extension so read_file_text parses it as plain text
# TEST_FILE = "uploads/test_rag_sample.txt"
# TEST_THREAD_ID = "test_rag_session_99"
# SECRET_CODE = "PROJECT_NEXAAI_SECRET_CODE_7788"

# Path("uploads").mkdir(exist_ok=True)

# # Write test text into a .txt file (NOT .pdf)
# with open(TEST_FILE, "w", encoding="utf-8") as f:
#     f.write(
#         f"NexaAI Verification Document:\n"
#         f"The top-secret access token for the NexaAI deployment pipeline is '{SECRET_CODE}'.\n"
#         f"This document is used strictly for automated testing."
#     )

# print("--- STARTING RAG & AGENT INTEGRATION TEST ---\n")

# print("1. Testing Document Ingestion into ChromaDB...")
# try:
#     upload_res = add_document_to_rag(TEST_FILE, thread_id=TEST_THREAD_ID)
#     print(f"   [SUCCESS] Document ingested: {upload_res}\n")
# except Exception as e:
#     print(f"   [ERROR] Ingestion failed: {e}\n")
#     exit(1)

# print("2. Testing Direct RAG Vector Retrieval...")
# try:
#     retrieved_text = retrieve_from_rag(
#         query="What is the top-secret access token?",
#         thread_id=TEST_THREAD_ID
#     )
#     print(f"   [RETRIEVED CONTEXT]:\n{retrieved_text}\n")
#     if SECRET_CODE in retrieved_text:
#         print("   [SUCCESS] Direct RAG retrieval verified!\n")
#     else:
#         print("   [FAILURE] Secret code not found in retrieved text.\n")
# except Exception as e:
#     print(f"   [ERROR] Direct RAG retrieval failed: {e}\n")

# print("3. Testing Agent Tool Calling with RAG...")
# set_current_thread_id(TEST_THREAD_ID)

# rag_test_prompt = "What is the top-secret access token stored in the uploaded document?"

# for model_name in ALLOWED_MODELS:
#     print("==========================================")
#     print(f"Testing Model with RAG: {model_name}")
#     print("==========================================")
    
#     try:
#         agent = get_agent(model_name)
#         config = {"configurable": {"thread_id": TEST_THREAD_ID}}

#         print("Agent Response: ", end="", flush=True)
#         for message_chunk, metadata in agent.stream(
#             {"messages": [HumanMessage(content=rag_test_prompt)]},
#             config=config,
#             stream_mode="messages"
#         ):
#             if message_chunk.content and isinstance(message_chunk.content, str):
#                 print(message_chunk.content, end="", flush=True)

#         print("\n")

#     except Exception as e:
#         print(f"\n[ERROR] Failed to execute agent with model '{model_name}': {e}\n")

# # Cleanup mock test file
# if os.path.exists(TEST_FILE):
#     os.remove(TEST_FILE)

# print("--- RAG TEST COMPLETE ---")


import json
import requests

def test_thinking_stream():
    url = "http://127.0.0.1:8000/chat/stream"
    payload = {
        "message": "Tell me about latest news today",
        "thread_id": "test_stream_123",
        "model": "gemini-3.6-flash"
    }

    print("--- Sending Request to Streaming Endpoint ---")
    
    try:
        response = requests.post(url, json=payload, stream=True)
        response.raise_for_status()

        for line in response.iter_lines():
            if not line:
                continue
            
            line_str = line.decode("utf-8")
            if line_str.startswith("data: "):
                data_json = line_str[6:]
                try:
                    event = json.loads(data_json)
                    
                    if event.get("done"):
                        print("\n\n--- Stream Completed ---")
                        break
                    
                    event_type = event.get("type")
                    text = event.get("text", "")

                    if event_type == "thinking":
                        print(f"\n[THINKING]: {text}", end="", flush=True)
                    elif event_type == "text":
                        print(text, end="", flush=True)

                except json.JSONDecodeError:
                    print(f"\n[RAW DATA]: {line_str}")

    except Exception as e:
        print(f"\nTest failed: {e}")

if __name__ == "__main__":
    test_thinking_stream()