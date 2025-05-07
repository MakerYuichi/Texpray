from models.reflection import reflectionResponse, pendingReflection
from sqlalchemy.ext.asyncio import AsyncSession
from models.karma import dailyKarma, refresh_karma
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime, timezone


async def handle_reflection_action(
    db: AsyncSession,
    reflection_id: UUID,
    user_id: str,
    action: str
):
    result = await db.execute(
        select(pendingReflection).where(pendingReflection.reflection_id == reflection_id, pendingReflection.user_id == user_id)
    )
    reflection = result.scalars().first()
    
    if not reflection:
        raise ValueError("Reflection Window not found")
    
    response = reflectionResponse(
        reflection_id=reflection_id,
        user_id=user_id,
        action=action,
        timestamp = datetime.now(timezone.utc)
    )
    
    karma_result = await db.execute(
        select(dailyKarma).where(dailyKarma.user_id == user_id)
    )
    user_karma = karma_result.scalars().first()
    
    if not user_karma:
        user_karma = dailyKarma(user_id=user_id, boost_count=0)
        db.add(user_karma)
        await db.commit()
    
    db.add(response)
    
    final_message = None
    karma_changed = False
    
    if action == "sends_suggestion" and reflection.suggestion:
        final_message = reflection.suggestion
        if user_karma.boost_count<6:
            user_karma.boost_count+=1
            user_karma.karma+=0.25
            karma_changed=True
        
    elif action == "sends_anyway":
        final_message = reflection.original_message
        user_karma.karma-=1
        karma_changed=True
        
        
    if karma_changed:
        await db.commit()
    
    return{
        "reflection_id": str(reflection_id),
        "action": action,
        "final_message": final_message,
        "updated_karma": user_karma.karma
    }

