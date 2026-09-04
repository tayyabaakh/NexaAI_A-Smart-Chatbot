import os 
from pathlib import Path

from langchain_core import tools
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, START, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from tools import tools
from dotenv import load_dotenv
import certifi 

load_dotenv()

os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

Path("data").mkdir(exist_ok=True)

DEFAULT_MODEL = os.getenv("GROQ_MODEL", "mixtral-8x7b-32768")

ALLOWED_MODELS = {
    "mixtral-8x7b-32768",
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b"
}

SYSTEM_PROMPT = """
You are a helpful Agentic AI assistant named NexaAI similar to ChatGPT.

You can:
1. Answer normal questions.
2. Use tools when needed.
3. Search uploaded documents using the RAG tool.
4. Search the web for latest/current information using Tavily Search.
5. Remember important user information using the memory tool.
6. Recall memory when useful.
7. Use calculator for math.

Rules:
- If the user asks about latest news, current events, recent updates, today's information, current prices, current people, current versions, new releases, or anything time-sensitive, use Tavily Search.
- If the user asks about an uploaded document, use search_uploaded_documents.
- If the user asks you to remember something, use remember_this.
- If the user asks about previous preferences or saved facts, use recall_memory.
- Use calculator for math questions.
- When using web search, summarize clearly and mention that the answer is based on web search results.
- Be clear, helpful, and concise.
"""

def normalize_model_name(requested_model: str | None) -> str:
    if not requested_model:
        return DEFAULT_MODEL
    model_name = requested_model.strip()
    if model_name not in ALLOWED_MODELS:
        return DEFAULT_MODEL
    return model_name


async def build_agents(requested_model: str, checkpointer: AsyncSqliteSaver):
    selected_model = normalize_model_name(requested_model)
    groq_api_key = os.getenv("GROQ_API_KEY")

    primary_llm = ChatGroq(
        model=selected_model,
        temperature=0.3,
        streaming=True,
        max_retries=3,
        timeout=30,
        groq_api_key=groq_api_key,
    )

    fallback_model_name = "openai/gpt-oss-120b" if selected_model != "openai/gpt-oss-120b" else "mixtral-8x7b-32768"
    fallback_llm = ChatGroq(
        model=fallback_model_name,
        temperature=0.3,
        streaming=True,
        max_retries=2,
        groq_api_key=groq_api_key,
    )

    llm_with_fallbacks = primary_llm.with_fallbacks([fallback_llm])
    llm_with_tools = llm_with_fallbacks.bind_tools(tools)

    async def chatbot_node(state: MessagesState):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)

    workflow = StateGraph(MessagesState)
    workflow.add_node("chatbot", chatbot_node)
    workflow.add_node("tools", tool_node)

    workflow.add_edge(START, "chatbot")
    workflow.add_conditional_edges("chatbot", tools_condition)
    workflow.add_edge("tools", "chatbot")

    # Pass the active checkpointer context passed from app.py
    return workflow.compile(checkpointer=checkpointer)


_AGENT_CACHE = {}

async def get_agent(requested_model: str | None = None, checkpointer: AsyncSqliteSaver | None = None):
    selected_model = normalize_model_name(requested_model)
    if selected_model not in _AGENT_CACHE:
        _AGENT_CACHE[selected_model] = await build_agents(selected_model, checkpointer)
    return _AGENT_CACHE[selected_model]