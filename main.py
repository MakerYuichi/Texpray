from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from sqlalchemy.future import select
from models.karma import dailyKarma, refresh_karma
from models.pydantic import Message, ModerationResponse
from core.toxicity_detector import detect_toxicity
from core.rephraser import rephrase_text


app = FastAPI()


@app.post("/moderate", response_model=ModerationResponse)
async def moderate_message(message: Message, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(dailyKarma).where(dailyKarma.user_id == str(message.user_id)))
    score, status = detect_toxicity(message.mssg)
    user_karma = result.scalars().first()
    modified = False

    if not user_karma:
        user_karma = dailyKarma(user_id=message.user_id)
        db.add(user_karma)
        modified = True

    if refresh_karma(user_karma):
        modified = True

    suggestion = None
    alternatives = None
    
    
    if status == 'toxic':
        user_karma.karma -= 1.0
        modified = True

        try:
            rephrased = rephrase_text(message.mssg)
            suggestion = rephrased[0] if len(rephrased) > 0 else None
            alternatives = rephrased[1:3] if len(rephrased) > 1 else []
        except Exception as e:
            print(f"Rephrasing failed: {e}")
            
    else:
        if user_karma.boost_count is None:
            user_karma.boost_count = 0
            modified = True
            
        if user_karma.boost_count < 6:
            user_karma.karma += 0.25
            user_karma.boost_count += 1
            print(user_karma.boost_count)
            modified = True
            
            

    if modified:
        await db.commit()

    return ModerationResponse(
        user_id=message.user_id,
        original=message.mssg,
        toxicity_score=score,
        status=status,
        karma=user_karma.karma,
        suggestion=suggestion,
        alternatives=alternatives
    )

    