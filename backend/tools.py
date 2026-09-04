import math
import ast
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_tavily import TavilySearch
from database import save_memory,search_memory
from rag import retrieve_from_rag
import requests
import os
load_dotenv()

CURRENT_THREAD_ID="default"

# This function sets the current thread ID for the agent's context.
def set_current_thread_id(thread_id:str):
    global CURRENT_THREAD_ID
    CURRENT_THREAD_ID=thread_id

# tools    
web_search=TavilySearch(
    max_results=3,
    topic="general",
    search_depth="advanced"
) 


ALLOWED_NAMES = {
    "math": math,
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "pow": pow,
}

@tool
def calculator(expression: str) -> str:
    """Useful for simple math calculations.

    Input should be a valid math expression.
    Examples: '2 + 2', 'math.sqrt(16)', '10 * 5'
    """
    try:
        # 1. Sanitize string input: check for double underscores to block class attribute inspection
        if "__" in expression:
            return "Calculation error: Access to private attributes is forbidden."

        # 2. Ensure length limit to prevent denial-of-service via huge expressions
        if len(expression) > 200:
            return "Calculation error: Expression too long."

        # 3. Parse AST to ensure no dangerous operations (like lambdas, imports, or loops) exist
        parsed_tree = ast.parse(expression, mode="eval")

        for node in ast.walk(parsed_tree):
            # Block attribute access other than permitted modules/functions
            if isinstance(node, (ast.Import, ast.ImportFrom, ast.Lambda, ast.ListComp, ast.DictComp)):
                return "Calculation error: Unsafe constructs detected."

        # 4. Safely execute restricted evaluation
        result = eval(expression, {"__builtins__": {}}, ALLOWED_NAMES)
        return str(result)

    except Exception as e:
        return f"Calculation error: {str(e)}"


@tool
def get_stock_price(symbol: str) -> dict:
    """Fetch latest stock price for a given symbol (e.g. 'AAPL', 'TSLA')."""
    api_key = os.getenv("ALPHA_VANTAGE_API_KEY", "EB43GFE4J9Y1Y7AX")
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}"
    r = requests.get(url, timeout=10)
    return r.json()


@tool
def get_weather(city: str) -> str:
    """Fetch real-time weather for a given city."""
    api_key = os.getenv("OPENWEATHER_API_KEY")
    if not api_key:
        return "Weather API key is not configured."

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": api_key, "units": "metric"}

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        temperature = data["main"]["temp"]
        feels_like = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        condition = data["weather"][0]["description"]
        wind_speed = data["wind"]["speed"]

        return (
            f"Weather in {city}:\n"
            f"Temperature: {temperature}°C\n"
            f"Feels like: {feels_like}°C\n"
            f"Condition: {condition}\n"
            f"Humidity: {humidity}%\n"
            f"Wind speed: {wind_speed} m/s"
        )
    except requests.exceptions.HTTPError:
        return f"Could not find weather information for '{city}'."
    except requests.exceptions.RequestException as e:
        return f"Weather service error: {str(e)}"



# This tool allows agent to remember a fact for the current thread, 
# storing it in the database for future recall.
@tool
def remember_fact(fact:str)->str:
    """
    Save an important user preference, fact, or context for the current thread into long-term memory.
    Use this when the user asks you to remember something .
    """
    return save_memory(thread_id=CURRENT_THREAD_ID,fact=fact)   

# This tool allows agent to recall previously saved facts or conversations for the current thread,
@tool
def recall_memory(query:str)->str:
    """
    Retrieve previously saved user preferences,long-term memories, historical interactions, or persistent facts for the current thread.
    Use this when the user asks you to recall something.
    """
    return search_memory(thread_id=CURRENT_THREAD_ID,query=query)

@tool
def search_uploaded_document(query:str)->str:
    """
    Search  uploaded documents for the relevant information.
    Use this when the user asks about uploaded PDFs,DOCX,TXT,notes,files,or documents.
    """
    return retrieve_from_rag(query=query,thread_id=CURRENT_THREAD_ID)

tools=[web_search,calculator,remember_fact,recall_memory,search_uploaded_document,get_stock_price,get_weather]