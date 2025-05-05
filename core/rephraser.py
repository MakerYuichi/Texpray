from openai import OpenAI
import os, re
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
            "content": f"Rephrase this professionally: {text} (provide 3 variants in the order that best variant should be on top and dont write serial number )"
        }],
        max_tokens=200
    )
    output = response.choices[0].message.content 
    lines = [re.sub(r"^\d+\.\s*", "", line.strip()) for line in output.split('\n') if line.strip()]
    return lines
    