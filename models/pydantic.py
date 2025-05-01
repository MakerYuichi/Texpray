from pydantic import BaseModel
from typing import Optional, List


class Message(BaseModel):
    mssg : str

class ModerationResponse(BaseModel):
    original : str
    toxicity_score : float
    status : str
    suggestion: Optional[str] = None
    alternatives: Optional[List[str]] = None
    
'''    emoji_masked : str
    empathy_prompt : str
    karma_change : int
    reflection_stage : str
    
    '''