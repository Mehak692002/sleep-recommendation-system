"""
models.py — SQLAlchemy ORM models for all tables.
Place this at: backend/app/models.py
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    DateTime, Text, ForeignKey, ARRAY, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ── Users ─────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    user_id         = Column(String, primary_key=True, index=True)
    email           = Column(String, unique=True, nullable=False, index=True)
    name            = Column(String, nullable=False)
    password        = Column(String, nullable=False)          # bcrypt hash
    is_active       = Column(Boolean, default=True)
    profile_created = Column(Boolean, default=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    profile   = relationship("UserProfile", back_populates="user", uselist=False)
    sleep_logs = relationship("SleepLog",   back_populates="user")
    feedback  = relationship("Feedback",    back_populates="user")


# ── User Profiles ─────────────────────────────────────────────────────────────
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    user_id            = Column(String, ForeignKey("users.user_id"), unique=True, nullable=False)
    age                = Column(Integer)
    gender             = Column(String)
    weight             = Column(Float, nullable=True)
    height             = Column(Float, nullable=True)
    sleep_goal_hours   = Column(Float, default=8.0)
    target_wake_time   = Column(String, default="07:00")
    exercise_frequency = Column(String, default="")
    caffeine_intake    = Column(String, default="")
    stress_level       = Column(String, default="")
    health_conditions  = Column(JSON, default=list)     # stored as JSON array
    medications        = Column(Text, nullable=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")


# ── Sleep Logs ────────────────────────────────────────────────────────────────
class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id                     = Column(Integer, primary_key=True, autoincrement=True)
    user_id                = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    date                   = Column(String, nullable=False)   # YYYY-MM-DD
    bedtime                = Column(String)                   # HH:MM
    wake_time              = Column(String)                   # HH:MM
    sleep_duration_hours   = Column(Float)
    sleep_score            = Column(Float)
    quality_rating         = Column(Integer)
    stress_level           = Column(Integer)
    caffeine_cups          = Column(Integer, default=0)
    screen_time_before_bed = Column(Integer, default=0)
    exercise_today         = Column(Boolean, default=False)
    alcohol_consumed       = Column(Boolean, default=False)
    naps_taken             = Column(Integer, default=0)
    nap_duration_mins      = Column(Integer, nullable=True)
    dream_recall           = Column(Boolean, default=False)
    night_awakenings       = Column(Integer, default=0)
    morning_mood           = Column(String, nullable=True)
    notes                  = Column(Text, nullable=True)
    logged_at              = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sleep_logs")


# ── Feedback ──────────────────────────────────────────────────────────────────
class Feedback(Base):
    __tablename__ = "feedback"

    id               = Column(String, primary_key=True)       # UUID
    user_id          = Column(String, ForeignKey("users.user_id"), nullable=True)
    username         = Column(String, nullable=True)
    submitted_at     = Column(DateTime(timezone=True), server_default=func.now())

    # Star ratings
    overall_rating   = Column(Integer, default=0)
    accuracy_rating  = Column(Integer, default=0)
    usability_rating = Column(Integer, default=0)
    recommend_rating = Column(Integer, default=0)

    # Likert
    insight_useful   = Column(Integer, default=0)
    changed_behavior = Column(Integer, default=0)
    trusts_ai        = Column(Integer, default=0)
    easy_to_use      = Column(Integer, default=0)
    would_recommend  = Column(Integer, default=0)

    # Open-ended
    best_feature         = Column(Text, nullable=True)
    improvement_area     = Column(Text, nullable=True)
    sleep_impact         = Column(Text, nullable=True)
    additional_comments  = Column(Text, nullable=True)

    # Demographics
    occupation          = Column(String, nullable=True)
    sleep_issues_before = Column(String, nullable=True)
    usage_duration      = Column(String, nullable=True)
    heard_from          = Column(String, nullable=True)
    consent_research    = Column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="feedback")