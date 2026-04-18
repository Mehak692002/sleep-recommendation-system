"""
ai_recommendations.py — Auth-protected AI recommendation routes
Uses PostgreSQL for data + full sleep history for trend-based recommendations.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os, pickle
import numpy as np

try:
    from tensorflow.keras.models import load_model
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False

from app.database import get_db
from app.models import SleepLog, UserProfile
from app.routes.auth import get_current_user_id

router = APIRouter()

# ── Model paths ───────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH  = os.path.join(BASE_DIR, "models", "sleep_model.h5")
SCALER_PATH = os.path.join(BASE_DIR, "models", "scaler.pkl")

_model = _scaler = None

def get_model():
    global _model
    if _model is None and TF_AVAILABLE and os.path.exists(MODEL_PATH):
        _model = load_model(MODEL_PATH)
    return _model

def get_scaler():
    global _scaler
    if _scaler is None and os.path.exists(SCALER_PATH):
        with open(SCALER_PATH, "rb") as f:
            _scaler = pickle.load(f)
    return _scaler


# ── ORM → dict helper ─────────────────────────────────────────────────────────
def log_to_dict(log: SleepLog) -> dict:
    return {
        "sleep_duration_hours":   log.sleep_duration_hours or 0,
        "quality_rating":         log.quality_rating or 5,
        "stress_level":           log.stress_level or 5,
        "caffeine_cups":          log.caffeine_cups or 0,
        "screen_time_before_bed": log.screen_time_before_bed or 0,
        "exercise_today":         log.exercise_today or False,
        "alcohol_consumed":       log.alcohol_consumed or False,
        "nap_duration_mins":      log.nap_duration_mins or 0,
        "night_awakenings":       log.night_awakenings or 0,
        "date":                   log.date,
        "bedtime":                log.bedtime,
        "wake_time":              log.wake_time,
        "sleep_score":            log.sleep_score or 0,
        "morning_mood":           log.morning_mood,
        "notes":                  log.notes,
    }

def profile_to_dict(p: UserProfile) -> dict:
    return {
        "age":                p.age or 25,
        "weight_kg":          p.weight or 65,
        "height_cm":          p.height or 165,
        "sleep_goal_hours":   p.sleep_goal_hours or 7.5,
        "activity_level":     p.exercise_frequency or "moderate",
        "dietary_preference": "",
        "occupation":         "",
        "stress_level":       p.stress_level or "Medium (4-6)",
        "health_conditions":  p.health_conditions or [],
        "caffeine_intake":    p.caffeine_intake or "",
    }


# ── ML prediction ─────────────────────────────────────────────────────────────
def build_features(log: dict, profile: dict) -> np.ndarray:
    return np.array([[
        float(log.get("sleep_duration_hours", 7.0)),
        float(log.get("quality_rating", 5)),
        float(log.get("stress_level", 5)),
        float(log.get("caffeine_cups", 0)),
        float(log.get("screen_time_before_bed", 30)),
        float(1 if log.get("exercise_today") else 0),
        float(1 if log.get("alcohol_consumed") else 0),
        float(log.get("nap_duration_mins") or 0),
        float(log.get("night_awakenings", 0)),
        float(profile.get("age", 25)),
        float(profile.get("weight_kg", 65)),
        float(profile.get("height_cm", 165)),
        float(profile.get("sleep_goal_hours", 7.5)),
    ]], dtype=np.float32)

def predict_score(log: dict, profile: dict) -> float:
    model = get_model()
    scaler = get_scaler()
    if model and scaler:
        X = scaler.transform(build_features(log, profile)).reshape((1, 1, 13))
        return round(float(np.clip(np.squeeze(model.predict(X, verbose=0)), 0, 100)), 2)
    return rule_based_score(log, profile)

def rule_based_score(log: dict, profile: dict) -> float:
    score = 50.0
    diff  = log.get("sleep_duration_hours", 0) - float(profile.get("sleep_goal_hours", 7.5))
    if   -0.5 <= diff <= 1.0:  score += 20
    elif -1.0 <= diff < -0.5:  score += 10
    elif diff < -1.0:          score -= 15
    score += (log.get("quality_rating", 5) / 10) * 20
    score -= (log.get("stress_level", 5)   / 10) * 15
    score -= log.get("caffeine_cups", 0) * 3
    score -= min(log.get("screen_time_before_bed", 0) / 30, 5)
    if log.get("exercise_today"):                            score += 5
    if log.get("alcohol_consumed"):                          score -= 8
    if (log.get("nap_duration_mins") or 0) > 30:             score -= 5
    score -= log.get("night_awakenings", 0) * 3
    return round(max(0.0, min(100.0, score)), 2)

def score_to_grade(s: float) -> str:
    if s >= 85: return "A"
    if s >= 70: return "B"
    if s >= 55: return "C"
    if s >= 40: return "D"
    return "F"


# ── Trend analysis using full history ─────────────────────────────────────────
def analyze_trend(all_logs: list, profile: dict) -> dict:
    """
    Compares recent 7 days vs previous 7 days to detect trends.
    Returns trend direction, delta, and specific worsening metrics.
    """
    if len(all_logs) < 2:
        return {"direction": "insufficient_data", "delta": 0, "worsening": [], "improving": []}

    scores = [predict_score(l, profile) for l in all_logs]

    # Split into recent half vs older half
    mid     = len(scores) // 2
    older   = scores[:mid]
    recent  = scores[mid:]

    older_avg  = sum(older)  / len(older)
    recent_avg = sum(recent) / len(recent)
    delta      = recent_avg - older_avg

    # Detect which specific metrics are worsening
    worsening  = []
    improving  = []

    if len(all_logs) >= 4:
        older_logs  = all_logs[:len(all_logs)//2]
        recent_logs = all_logs[len(all_logs)//2:]

        def avg_field(logs, field):
            vals = [float(l.get(field, 0) or 0) for l in logs]
            return sum(vals) / len(vals) if vals else 0

        metrics = [
            ("stress_level",           "Stress",          True),   # True = higher is worse
            ("caffeine_cups",          "Caffeine",         True),
            ("screen_time_before_bed", "Screen time",      True),
            ("night_awakenings",       "Night awakenings", True),
            ("sleep_duration_hours",   "Sleep duration",   False),  # False = lower is worse
            ("quality_rating",         "Sleep quality",    False),
        ]

        for field, label, higher_is_worse in metrics:
            old_avg = avg_field(older_logs,  field)
            new_avg = avg_field(recent_logs, field)
            diff    = new_avg - old_avg

            if higher_is_worse:
                if diff > 0.5:   worsening.append(f"{label} increased by {diff:.1f}")
                elif diff < -0.5: improving.append(f"{label} decreased by {abs(diff):.1f}")
            else:
                if diff < -0.3:   worsening.append(f"{label} dropped by {abs(diff):.1f}")
                elif diff > 0.3:  improving.append(f"{label} improved by {diff:.1f}")

    direction = "improving" if delta > 3 else "declining" if delta < -3 else "stable"
    return {
        "direction":   direction,
        "delta":       round(delta, 1),
        "older_avg":   round(older_avg, 1),
        "recent_avg":  round(recent_avg, 1),
        "worsening":   worsening[:3],
        "improving":   improving[:3],
    }


# ── Main recommendation engine ────────────────────────────────────────────────
def generate_recommendations(recent_logs: list, all_logs: list, profile: dict) -> dict:
    n              = len(recent_logs)
    avg_score      = sum(predict_score(l, profile) for l in recent_logs) / n
    avg_stress     = sum(l["stress_level"]           for l in recent_logs) / n
    avg_caffeine   = sum(l["caffeine_cups"]           for l in recent_logs) / n
    avg_screen     = sum(l["screen_time_before_bed"] for l in recent_logs) / n
    avg_duration   = sum(l["sleep_duration_hours"]   for l in recent_logs) / n
    avg_awakenings = sum(l["night_awakenings"]        for l in recent_logs) / n
    exercise_days  = sum(1 for l in recent_logs if l["exercise_today"])
    alcohol_days   = sum(1 for l in recent_logs if l["alcohol_consumed"])

    goal     = float(profile.get("sleep_goal_hours", 7.5))
    activity = profile.get("activity_level", "moderate").lower()
    grade    = score_to_grade(avg_score)

    # ── Trend analysis (uses ALL history, not just recent) ────────────────────
    trend = analyze_trend(all_logs, profile)

    # ── Summary with trend context ────────────────────────────────────────────
    trend_str = {
        "improving":         f" Your score has improved by {trend['delta']} points recently — great momentum!",
        "declining":         f" Warning: your score has dropped {abs(trend['delta'])} points recently.",
        "stable":            " Your score has been consistent.",
        "insufficient_data": "",
    }[trend["direction"]]

    if avg_score >= 85:
        summary = f"Excellent sleep health! Averaging {avg_duration:.1f}h with a score of {avg_score:.1f}/100.{trend_str}"
    elif avg_score >= 70:
        summary = f"Good sleep at {avg_score:.1f}/100. Minor tweaks will push you to excellent.{trend_str}"
    elif avg_score >= 55:
        summary = f"Moderate sleep quality at {avg_score:.1f}/100. Your {avg_duration:.1f}h average needs attention.{trend_str}"
    else:
        summary = f"Sleep score of {avg_score:.1f}/100 needs attention. Duration, stress, and habits are compounding negatively.{trend_str}"

    # ── Issues — prioritised by trend data ────────────────────────────────────
    issues = []

    # Trend-detected worsening metrics go first
    for w in trend["worsening"]:
        issues.append({
            "issue":       f"📉 Worsening Trend: {w}",
            "explanation": f"Compared to your historical average, {w.lower()} over the past week. Address this before it compounds."
        })

    if avg_duration < goal - 0.5:
        issues.append({"issue": "Insufficient Sleep Duration",
            "explanation": f"Averaging {avg_duration:.1f}h vs your {goal}h goal — a {goal - avg_duration:.1f}h nightly deficit."})
    if avg_stress >= 6:
        issues.append({"issue": "High Stress Levels",
            "explanation": f"Average stress {avg_stress:.1f}/10. Delays sleep onset by 20-30 min and suppresses deep slow-wave sleep."})
    if avg_caffeine >= 1:
        issues.append({"issue": "Late Caffeine Consumption",
            "explanation": f"Averaging {avg_caffeine:.1f} cups. With a 5-6h half-life, caffeine is still 25% active at midnight."})
    if avg_screen >= 45:
        issues.append({"issue": "High Screen Exposure",
            "explanation": f"{avg_screen:.0f} min of screen time. Blue light suppresses melatonin by up to 50%."})
    if exercise_days < n * 0.4:
        issues.append({"issue": "Low Physical Activity",
            "explanation": f"Only {exercise_days}/{n} days with exercise. Regular aerobic activity increases deep sleep by 15-20%."})
    if avg_awakenings >= 2:
        issues.append({"issue": "Frequent Night Awakenings",
            "explanation": f"Waking {avg_awakenings:.1f}x/night fragments sleep architecture and cuts REM cycles short."})
    if alcohol_days >= 2:
        issues.append({"issue": "Alcohol Disrupting Architecture",
            "explanation": f"Alcohol {alcohol_days}/{n} nights suppresses REM sleep in the second half of the night."})
    if not issues:
        issues.append({"issue": "Maintain Consistency",
            "explanation": "Strict timing consistency — same bedtime/wake time 7 days a week — is your biggest remaining lever."})

    # ── Schedule ──────────────────────────────────────────────────────────────
    wake_hour = 6
    bed_hour  = (wake_hour - int(goal) + 24) % 24
    bedtime   = f"{bed_hour:02d}:00"
    wake_time = f"{wake_hour:02d}:00"

    wind_down = [
        "8:30 PM — Dim all lights to start melatonin rise.",
        "9:00 PM — All screens off. Switch to a physical book." if avg_screen >= 30 else "9:00 PM — Reduce screen brightness to minimum.",
        "9:15 PM — 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s (4 cycles)." if avg_stress >= 5 else "9:15 PM — Light stretching: child's pose, spinal twist.",
        "9:30 PM — Journal tomorrow's to-do list to offload mental load.",
        f"{bedtime} — Lights out. Room at 18-20°C, fully dark.",
    ]

    # ── Diet ──────────────────────────────────────────────────────────────────
    breakfast     = {"meal": "Protein & tryptophan breakfast",     "items": ["2 scrambled eggs on whole-grain toast", "Warm milk", "Handful of almonds"],          "sleep_benefit": "Eggs provide tryptophan and B vitamins for serotonin synthesis."}
    lunch         = {"meal": "Lean protein power lunch",           "items": ["Grilled chicken with brown rice", "Mixed salad", "1 banana"],                         "sleep_benefit": "Lean protein + banana B6 supports melatonin."}
    dinner        = {"meal": "Light omega-3 dinner",               "items": ["Grilled salmon with steamed broccoli", "Small bowl of curd"],                         "sleep_benefit": "Omega-3s support serotonin receptors. Curd provides tryptophan."}
    evening_snack = {"meal": "Calming snack (9 PM)",               "items": ["Warm milk with honey", "4 walnuts"],                                                  "sleep_benefit": "Walnuts contain actual melatonin. Milk tryptophan aids sleep onset."}

    # ── Exercise ──────────────────────────────────────────────────────────────
    schedules = {
        "sedentary": [{"day":"Mon","activity":"20-min brisk walk","duration":"20 min","timing":"morning","sleep_benefit":"Builds adenosine (sleep pressure)"},{"day":"Wed","activity":"Gentle yoga","duration":"25 min","timing":"evening","sleep_benefit":"Lowers cortisol"},{"day":"Fri","activity":"20-min brisk walk","duration":"20 min","timing":"morning","sleep_benefit":"Increases deep sleep"},{"day":"Sun","activity":"Light stretching","duration":"15 min","timing":"evening","sleep_benefit":"Reduces night awakenings"}],
        "light":     [{"day":"Mon","activity":"30-min walk/jog","duration":"30 min","timing":"morning","sleep_benefit":"Raises daytime alertness"},{"day":"Wed","activity":"Yoga","duration":"30 min","timing":"evening","sleep_benefit":"Activates GABA"},{"day":"Fri","activity":"Cycling or swimming","duration":"30 min","timing":"afternoon","sleep_benefit":"Increases deep sleep by 15%"},{"day":"Sun","activity":"Nature walk","duration":"45 min","timing":"morning","sleep_benefit":"Resets circadian rhythm"}],
        "moderate":  [{"day":"Mon","activity":"45-min run or cycle","duration":"45 min","timing":"morning","sleep_benefit":"Maximizes slow-wave deep sleep"},{"day":"Wed","activity":"Strength training","duration":"40 min","timing":"afternoon","sleep_benefit":"Growth hormone repairs muscles during sleep"},{"day":"Fri","activity":"HIIT (moderate)","duration":"30 min","timing":"morning","sleep_benefit":"Raises alertness without raising nighttime cortisol"},{"day":"Sun","activity":"Yoga or long walk","duration":"45 min","timing":"morning","sleep_benefit":"Active recovery maintains deep sleep quality"}],
        "active":    [{"day":"Mon","activity":"6-8km run","duration":"50 min","timing":"morning","sleep_benefit":"High adenosine ensures fast sleep onset"},{"day":"Tue","activity":"Strength + mobility","duration":"60 min","timing":"afternoon","sleep_benefit":"Muscle synthesis peaks during SWS"},{"day":"Thu","activity":"Interval training","duration":"45 min","timing":"morning","sleep_benefit":"AM intervals don't raise core temp at bedtime"},{"day":"Sat","activity":"Sport / swim / cycle","duration":"60 min","timing":"morning","sleep_benefit":"Maintains weekday sleep rhythm"}],
    }

    # ── Quick wins — personalised using trend data ────────────────────────────
    quick_wins = []
    if trend["worsening"]:
        quick_wins.append(f"Priority fix: {trend['worsening'][0].lower()} — address this first as it's actively worsening.")
    if avg_screen >= 30:
        quick_wins.append("Tonight: phone in another room at 9 PM — 30 fewer screen minutes raises melatonin by ~30%.")
    if avg_caffeine >= 1:
        quick_wins.append("Tomorrow: switch afternoon tea to chamomile — apigenin binds GABA receptors within 30 min.")
    if avg_stress >= 6:
        quick_wins.append("Before bed: write 3 things you're grateful for — activates prefrontal cortex, reduces amygdala arousal.")
    quick_wins.append(f"Set a consistent wake alarm for {wake_time} every day including weekends — improves scores by 10-15 points in 7 days.")
    if avg_awakenings >= 2:
        quick_wins.append("Keep room at 18°C tonight — temperature is the #1 environmental fix for night awakenings.")

    return {
        "sleep_score_analysis": {
            "score":   round(avg_score, 1),
            "grade":   grade,
            "summary": summary,
        },
        "trend": {
            "direction":  trend["direction"],
            "delta":      trend["delta"],
            "older_avg":  trend["older_avg"],
            "recent_avg": trend["recent_avg"],
            "worsening":  trend["worsening"],
            "improving":  trend["improving"],
            "total_nights_tracked": len(all_logs),
        },
        "top_issues": issues[:4],
        "sleep_schedule": {
            "recommended_bedtime":  bedtime,
            "recommended_wake_time": wake_time,
            "wind_down_routine":    wind_down,
            "explanation": f"Based on your {goal}h sleep goal, {bedtime} → {wake_time} aligns with your circadian window.",
        },
        "diet_plan": {
            "breakfast":     breakfast,
            "lunch":         lunch,
            "dinner":        dinner,
            "evening_snack": evening_snack,
            "foods_to_avoid": [
                "Coffee/tea after 2 PM — blocks adenosine for 5-6 hours",
                "Heavy meals within 3h of bedtime — raises core temperature",
                "Refined sugar after 7 PM — triggers 2-3 AM blood sugar crashes",
            ] + (["Alcohol — suppresses REM in the second half of the night"] if alcohol_days > 0 else []),
            "hydration_tip": "Drink 2.5-3L water during the day but stop 90 min before bed. Warm chamomile tea at 9 PM is ideal.",
        },
        "lifestyle_recommendations": [
            {"category": "Morning Light",       "action": "10 min direct sunlight within 30 min of waking",                    "timing": f"Within 30 min of {wake_time}", "why": "Anchors your circadian clock, making you naturally sleepy 14-16h later."},
            {"category": "Bedroom Environment", "action": "18-20°C, blackout curtains, no LED standby lights",                  "timing": "Every night",                  "why": "Core body temperature must drop 1-2°C to initiate sleep."},
            {"category": "Consistent Schedule", "action": f"Hard bedtime at {bedtime} and wake at {wake_time} — 7 days/week",   "timing": "Daily",                        "why": "Even 1 late night shifts your rhythm by 1-3 days."},
        ] + ([{"category": "Stress Offloading", "action": "Write tomorrow's to-do list at 8 PM", "timing": "8:00 PM daily", "why": "Externalizing tasks quiets the prefrontal cortex."}] if avg_stress >= 5 else []),
        "exercise_plan": {
            "weekly_schedule": schedules.get(activity, schedules["moderate"]),
            "avoid": "Never do intense exercise within 3h of bedtime — raises core temperature and cortisol, delaying sleep by 30-60 min.",
        },
        "quick_wins": quick_wins[:4],
    }


# ── API endpoints ─────────────────────────────────────────────────────────────
class RecommendationRequest(BaseModel):
    days_to_analyze: int = 7


@router.post("/recommendations")
async def get_ai_recommendations(
    req:     RecommendationRequest,
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    # Fetch profile from DB
    profile_orm = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile_orm:
        raise HTTPException(status_code=404, detail="User profile not found. Please create a profile first.")
    profile = profile_to_dict(profile_orm)

    # Fetch ALL logs for trend analysis
    all_logs_orm = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == user_id)
        .order_by(SleepLog.date.asc())
        .all()
    )
    all_logs = [log_to_dict(l) for l in all_logs_orm]

    if not all_logs:
        raise HTTPException(status_code=404, detail="No sleep logs found. Please log at least one night of sleep.")

    # Recent N logs for recommendations
    recent_logs = all_logs[-req.days_to_analyze:]

    try:
        recs = generate_recommendations(recent_logs, all_logs, profile)
        return {"user_id": user_id, "recommendations": recs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {str(e)}")


@router.get("/quick-tip")
async def get_quick_tip(
    user_id: str     = Depends(get_current_user_id),
    db:      Session = Depends(get_db),
):
    profile_orm = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    profile     = profile_to_dict(profile_orm) if profile_orm else {}

    latest_log = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == user_id)
        .order_by(SleepLog.logged_at.desc())
        .first()
    )

    if not latest_log:
        return {"tip": "Start by logging your sleep tonight to get personalized tips!"}

    latest = log_to_dict(latest_log)
    score  = predict_score(latest, profile)

    # Trend context for tip
    all_logs_orm = (
        db.query(SleepLog)
        .filter(SleepLog.user_id == user_id)
        .order_by(SleepLog.date.asc())
        .all()
    )
    all_logs = [log_to_dict(l) for l in all_logs_orm]
    trend    = analyze_trend(all_logs, profile)

    if trend["direction"] == "declining" and abs(trend["delta"]) > 5:
        tip = f"Your sleep score has dropped {abs(trend['delta'])} points this week. Focus on: {trend['worsening'][0].lower() if trend['worsening'] else 'consistency'}."
    elif latest.get("stress_level", 0) >= 7:
        tip = "Your stress is high tonight. Try 4-7-8 breathing (inhale 4s, hold 7s, exhale 8s) for 4 cycles."
    elif latest.get("caffeine_cups", 0) >= 2:
        tip = f"You had {latest['caffeine_cups']} cups after 2 PM. Drink 500ml water and avoid screens."
    elif latest.get("screen_time_before_bed", 0) >= 60:
        tip = "60+ min of screen time detected. Put your phone in another room right now."
    elif latest.get("night_awakenings", 0) >= 3:
        tip = "Frequent awakenings suggest your room may be too warm. Drop to 18-20°C tonight."
    elif trend["direction"] == "improving":
        tip = f"Your sleep is improving! Score up {trend['delta']} points this week. Keep your bedtime consistent."
    elif score >= 75:
        tip = f"Great sleep last night (score: {score:.0f}/100)! Keep your bedtime within 15 min consistently."
    else:
        tip = f"Sleep score was {score:.0f}/100. Tonight: lights off and screens away 45 min before your usual bedtime."

    return {
        "tip":   tip,
        "score": score,
        "trend": trend["direction"],
    }