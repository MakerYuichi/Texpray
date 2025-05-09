from sqlalchemy import String, Column, String
from sqlalchemy.ext.declarative import declarative_base
from models import Base
import secrets

class Users(Base):
    __tablename__ = "users"
    
    
    user_id = Column(String, primary_key=True, index=True, default=lambda: secrets.token_hex(8))
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    reset_token = Column(String, nullable=True)
    token_expiry = Column(String, nullable=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)  # optional
    last_name = Column(String, nullable=False)