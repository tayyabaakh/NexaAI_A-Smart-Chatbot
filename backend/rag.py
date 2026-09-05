
"""
RAG (Retrieval-Augmented Generation) & Vector Database Operations Module

This module handles the full document ingestion pipeline:
1. Environment & SSL Certificate Configuration.
2. File Parsing across multiple formats (.pdf, .docx, .txt, .md, .py, .csv) with OCR fallback.
3. Text Chunking using LangChain's RecursiveCharacterTextSplitter.
4. Embedding Generation via Google Generative AI (`gemini-embedding-001`).
5. Vector Storage & Thread-Filtered Retrieval powered by ChromaDB.
"""

from pathlib import Path
from typing import List
from dotenv import load_dotenv
import os
import certifi
import pytesseract
from pdf2image import convert_from_path

# Load environment variables (e.g., GOOGLE_API_KEY)
load_dotenv()

# Configure SSL certificate bundles using certifi to fix SSL verification issues on HTTPS requests
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
import docx2txt

# Explicitly configure your exact system paths for Poppler and Tesseract
POPPLER_BIN_PATH = r"C:\Program Files\Release-26.02.0-0\poppler-26.02.0\Library\bin"
TESSERACT_EXE = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Point pytesseract directly to the executable
pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE

# Ensure required local directories exist
Path("uploads").mkdir(exist_ok=True)       # Directory for temporary uploaded user files
Path("chroma_db").mkdir(exist_ok=True)     # Storage directory for persistent vector database

# Initialize the Google Gemini embedding model
embeddings = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")

# Initialize persistent ChromaDB vector store instance
vectorstore = Chroma(
    collection_name="nexaaidocs",
    embedding_function=embeddings,
    persist_directory="chroma_db"
)


def read_file_text(file_path: str) -> str:
    """
    Extracts raw text content from supported file formats.
    Falls back to Poppler + Tesseract OCR if PDF is image-based.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        reader = PdfReader(file_path)
        text = ""

        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted + "\n"

        clean_extracted = text.replace("CamScanner", "").strip()

        # Fallback to OCR if extracted text is too short (image-based or scanned PDF)
        if len(clean_extracted) < 50:
            print(f"[OCR] PDF {path.name} appears image-based. Running Tesseract OCR...")
            
            try:
                images = convert_from_path(file_path, poppler_path=POPPLER_BIN_PATH)
                ocr_text = ""
                for img in images:
                    ocr_text += pytesseract.image_to_string(img) + "\n"
                
                if ocr_text.strip():
                    return ocr_text.strip()
            except Exception as ocr_err:
                print(f"[OCR WARNING]: OCR failed during execution: {ocr_err}")
            
            # Fall back to extracted text if OCR failed but pypdf caught some characters
            if clean_extracted:
                return clean_extracted
            
            raise ValueError(
                "Could not extract text from this scanned PDF. "
                "Verify Tesseract OCR is working properly."
            )

        return text

    if suffix == ".docx":
        return docx2txt.process(file_path) or ""

    if suffix in [".txt", ".md", ".py", ".csv"]:
        return path.read_text(encoding="utf-8", errors="ignore")

    raise ValueError("Unsupported file type. Upload PDF, DOCX, TXT, MD, PY, or CSV.")


def add_document_to_rag(file_path: str, thread_id: str):
    """
    Ingests a document by extracting text, splitting it into semantic chunks,
    tagging it with session metadata, and storing embeddings in ChromaDB.
    """
    text = read_file_text(file_path)

    if not text or not text.strip():
        raise ValueError("No text could be extracted from this file.")

    # Configure text splitter with overlapping windows
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=900,
        chunk_overlap=150
    )

    raw_chunks = splitter.split_text(text)

    # Filter out blank/whitespace chunks before embedding
    valid_chunks = [c.strip() for c in raw_chunks if c and c.strip()]

    if not valid_chunks:
        raise ValueError("Document yielded no valid text chunks after splitting.")

    # Wrap chunks into LangChain Document objects tagged with thread and source metadata
    docs: List[Document] = [
        Document(
            page_content=chunk,
            metadata={
                "thread_id": thread_id,             # Filters retrieval strictly to current chat session
                "source": Path(file_path).name      # Preserves original file name for source attribution
            }
        )
        for chunk in valid_chunks
    ]

    # Generate embeddings and persist chunks to vector database
    vectorstore.add_documents(docs)

    return {
        "filename": Path(file_path).name,
        "chunks": len(docs)
    }


def retrieve_from_rag(query: str, thread_id: str, k: int = 4) -> str:
    """
    Queries ChromaDB for the top 'k' most relevant document chunks belonging to a specific thread.
    """
    clean_query = query.strip() if query else ""
    if not clean_query:
        return "Please provide a valid, non-empty search query."

    docs = vectorstore.similarity_search(
        clean_query,
        k=k,
        filter={"thread_id": thread_id}
    )

    if not docs:
        return "No relevant uploaded document content found."

    results = []

    for i, doc in enumerate(docs, start=1):
        source = doc.metadata.get("source", "uploaded document")
        results.append(
            f"[Source {i}: {source}]\n{doc.page_content}"
        )

    return "\n\n".join(results)