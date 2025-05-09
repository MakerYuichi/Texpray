from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Float, DateTime, func, Integer, ForeignKey
from datetime import datetime, timezone, timedelta
from models import Base

class dailyKarma(Base):
    __tablename__ = "karma_score"
    
    user_id = Column(String, ForeignKey("users.user_id"), primary_key=True, index = True)
    karma = Column(Float, default=8.0)
    last_reset = Column(DateTime(timezone=True), default=func.now())
    previous_karma = Column(Float, default=8.0)
    boost_count = Column(Integer, default=0, nullable = False)
    
    def __repr__(self):
        return f"DailyKarma(user_id = {self.user_id}, karma = {self.karma}, last_reset = {self.last_reset})"
    

def refresh_karma(user_karma: dailyKarma):
    now = datetime.now(timezone.utc)

    if user_karma.last_reset is None or user_karma.last_reset.date() < now.date():
        current_karma = user_karma.karma if user_karma.karma is not None else 0.0

        if current_karma < 0:
            new_karma = max(0.0, 8.0 + current_karma)
        else:
            new_karma = 8.0

        user_karma.previous_karma = current_karma
        user_karma.karma = new_karma
        user_karma.last_reset = now
        user_karma.boost_count = 0
        return True

    return False


        

        
        
        

