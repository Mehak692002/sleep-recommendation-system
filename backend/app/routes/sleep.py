"""
sleep.py — Sleep logging endpoints using PostgreSQL
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.database import get_db
from app.models import SleepLog
from app.routes.auth import get_current_user_id

router = APIRouter()


class SleepLogSchema(BaseModel):
    date:                   str
    bedtime:                str
    wake_time:              str
    quality_rating:         int
    stress_level:           int
    caffeine_cups:          int           = 0
    screen_time_before_bed: int           = 0
    exercise_today:         bool          = False
    alcohol_consumed:       bool          = False
    naps_taken:             int           = 0
    nap_duration_mins:      Optional[int] = None
    dream_recall:           bool          = False
    night_awakenings:       int           = 0
    notes:                  Optional[str] = None
    morning_mood:           Optional[str] = None


def log_to_dict(log: SleepLog) -> dict:
    return {
        "id":                     log.id,
        "user_id":                log.user_id,
        "date":                   log.date,
        "bedtime":                log.bedtime,
        "wake_time":              log.wake_time,
        "sleep_duration_hours":   log.sleep_duration_hours,
        "sleep_score":            log.sleep_score,
        "quality_rating":         log.quality_rating,
        "stress_level":           log.stress_level,
        "caffeine_cups":          log.caffeine_cups,
        "screen_time_before_bed": log.screen_time_before_bed,
        "exercise_today":         log.exercise_today,
        "alcohol_consumed":       log.alcohol_consumed,
        "naps_taken":             log.naps_taken,
        "nap_duration_mins":      log.nap_duration_mins,
        "dream_recall":           log.dream_recall,
        "night_awakenings":       log.night_awakenings,
        "morning_mood":           log.morning_mood,
        "notes":                  log.notes,
        "logged_at":              log.logged_at.isoformat() if log.logged_at else None,
    }


def compute_sleep_duration(bedtime: str, wake_time: str) -> float:
    fmt  = "%H:%M"
    bed  = datetime.strptime(bedtime, fmt)
    wake = datetime.strptime(wake_time, fmt)
    if wake < bed:
        wake += timedelta(days=1)
    return round((wake - bed).seconds / 3600, 2)


def compute_sleep_score(log: SleepLogSchema, duration: float) -> float:
    score = 50.0
    if   7 <= duration <= 9:   score += 20
    elif 6 <= duration < 7:    score += 10
    elif 9 < duration <= 10:   score += 10
    else:                      score -= 10
    score += (log.quality_rating / 10) * 20
    score -= (log.stress_level   / 10) * 15
    score -= log.caffeine_cups * 3
    score -= min(log.screen_time_before_bed / 30, 5)
    if log.exercise_today:                                   score += 5
    if log.alcohol_consumed:                                 score -= 8
    if log.nap_duration_mins and log.nap_duration_mins > 30: score -= 5
    score -= log.night_awakenings * 3
    return round(max(0, min(100, score)), 2)


@router.post("/log")
async def log_sleep(
    data:    SleepLogSchema,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    duration    = compute_sleep_duration(data.bedtime, data.wake_time)
    sleep_score = compute_sleep_score(data, duration)

    log = SleepLog(
        user_id                = user_id,
        date                   = data.date,
        bedtime                = data.bedtime,
        wake_time              = data.wake_time,
        sleep_duration_hours   = duration,
        sleep_score            = sleep_score,
        quality_rating         = data.quality_rating,
        stress_level           = data.stress_level,
        caffeine_cups          = data.caffeine_cups,
        screen_time_before_bed = data.screen_time_before_bed,
        exercise_today         = data.exercise_today,
        alcohol_consumed       = data.alcohol_consumed,
        naps_taken             = data.naps_taken,
        nap_duration_mins      = data.nap_duration_mins,
        dream_recall           = data.dream_recall,
        night_awakenings       = data.night_awakenings,
        morning_mood           = data.morning_mood,
        notes                  = data.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "message":              "Sleep logged successfully",
        "sleep_duration_hours": duration,
        "sleep_score":          sleep_score,
        "entry":                log_to_dict(log),
    }


@router.get("/history")
async def get_history(
    limit:   int     = 30,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    logs = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == user_id)
        .order_by(SleepLog.date.asc())
        .limit(limit)
        .all()
    )
    return {"history": [log_to_dict(l) for l in logs]}


@router.get("/latest")
async def get_latest(
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    log = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == user_id)
        .order_by(SleepLog.logged_at.desc())
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="No sleep logs found")
    return log_to_dict(log)