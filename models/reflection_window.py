from models.reflection import reflectionResponse, pendingReflection
from sqlalchemy.ext.asyncio import AsyncSession
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
    
    db.add(response)
    
    final_message = None
    if action == "send_suggestion" and reflection.suggestion:
        final_message = reflection.suggestion
        
    elif action == "send_anyway":
        final_message = reflection.original_message
        
    await db.commit()
    
    return{
        "reflection_id": str(reflection_id),
        "action": action,
        "final_message": final_message
    }

