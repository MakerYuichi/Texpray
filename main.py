from fastapi import FastAPI
from pydantic import BaseModel
from models.pydantic import Message, ModerationResponse
from core.moderation import moderate_text


app = FastAPI()

@app.post("/moderate", response_model = ModerationResponse)
async def moderate_message(message: Message):
    result = moderate_text(message.mssg) 
    return result

