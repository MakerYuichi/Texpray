import openai
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="./.env")

openai.api_key = os.getenv("OPENAI_API_KEY") # Replace with your actual key

def rephrase_text(text: str) -> list:
    system_prompt = (
        "You are a helpful assistant that rewrites messages to be kind, respectful, and non-toxic, "
        "while keeping the original intent intact."
    )

    user_prompt = f"Rewrite this to be non-toxic and kind, without losing intent:\n\n{text}"

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # or "gpt-4" if you have access
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=100,
            n=3  # Return 3 suggestions
        )

        suggestions = [choice["message"]["content"].strip() for choice in response["choices"]]
        return suggestions

    except Exception as e:
        print(f"OpenAI API Error: {e}")
        return ["(Rephrasing failed)"]

# Example usage
if __name__ == "__main__":
    result = rephrase_text("You're so dumb and annoying.")
    print("Suggestions:\n", *result, sep="\n- ")
