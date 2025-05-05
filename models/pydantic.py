from pydantic import BaseModel
from typing import Optional, List


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
    
'''    emoji_masked : str
    empathy_prompt : str
    
    reflection_stage : str
    
    '''