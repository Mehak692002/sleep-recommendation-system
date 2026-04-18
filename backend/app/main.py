import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models  # registers all models
import time

# Auto-create all tables in Neon on startup
Base.metadata.create_all(bind=engine)

from app.routes import sleep, profile, ai_recommendations, auth, feedback
from app.routes import admin

app = FastAPI(title="SleepSense AI", version="3.0.0", docs_url="/api/docs")

origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # we'll lock this down after deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,               prefix="/auth",     tags=["auth"])
app.include_router(profile.router,            prefix="/profile",  tags=["profile"])
app.include_router(sleep.router,              prefix="/sleep",    tags=["sleep"])
app.include_router(ai_recommendations.router, prefix="/ai",       tags=["ai"])
app.include_router(feedback.router,           prefix="/feedback", tags=["feedback"])
app.include_router(admin.router,              prefix="/admin",    tags=["admin"])

@app.get("/")
def root():
    return {"status": "SleepSense AI backend running", "version": "3.0.0"}

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0", "timestamp": time.time()}