from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from models import Base

class pendingReflection(Base):
    __tablename__ = "pending_reflection"
    
    reflection_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("karma_score.user_id"), nullable=False)
    original_message = Column(Text, nullable=False)
    suggestion = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    
class reflectionResponse(Base):
    __tablename__ = "reflection_response"
    
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    reflection_id = Column(UUID(as_uuid=True), ForeignKey("pending_reflection.reflection_id"), nullable=False)
    user_id = Column(String, ForeignKey("karma_score.user_id"), nullable=False)
    action = Column(Text)
    timestamp = Column(DateTime(timezone=True), default=func.now())
    
    
    
    
    