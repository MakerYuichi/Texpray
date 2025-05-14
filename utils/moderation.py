from core.toxicity_detector import detect_toxicity
from core.rephraser import rephrase_text
from models.pydantic import ModerationResponse
from models.karma import dailyKarma, refresh_karma
from models.reflection import pendingReflection
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import uuid4


async def moderate_text(user_id: str, mssg: str, db: AsyncSession, is_override: bool = False) -> ModerationResponse:
    score, status = detect_toxicity(mssg)
    result = await db.execute(select(dailyKarma).where(dailyKarma.user_id == user_id))
    user_karma = result.scalars().first()
    modified = False

    if not user_karma:
        user_karma = dailyKarma(user_id=user_id)
        db.add(user_karma)
        modified = True

    if refresh_karma(user_karma):
        modified = True

    suggestion = None
    alternatives = None
    reflection_id = None

    if status == 'toxic':
        try:
            rephrased = rephrase_text(mssg)
            suggestion = rephrased[0] if rephrased else None
            alternatives = rephrased[1:3] if len(rephrased) > 1 else []
            
        except Exception as e:
            print(f"Rephrasing failed: {e}")
            
            
        if not is_override:
            reflection_id = uuid4()
            reflection = pendingReflection(
                reflection_id=reflection_id,
                user_id=user_id,
                original_message=mssg,
                suggestion=suggestion
                )
            db.add(reflection)
            modified=True
            
        if is_override:
            user_karma.karma -= 1.0
            modified = True

    else:
        if user_karma.boost_count is None:
            user_karma.boost_count = 0
            modified = True
        # You can re-enable this later when ready
        # if user_karma.boost_count < 6:
        #     user_karma.karma += 0.25
        #     user_karma.boost_count += 1
        #     modified = True

    if modified:
        await db.commit()

    return ModerationResponse(
        user_id=user_id,
        original=mssg,
        toxicity_score=score,
        status=status,
        karma=user_karma.karma,
        suggestion=suggestion,
        alternatives=alternatives,
        reflection_id=reflection_id
    )
