from core.toxicity_detector import detect_toxicity
from core.rephraser import rephrase_text
from models.pydantic import ModerationResponse
from models.karma import dailyKarma, refresh_karma
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select


async def moderate_text(user_id:str, mssg:str, db : AsyncSession) -> ModerationResponse:
    toxicity_score, label = detect_toxicity(mssg)
    result = await db.execute(select(dailyKarma).where(dailyKarma.user_id == user_id))
    user_karma = result.scalars().first()
    
    if label== "toxic":
        alt = rephrase_text(mssg)
        
        return ModerationResponse(
        user_id = user_id,
        original = mssg,
        karma=user_karma,
        toxicity_score = toxicity_score,
        status = "toxic",
        suggestion = alt[0],
        alternatives = alt[1:3]
    )
        
    else:
        return ModerationResponse(
            user_id = user_id,
            original= mssg,
            toxicity_score = toxicity_score,
            status = "clean",
        )
        
    