"""
feedback.py — Feedback endpoint using PostgreSQL
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app.models import Feedback
from app.routes.auth import get_current_user_id

router = APIRouter(tags=["feedback"])


class FeedbackPayload(BaseModel):
    username:        Optional[str] = None
    submittedAt:     Optional[str] = None
    overallRating:   int = 0
    accuracyRating:  int = 0
    usabilityRating: int = 0
    recommendRating: int = 0
    insightUseful:   int = 0
    changedBehavior: int = 0
    trustsAI:        int = 0
    easyToUse:       int = 0
    wouldRecommend:  int = 0
    bestFeature:        Optional[str] = ""
    improvementArea:    Optional[str] = ""
    sleepImpact:        Optional[str] = ""
    additionalComments: Optional[str] = ""
    occupation:        Optional[str] = ""
    sleepIssuesBefore: Optional[str] = ""
    usageDuration:     Optional[str] = ""
    heardFrom:         Optional[str] = ""
    consentResearch:   bool = False


def feedback_to_dict(f: Feedback) -> dict:
    return {
        "id":                  f.id,
        "username":            f.username,
        "submitted_at":        f.submitted_at.isoformat() if f.submitted_at else None,
        "overallRating":       f.overall_rating,
        "accuracyRating":      f.accuracy_rating,
        "usabilityRating":     f.usability_rating,
        "recommendRating":     f.recommend_rating,
        "insightUseful":       f.insight_useful,
        "changedBehavior":     f.changed_behavior,
        "trustsAI":            f.trusts_ai,
        "easyToUse":           f.easy_to_use,
        "wouldRecommend":      f.would_recommend,
        "bestFeature":         f.best_feature,
        "improvementArea":     f.improvement_area,
        "sleepImpact":         f.sleep_impact,
        "additionalComments":  f.additional_comments,
        "occupation":          f.occupation,
        "sleepIssuesBefore":   f.sleep_issues_before,
        "usageDuration":       f.usage_duration,
        "heardFrom":           f.heard_from,
        "consentResearch":     f.consent_research,
    }


@router.post("/")
async def submit_feedback(
    payload: FeedbackPayload,
    db:      Session = Depends(get_db),
):
    if payload.overallRating < 1 or payload.overallRating > 5:
        raise HTTPException(status_code=422, detail="overallRating must be between 1 and 5")

    feedback = Feedback(
        id                  = str(uuid.uuid4()),
        username            = "anonymous" if not payload.consentResearch else payload.username,
        overall_rating      = payload.overallRating,
        accuracy_rating     = payload.accuracyRating,
        usability_rating    = payload.usabilityRating,
        recommend_rating    = payload.recommendRating,
        insight_useful      = payload.insightUseful,
        changed_behavior    = payload.changedBehavior,
        trusts_ai           = payload.trustsAI,
        easy_to_use         = payload.easyToUse,
        would_recommend     = payload.wouldRecommend,
        best_feature        = payload.bestFeature,
        improvement_area    = payload.improvementArea,
        sleep_impact        = payload.sleepImpact,
        additional_comments = payload.additionalComments,
        occupation          = payload.occupation,
        sleep_issues_before = payload.sleepIssuesBefore,
        usage_duration      = payload.usageDuration,
        heard_from          = payload.heardFrom,
        consent_research    = payload.consentResearch,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return {"status": "ok", "id": feedback.id}


@router.get("/")
async def get_all_feedback(db: Session = Depends(get_db)):
    records = db.query(Feedback).order_by(Feedback.submitted_at.desc()).all()
    return [feedback_to_dict(f) for f in records]


@router.get("/summary")
async def get_feedback_summary(db: Session = Depends(get_db)):
    records = db.query(Feedback).all()
    if not records:
        return {"count": 0}

    def avg(field):
        vals = [getattr(r, field) for r in records if getattr(r, field, 0) > 0]
        return round(sum(vals) / len(vals), 2) if vals else None

    def count_field(field):
        counts = {}
        for r in records:
            v = getattr(r, field) or "Not specified"
            counts[v] = counts.get(v, 0) + 1
        return counts

    return {
        "count":          len(records),
        "consentedCount": sum(1 for r in records if r.consent_research),
        "averageRatings": {
            "overall":   avg("overall_rating"),
            "accuracy":  avg("accuracy_rating"),
            "usability": avg("usability_rating"),
            "recommend": avg("recommend_rating"),
        },
        "averageLikert": {
            "insightUseful":   avg("insight_useful"),
            "changedBehavior": avg("changed_behavior"),
            "trustsAI":        avg("trusts_ai"),
            "easyToUse":       avg("easy_to_use"),
            "wouldRecommend":  avg("would_recommend"),
        },
        "usageDurationBreakdown": count_field("usage_duration"),
        "sleepIssuesBreakdown":   count_field("sleep_issues_before"),
        "heardFromBreakdown":     count_field("heard_from"),
    }