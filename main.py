from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.pydantic import Message, ModerationResponse, ReflectionDecision, UserCreate, UserLogin, PasswordReset, PasswordResetRequest, PasswordResetTokenData
from utils.moderation import moderate_text
from models.reflection import pendingReflection
from models.karma import dailyKarma, refresh_karma
from models.user import Users
from core.rephraser import rephrase_text
from models.reflection_window import handle_reflection_action
from utils.crypt import hashed_password, verify_password
from utils.token import create_access_token, verify_access_token, create_reset_token
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from utils.emails import send_reset_email
from fastapi.templating import Jinja2Templates
from uuid import UUID
from datetime import datetime, timezone, timedelta
import os


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://aggabpfpgjggoaeeimenoofbicdbboep", "https://texpray.onrender.com", "http://localhost:8000", "http://127.0.0.1:8000", "https://web.whatsapp.com"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


if not os.path.exists("static"):
    os.makedirs("static")
    
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


@app.get("/register", response_class=HTMLResponse)
async def get_register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})


@app.get("/login", response_class=HTMLResponse)
async def get_login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/forgot-password", response_class=HTMLResponse)
async def get_forgot_password(request: Request):
    return templates.TemplateResponse("forgot.html", {"request": request})

@app.get("/reset-password", response_class=HTMLResponse)
async def get_reset_password(request: Request, token: str):
    return templates.TemplateResponse("reset.html", {"request": request, "token": token})

    

@app.get("/")
def read_root():
    return {"message": "Server is running"}



@app.post("/register")
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Users).where(Users.email==user.email)
    )
    db_user = result.scalars().first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hashed_password(user.password)
    new_user = Users(email=user.email,
                     hashed_password= hashed,
                     first_name=user.first_name,
                     middle_name=user.middle_name,
                     last_name=user.last_name
                     )  
    db.add(new_user)  
    await db.commit()
    await db.refresh(new_user)
    
    new_karma = dailyKarma(user_id = new_user.user_id)
    db.add(new_karma)
    await db.commit()
    
    return {"message": "User registered successfully"}



@app.post("/login")
async def login(user: UserLogin, db: AsyncSession=Depends(get_db)):
    result = await db.execute(
        select(Users).where(Users.email==user.email)
    )
    db_user = result.scalars().first()
    
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_karma = await db.execute(select(dailyKarma).where(dailyKarma.user_id == db_user.user_id))
    user_karma = user_karma.scalars().first()
    
    if user_karma:
        if refresh_karma(user_karma):
            await db.commit()
    
    access_token = create_access_token(data={"sub": str(db_user.user_id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_name": db_user.first_name,
        "user_id": str(db_user.user_id)
}
        


@app.post("/forgot-password")
async def forgot_password(req: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select (Users).where(Users.email == req.email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail= "If an account with that email exists, a reset link has been sent")
    
    token = create_reset_token(req.email)
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)
    user.reset_token = token
    user.token_expiry = expiry.isoformat()
    await db.commit()

    reset_link = f"http://texpray.onrender.com/reset-password?token={token}"
    await send_reset_email(req.email, reset_link=reset_link)
    return {"message": "If an account with that email exists, a reset link has been sent"}



@app.post("/reset-password")
async def reset_password(payload: PasswordReset, db: AsyncSession= Depends(get_db)):
    try:
        token_data = PasswordResetTokenData(**verify_access_token(payload.token))
        result = await db.execute(select(Users).where(Users.email==token_data.sub))
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if (user.reset_token != payload.token or not user.token_expiry or datetime.fromisoformat(user.token_expiry) < datetime.now(timezone.utc)):
            raise HTTPException(status_code=400, detail="Invalid or expired token")
    
        user.hashed_password = hashed_password(payload.new_password)
        user.reset_token=None
        user.token_expiry=None
        await db.commit()
        return ({"message": "Password Reset Successful"})
    
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Invalid or expired token")



@app.post("/moderate", response_model=ModerationResponse)
async def moderate_message(message: Message, db: AsyncSession = Depends(get_db), user_id: str = Depends(verify_access_token)):
    return await moderate_text(user_id, message.mssg, db, is_override = message.is_override)



@app.get("/reflect/{reflection_id}/alternatives")
async def get_alternatives(reflection_id: UUID, db: AsyncSession=Depends(get_db), user_id: str = Depends(verify_access_token)):
    result = await db.execute(
        select(pendingReflection).where(pendingReflection.reflection_id == reflection_id).where(pendingReflection.user_id == user_id)
    ) 
    reflection = result.scalars().first()
    
    if not reflection:
        raise HTTPException(status_code=404, detail="Reflection not found")
    
    try:
        rephrased = rephrase_text(reflection.original_message)
        cleaned = [alt.strip('"') for alt in rephrased[1:3]]
        return {"alternatives": cleaned}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to Rephrase: {e}")
    


@app.post("/reflect/{reflection_id}")
async def process_reflection(reflection_id: UUID, decision: ReflectionDecision, db:AsyncSession=Depends(get_db), user_id: str = Depends(verify_access_token)):
    try:
        result = await handle_reflection_action(
            db=db,
            reflection_id = reflection_id,
            user_id=user_id,
            action=decision.action.value
        )
        return result
    
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server Error:  {str(e)}")
    
    
    
@app.get("/karma/{user_id}")
async def get_karma(user_id: str = Depends(verify_access_token), db: AsyncSession=Depends(get_db)):
    result = await db.execute(select(dailyKarma).where(dailyKarma.user_id==user_id))
    user_karma = result.scalars().first()
    
    if not user_karma:
        raise HTTPException(status_code=404, detail="No karma score")
    return {"user_id": user_id, "user_karma": user_karma.karma}
    
  
    