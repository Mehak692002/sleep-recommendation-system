"""
auth.py — JWT authentication using PostgreSQL via SQLAlchemy
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
import re, secrets, uuid
from datetime import datetime, timedelta

from passlib.context import CryptContext
from jose import JWTError, jwt

from app.database import get_db
from app.models import User

router   = APIRouter()
security = HTTPBearer()

# ── Config ────────────────────────────────────────────────────────────────────
import os
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback-secret-change-me")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS   = 30

pwd_context     = CryptContext(schemes=["bcrypt"], deprecated="auto")
token_blacklist: set = set()   # In production: use Redis


# ── Token helpers ─────────────────────────────────────────────────────────────
def create_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + expires_delta
    to_encode["iat"] = datetime.utcnow()
    to_encode["jti"] = secrets.token_hex(16)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("jti") in token_blacklist:
            raise HTTPException(status_code=401, detail="Token has been revoked")
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    return verify_token(credentials.credentials)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing subject")
    return user_id


# ── Schemas ───────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email:    str
    password: str
    name:     str


class LoginRequest(BaseModel):
    email:    str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Routes ────────────────────────────────────────────────────────────────────
@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Validate email
    email = req.email.lower().strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Invalid email address")

    # Validate password strength
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    if not re.search(r"[A-Z]", req.password):
        raise HTTPException(status_code=422, detail="Password must contain at least one uppercase letter")
    if not re.search(r"[0-9]", req.password):
        raise HTTPException(status_code=422, detail="Password must contain at least one digit")

    # Check duplicate email
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create user
    user_id = str(uuid.uuid4())
    user = User(
        user_id         = user_id,
        email           = email,
        name            = req.name,
        password        = pwd_context.hash(req.password),
        is_active       = True,
        profile_created = False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue tokens
    access_token  = create_token(
        {"sub": user_id, "email": email, "name": req.name},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    return {
        "message":       "Account created successfully",
        "user_id":       user_id,
        "name":          req.name,
        "email":         email,
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "token_type":    "bearer",
        "profile_created": False,
    }


@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()

    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(req.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access_token  = create_token(
        {"sub": user.user_id, "email": user.email, "name": user.name},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_token(
        {"sub": user.user_id, "type": "refresh"},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )

    return {
        "access_token":    access_token,
        "refresh_token":   refresh_token,
        "token_type":      "bearer",
        "user_id":         user.user_id,
        "name":            user.name,
        "email":           user.email,
        "profile_created": user.profile_created,
    }


@router.post("/refresh")
async def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    payload = verify_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=400, detail="Not a refresh token")

    user_id = payload.get("sub")
    user    = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_access = create_token(
        {"sub": user_id, "email": user.email, "name": user.name},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    payload = verify_token(credentials.credentials)
    jti = payload.get("jti")
    if jti:
        token_blacklist.add(jti)
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.user_id == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "user_id":         user.user_id,
        "name":            user.name,
        "email":           user.email,
        "profile_created": user.profile_created,
        "created_at":      user.created_at,
    }


@router.put("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters")

    user = db.query(User).filter(User.user_id == current_user["sub"]).first()
    if not user or not pwd_context.verify(old_password, user.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    user.password = pwd_context.hash(new_password)
    db.commit()
    return {"message": "Password changed successfully"}