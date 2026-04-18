"""
admin.py — Protected admin endpoints for viewing all user data.
Access requires ADMIN_SECRET_KEY header — never expose this to frontend.
All routes: /admin/...
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import os
from datetime import datetime, timedelta

from app.database import get_db
from app.models import User, UserProfile, SleepLog, Feedback

router = APIRouter()

ADMIN_KEY = os.environ.get("ADMIN_SECRET_KEY", "change-this-admin-key")


# ── Admin auth dependency ─────────────────────────────────────────────────────
def require_admin(x_admin_key: Optional[str] = Header(None)):
    if not x_admin_key or x_admin_key != ADMIN_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing admin key. Include X-Admin-Key header."
        )


# ── GET /admin/stats — overview dashboard ────────────────────────────────────
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _:  None    = Depends(require_admin),
):
    total_users    = db.query(func.count(User.user_id)).scalar()
    active_users   = db.query(func.count(User.user_id)).filter(User.is_active == True).scalar()
    with_profile   = db.query(func.count(User.user_id)).filter(User.profile_created == True).scalar()
    total_logs     = db.query(func.count(SleepLog.id)).scalar()
    total_feedback = db.query(func.count(Feedback.id)).scalar()

    avg_score = db.query(func.avg(SleepLog.sleep_score)).scalar()
    avg_dur   = db.query(func.avg(SleepLog.sleep_duration_hours)).scalar()

    # Registrations in last 7 days
    week_ago       = datetime.utcnow() - timedelta(days=7)
    new_this_week  = db.query(func.count(User.user_id)).filter(User.created_at >= week_ago).scalar()
    logs_this_week = db.query(func.count(SleepLog.id)).filter(SleepLog.logged_at >= week_ago).scalar()

    return {
        "users": {
            "total":         total_users,
            "active":        active_users,
            "with_profile":  with_profile,
            "new_this_week": new_this_week,
        },
        "sleep_logs": {
            "total":          total_logs,
            "this_week":      logs_this_week,
            "avg_score":      round(float(avg_score), 1) if avg_score else None,
            "avg_duration_h": round(float(avg_dur),   2) if avg_dur   else None,
        },
        "feedback": {
            "total": total_feedback,
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


# ── GET /admin/users — all users ──────────────────────────────────────────────
@router.get("/users")
def get_all_users(
    limit:  int     = 100,
    offset: int     = 0,
    db:     Session = Depends(get_db),
    _:      None    = Depends(require_admin),
):
    users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": db.query(func.count(User.user_id)).scalar(),
        "users": [
            {
                "user_id":         u.user_id,
                "name":            u.name,
                "email":           u.email,
                "is_active":       u.is_active,
                "profile_created": u.profile_created,
                "created_at":      u.created_at.isoformat() if u.created_at else None,
                "sleep_log_count": db.query(func.count(SleepLog.id))
                                     .filter(SleepLog.user_id == u.user_id).scalar(),
            }
            for u in users
        ],
    }


# ── GET /admin/users/{user_id} — single user detail ──────────────────────────
@router.get("/users/{user_id}")
def get_user_detail(
    user_id: str,
    db:      Session = Depends(get_db),
    _:       None    = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    logs    = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == user_id)
        .order_by(SleepLog.date.desc())
        .all()
    )

    avg_score = sum(l.sleep_score or 0 for l in logs) / len(logs) if logs else None
    avg_dur   = sum(l.sleep_duration_hours or 0 for l in logs) / len(logs) if logs else None

    return {
        "user": {
            "user_id":         user.user_id,
            "name":            user.name,
            "email":           user.email,
            "is_active":       user.is_active,
            "profile_created": user.profile_created,
            "created_at":      user.created_at.isoformat() if user.created_at else None,
        },
        "profile": {
            "age":               profile.age        if profile else None,
            "gender":            profile.gender     if profile else None,
            "sleep_goal_hours":  profile.sleep_goal_hours if profile else None,
            "stress_level":      profile.stress_level     if profile else None,
            "health_conditions": profile.health_conditions if profile else [],
            "exercise_frequency":profile.exercise_frequency if profile else None,
        } if profile else None,
        "sleep_summary": {
            "total_nights":   len(logs),
            "avg_score":      round(avg_score, 1) if avg_score else None,
            "avg_duration_h": round(avg_dur,   2) if avg_dur   else None,
            "latest_date":    logs[0].date if logs else None,
        },
        "recent_logs": [
            {
                "date":                   l.date,
                "sleep_score":            l.sleep_score,
                "sleep_duration_hours":   l.sleep_duration_hours,
                "quality_rating":         l.quality_rating,
                "stress_level":           l.stress_level,
                "caffeine_cups":          l.caffeine_cups,
                "screen_time_before_bed": l.screen_time_before_bed,
                "exercise_today":         l.exercise_today,
                "alcohol_consumed":       l.alcohol_consumed,
                "night_awakenings":       l.night_awakenings,
                "morning_mood":           l.morning_mood,
                "notes":                  l.notes,
            }
            for l in logs[:30]
        ],
    }


# ── GET /admin/sleep-logs — all sleep logs ────────────────────────────────────
@router.get("/sleep-logs")
def get_all_sleep_logs(
    limit:  int     = 100,
    offset: int     = 0,
    db:     Session = Depends(get_db),
    _:      None    = Depends(require_admin),
):
    logs = (
        db.query(SleepLog)
        .order_by(SleepLog.logged_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": db.query(func.count(SleepLog.id)).scalar(),
        "logs": [
            {
                "id":                     l.id,
                "user_id":                l.user_id,
                "date":                   l.date,
                "sleep_score":            l.sleep_score,
                "sleep_duration_hours":   l.sleep_duration_hours,
                "quality_rating":         l.quality_rating,
                "stress_level":           l.stress_level,
                "caffeine_cups":          l.caffeine_cups,
                "screen_time_before_bed": l.screen_time_before_bed,
                "exercise_today":         l.exercise_today,
                "alcohol_consumed":       l.alcohol_consumed,
                "night_awakenings":       l.night_awakenings,
                "morning_mood":           l.morning_mood,
                "logged_at":              l.logged_at.isoformat() if l.logged_at else None,
            }
            for l in logs
        ],
    }


# ── GET /admin/feedback — all feedback ───────────────────────────────────────
@router.get("/feedback")
def get_all_feedback(
    db: Session = Depends(get_db),
    _:  None    = Depends(require_admin),
):
    records = db.query(Feedback).order_by(Feedback.submitted_at.desc()).all()

    def avg(field):
        vals = [getattr(r, field) for r in records if getattr(r, field, 0) > 0]
        return round(sum(vals) / len(vals), 2) if vals else None

    return {
        "total": len(records),
        "summary": {
            "avg_overall_rating":   avg("overall_rating"),
            "avg_accuracy_rating":  avg("accuracy_rating"),
            "avg_usability_rating": avg("usability_rating"),
            "consented_count":      sum(1 for r in records if r.consent_research),
        },
        "records": [
            {
                "id":               r.id,
                "username":         r.username,
                "submitted_at":     r.submitted_at.isoformat() if r.submitted_at else None,
                "overall_rating":   r.overall_rating,
                "accuracy_rating":  r.accuracy_rating,
                "usability_rating": r.usability_rating,
                "best_feature":     r.best_feature,
                "improvement_area": r.improvement_area,
                "sleep_impact":     r.sleep_impact,
                "occupation":       r.occupation,
                "usage_duration":   r.usage_duration,
                "consent_research": r.consent_research,
            }
            for r in records
        ],
    }


# ── DELETE /admin/users/{user_id} — deactivate user ──────────────────────────
@router.delete("/users/{user_id}")
def deactivate_user(
    user_id: str,
    db:      Session = Depends(get_db),
    _:       None    = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    db.commit()
    return {"message": f"User {user.email} deactivated successfully"}


# ── GET /admin/export/csv — export all sleep data as CSV text ─────────────────
@router.get("/export/csv")
def export_sleep_csv(
    db: Session = Depends(get_db),
    _:  None    = Depends(require_admin),
):
    logs = db.query(SleepLog).order_by(SleepLog.date.asc()).all()

    rows = ["user_id,date,sleep_score,sleep_duration_hours,quality_rating,stress_level,"
            "caffeine_cups,screen_time_before_bed,exercise_today,alcohol_consumed,"
            "night_awakenings,morning_mood"]

    for l in logs:
        rows.append(
            f"{l.user_id},{l.date},{l.sleep_score},{l.sleep_duration_hours},"
            f"{l.quality_rating},{l.stress_level},{l.caffeine_cups},"
            f"{l.screen_time_before_bed},{l.exercise_today},{l.alcohol_consumed},"
            f"{l.night_awakenings},{l.morning_mood or ''}"
        )

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("\n".join(rows), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sleep_data.csv"})