from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.pydantic import Message, ModerationResponse, ReflectionDecision
from utils.moderation import moderate_text
from models.reflection import pendingReflection
from core.rephraser import rephrase_text
from models.reflection_window import handle_reflection_action
from uuid import UUID

app = FastAPI()

@app.post("/moderate", response_model=ModerationResponse)
async def moderate_message(message: Message, db: AsyncSession = Depends(get_db)):
    return await moderate_text(message.user_id, message.mssg, db)


@app.get("/reflect/{reflection_id}/alternatives")
async def get_alternatives(reflection_id: UUID, db: AsyncSession=Depends(get_db)):
    result = await db.execute(
        select(pendingReflection).where(pendingReflection.reflection_id == reflection_id)
    ) 
    reflection = result.scalars().first()
    
    if not reflection:
        raise HTTPException(status_code=404, detail="Reflection not found")
    
    try:
        rephrased = rephrase_text(reflection.original_message)
        cleaned = [alt.strip('"') for alt in rephrased[1:3]]
        return {"alternatives": cleaned}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to Rephrase: {e}")
    

@app.post("/reflect/{reflection_id}")
async def process_reflection(reflection_id: UUID, decision: ReflectionDecision, db:AsyncSession=Depends(get_db)):
    try:
        result = await handle_reflection_action(
            db=db,
            reflection_id = reflection_id,
            user_id=decision.user_id,
            action=decision.action.value
        )
        return result
    
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server Error:  {str(e)}")
  
    