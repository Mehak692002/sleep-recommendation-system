"""
profile.py — User profile routes using PostgreSQL
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserProfile
from app.routes.auth import get_current_user_id

router = APIRouter()


# ── Schema ────────────────────────────────────────────────────────────────────
class UserProfileSchema(BaseModel):
    age:                int
    gender:             str
    weight:             Optional[float] = None
    height:             Optional[float] = None
    sleep_goal_hours:   float           = 8.0
    target_wake_time:   str             = "07:00"
    exercise_frequency: str             = ""
    caffeine_intake:    str             = ""
    stress_level:       str             = ""
    health_conditions:  List[str]       = []
    medications:        Optional[str]   = None


def profile_to_dict(p: UserProfile) -> dict:
    return {
        "user_id":            p.user_id,
        "age":                p.age,
        "gender":             p.gender,
        "weight":             p.weight,
        "height":             p.height,
        "sleep_goal_hours":   p.sleep_goal_hours,
        "target_wake_time":   p.target_wake_time,
        "exercise_frequency": p.exercise_frequency,
        "caffeine_intake":    p.caffeine_intake,
        "stress_level":       p.stress_level,
        "health_conditions":  p.health_conditions or [],
        "medications":        p.medications,
    }


# ── GET /profile/ ─────────────────────────────────────────────────────────────
@router.get("/")
async def get_profile(
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile_to_dict(profile)


# ── POST /profile/ ────────────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def create_profile(
    data:    UserProfileSchema,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    # Upsert — create or replace
    existing = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if existing:
        for k, v in data.dict().items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        profile = existing
    else:
        profile = UserProfile(user_id=user_id, **data.dict())
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Mark profile_created on user
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        user.profile_created = True
        db.commit()

    return {"message": "Profile saved", **profile_to_dict(profile)}


# ── PUT /profile/ ─────────────────────────────────────────────────────────────
@router.put("/")
async def update_profile(
    data:    UserProfileSchema,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        # Auto-create if missing
        profile = UserProfile(user_id=user_id, **data.dict())
        db.add(profile)
    else:
        for k, v in data.dict().items():
            setattr(profile, k, v)

    db.commit()
    db.refresh(profile)

    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        user.profile_created = True
        db.commit()

    return {"message": "Profile updated", **profile_to_dict(profile)}


# ── Legacy aliases ────────────────────────────────────────────────────────────
@router.post("/create", status_code=201)
async def create_profile_legacy(
    data:    UserProfileSchema,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    return await create_profile(data, user_id, db)


@router.get("/me")
async def get_profile_me(
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    return await get_profile(user_id, db)


@router.put("/me")
async def update_profile_me(
    data:    UserProfileSchema,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    return await update_profile(data, user_id, db)