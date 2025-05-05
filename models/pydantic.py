from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class Message(BaseModel):
    user_id: str
    mssg : str

class ModerationResponse(BaseModel):
    user_id : str
    original : str
    toxicity_score : float
    status : str
    karma: Optional[float] = None
    suggestion: Optional[str] = None
    alternatives: Optional[List[str]] = None
    reflection_id :Optional[UUID] = None
    
'''    emoji_masked : str
    empathy_prompt : str
    
    reflection_stage : str
    
    '''
    
class ReflectAction(str, Enum):
    sends_suggestion= "sends_suggestion"
    sends_anyway= "sends_anyway"
    discard= "discard" 
    
class ReflectionDecision(BaseModel):
    reflection_id: UUID
    user_id: str
    action: ReflectAction