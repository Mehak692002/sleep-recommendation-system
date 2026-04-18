"""
init_db.py — Run this ONCE to create all tables in PostgreSQL.
Place at: backend/
Run with: python init_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from app.database import engine, Base

# Import all models so SQLAlchemy knows about them
from app.models import User, UserProfile, SleepLog, Feedback

def init():
    print("🔌 Connecting to PostgreSQL...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully:")
        print("   - users")
        print("   - user_profiles")
        print("   - sleep_logs")
        print("   - feedback")
        print("\n🚀 Database is ready. You can now start the backend:")
        print("   uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nMake sure:")
        print("  1. PostgreSQL is running")
        print("  2. Database 'sleepsense' exists in pgAdmin")
        print("  3. DATABASE_URL in .env is correct")

if __name__ == "__main__":
    init()