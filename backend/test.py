
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