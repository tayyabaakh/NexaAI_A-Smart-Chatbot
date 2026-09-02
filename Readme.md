# NexaAI — Smart Chatbot Dependencies

This repository contains the backend and frontend configurations for **NexaAI**, a full-stack, AI-powered smart chatbot application.

---

## 🐍 Backend Dependencies (Python & FastAPI)

These packages manage the backend API, Large Language Model (LLM) agent workflows, vector embeddings, document parsing, and database storage.

### 🌐 Web Framework & Server
* **`fastapi`**: Modern, fast web framework for building RESTful APIs with Python.
* **`uvicorn`**: High-performance ASGI server used to serve the FastAPI backend.
* **`jinja2`**: Templating engine for rendering dynamic HTML templates if needed.
* **`python-multipart`**: Streaming multipart parser for handling file uploads in FastAPI.
* **`python-dotenv`**: Reads key-value pairs from a `.env` file to set environment variables securely.

### 🤖 AI Agents & Workflow Orchestration
* **`langchain`**: Core framework for building LLM-powered applications, tools, and chains.
* **`langchain-google-genai`**: Official LangChain integration for Google Gemini models.
* **`langchain-core`**: Standard interface and base abstractions for the LangChain ecosystem.
* **`langgraph`**: Graph-based framework built on LangChain to build stateful multi-agent workflows.
* **`langchain-text-splitters`**: Tools for chunking long documents into smaller segments for vector embeddings.
* **`langgraph-checkpoint-sqlite`**: SQLite persistence checkpointer for preserving agent conversation state across sessions.

### 📚 Vector Database & Document Processing
* **`langchain-chroma`**: LangChain vector store integration wrapper for ChromaDB.
* **`chromadb`**: Embeddings database for vector search and fast similarity retrieval.
* **`pypdf`**: Python library for extracting text from PDF files.
* **`docx2txt`**: Extraction utility for converting Microsoft Word (`.docx`) files into plain text.

### 🔍 External Search & APIs
* **`langchain-tavily`**: LangChain integration wrapper for the Tavily Search API.
* **`tavily-python`**: Official Python client wrapper for AI-optimized web searches using Tavily.

### 🗄️ Database Management
* **`sqlalchemy`**: SQL Toolkit and Object-Relational Mapping (ORM) framework for database handling.

---

## ⚡ Frontend Dependencies (React & Tailwind CSS)

These packages power the user interface, API calls, and styling for the client-side application.

### 🎨 Core UI Framework & Styling
* **`react`**: JavaScript library for building component-based user interfaces.
* **`tailwindcss`**: Utility-first CSS framework for custom UI design.
* **`@tailwindcss/vite`**: Official Vite plugin for Tailwind CSS v4 integration.

### 🛠️ Frontend Utilities
* **`axios`**: Promise-based HTTP client for making API requests to the FastAPI backend.
* **`lucide-react`**: Flexible and lightweight icon set optimized for React applications.

---

## 🚀 Environment Setup

### Backend Setup
```bash
# Activate your Conda environment
conda activate NexaAI

# Install Python dependencies
pip install -r requirements.txt