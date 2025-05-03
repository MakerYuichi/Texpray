from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv() 

client = OpenAI(
    api_key=os.getenv("DEEPINFRA_API_KEY"),
    base_url="https://api.deepinfra.com/v1/openai"  # Verified URL
)

def rephrase_text(text: str) -> list:
    response = client.chat.completions.create(
        model="mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages=[{
            "role": "user",
            "content": f"Rephrase this professionally: {text} (provide 3 variants)"
        }],
        max_tokens=100
    )
    return [choice.message.content for choice in response.choices]