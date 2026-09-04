"""
Database & Persistence Layer for NexaAI

This module manages database connection setups, SQLAlchemy ORM models,
and helper CRUD operations for SQLite persistence.

Key Responsibilities:
1. Conversation Metadata: Storing thread session IDs, chat titles, and timestamps for sidebar UI listing.
2. Chat History: Logging individual user/assistant exchange messages per thread.
3. Long-Term Memory: Storing persistent facts and preferences saved by agent tools.
"""



from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# Ensure the local storage directory exists before creating the SQLite database file
Path("data").mkdir(exist_ok=True)

# Define SQLite database connection string
DATABASE_URL = "sqlite:///data/chatbot_memory.db"

# Create SQLAlchemy database engine
# 'check_same_thread=False' allows concurrent access from multi-threaded FastAPI requests
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Factory for creating thread-safe database sessions
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Base class for declaring ORM models
Base = declarative_base()


# ==========================================
# Database ORM Models
# ==========================================

class Conversation(Base):
    """
    Represents a conversation session thread in the application.
    Used primarily for rendering active chat threads in the frontend sidebar.
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, unique=True, index=True) # Unique identifier for LangGraph state
    title = Column(String, default="New Chat")          # Dynamic title derived from the first user prompt
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow) # Updated on new messages to sort by recency


class ChatMessage(Base):
    """
    Stores individual message logs exchanged between human user and AI assistant.
    """
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, index=True) # References the associated Conversation thread
    role = Column(String)                  # 'user' or 'assistant'
    content = Column(Text)                 # The raw text content of the message
    created_at = Column(DateTime, default=datetime.utcnow)


class LongTermMemory(Base):
    """
    Stores explicit long-term memories, facts, and user preferences saved via the memory tool.
    """
    __tablename__ = "long_term_memory"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, index=True) # Scopes memory to a specific conversation thread
    memory = Column(Text)                  # The saved fact or preference string
    created_at = Column(DateTime, default=datetime.utcnow)


# ==========================================
# Helper Functions & Database Operations
# ==========================================

def init_db():
    """Initializes the database schema by creating all defined tables if they do not exist."""
    Base.metadata.create_all(bind=engine)

# Create a new conversation thread with a truncated title or update the timestamp of an existing one
def create_or_update_conversation(thread_id: str, first_message: str | None = None):
    """
    Creates a new conversation record or updates the timestamp of an existing thread.
    Automatically generates a truncated title (max 40 chars) from the initial user prompt.
    """
    db = SessionLocal()

    try:
        conversation = (
            db.query(Conversation)
            .filter(Conversation.thread_id == thread_id)
            .first()
        )

        if not conversation:
            title = "New Chat"

            # Truncate initial message to create a clean thread title
            if first_message:
                title = first_message.strip()[:40]
                if len(first_message.strip()) > 40:
                    title += "..."

            conversation = Conversation(
                thread_id=thread_id,
                title=title,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            db.add(conversation)

        else:
            # Touch timestamp to pull active conversation to top of list
            conversation.updated_at = datetime.utcnow()

        db.commit()

    finally:
        db.close()


# Fetch all active conversations ordered by most recent update for the UI sidebar
def list_conversations():
    """
    Retrieves all conversation metadata records sorted by the most recently updated thread.
    Used by sidebar routes in FastAPI.
    """
    db = SessionLocal()

    try:
        return (
            db.query(Conversation)
            .order_by(Conversation.updated_at.desc())
            .all()
        )

    finally:
        db.close()


# Save an incoming user or assistant message to the database and update thread recency
def save_chat_message(thread_id: str, role: str, content: str):
    """
    Logs a new message entry (user prompt or AI response) and updates 
    the parent thread's 'updated_at' timestamp.
    """
    db = SessionLocal()

    try:
        msg = ChatMessage(
            thread_id=thread_id,
            role=role,
            content=content,
            created_at=datetime.utcnow()
        )

        db.add(msg)

        # Sync conversation update timestamp
        conversation = (
            db.query(Conversation)
            .filter(Conversation.thread_id == thread_id)
            .first()
        )

        if conversation:
            conversation.updated_at = datetime.utcnow()

        db.commit()

    finally:
        db.close()


# Retrieve all stored chat messages for a specific thread in chronological order
def get_chat_history(thread_id: str):
    """
    Fetches the full chronologically sorted chat history for a given thread_id.
    """
    db = SessionLocal()

    try:
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )

    finally:
        db.close()


# Save a key fact or user preference as a long-term memory entry
def save_memory(thread_id: str, memory: str):
    """
    Saves a persistent memory item for a thread. 
    Intended for use inside the 'remember_fact' LangGraph tool.
    """
    db = SessionLocal()

    try:
        item = LongTermMemory(
            thread_id=thread_id,
            memory=memory,
            created_at=datetime.utcnow()
        )

        db.add(item)
        db.commit()

        return "Memory saved successfully."

    finally:
        db.close()


# Search and return up to 20 recent long-term memories saved for the given thread
def search_memory(thread_id: str, query: str):
    """
    Retrieves the 20 most recent long-term memories saved for a thread.
    Intended for use inside the 'recall_memory' LangGraph tool.
    """
    db = SessionLocal()

    try:
        memories = (
            db.query(LongTermMemory)
            .filter(LongTermMemory.thread_id == thread_id)
            .order_by(LongTermMemory.created_at.desc())
            .limit(20)
            .all()
        )

        if not memories:
            return "No saved memory found."

        return "\n".join([f"- {m.memory}" for m in memories])

    finally:
        db.close()