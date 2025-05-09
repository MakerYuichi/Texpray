from uuid import UUID
from pydantic import BaseModel, EmailStr, field_validator, constr
from typing import Optional, List
import re
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
    
class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=8)       # type: ignore
    first_name: str
    middle_name: str | None = None
    last_name: str
    
    @field_validator('password')
    def validate_password_complexity(cls, v):
        errors = []
        if not re.search(r'[A-Z]', v):
            errors.append("at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("at least one digit")
        if not re.search(r'[@$!%*?&]', v):
            errors.append("at least one special character (@$!%*?&)")
        
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        return v
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
    class Config:
        orm_mode = True
        
class PasswordResetRequest(BaseModel):
    email: str
    
class PasswordResetTokenData(BaseModel):
    sub: str
    
class PasswordReset(BaseModel):
    token: str
    new_password: str 
    
    @field_validator('new_password')
    def validate_password_complexity(cls, v):
        errors = []
        if not re.search(r'[A-Z]', v):
            errors.append("at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            errors.append("at least one lowercase letter")
        if not re.search(r'\d', v):
            errors.append("at least one digit")
        if not re.search(r'[@$!%*?&]', v):
            errors.append("at least one special character (@$!%*?&)")
        
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        return v
    

    