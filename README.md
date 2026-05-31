# 🌙 SleepSense AI — Sleep Recommendation System

> A full-stack, AI-powered sleep wellness platform that helps users track sleep habits, analyze patterns, and receive personalized recommendations for improving sleep quality and overall well-being.


---

## 🚀 Overview

SleepSense AI is an intelligent sleep monitoring and recommendation platform designed to help users understand and improve their sleep habits. The system combines sleep tracking, health profiling, analytics, and AI-driven recommendations to provide actionable insights for better sleep health.

### Key Highlights

- 🔐 Secure JWT Authentication
- 😴 Sleep Tracking & Logging
- 🤖 AI-Powered Personalized Recommendations
- 📊 Interactive Dashboard & Analytics
- 📈 Sleep Trend Monitoring
- 👤 User Health Profiles
- 📱 Responsive Modern Interface
- ☁️ Cloud Deployment Ready

---

## ✨ Features

### 🔐 Authentication & Security

- User Registration & Login
- JWT Access and Refresh Tokens
- Secure Password Hashing using bcrypt
- Token Blacklisting on Logout
- Password Validation & Security Checks
- Protected API Routes

### 😴 Sleep Logging

Users can record:

- Bedtime and Wake Time
- Sleep Quality Rating
- Number of Night Awakenings
- Morning Mood
- Dream Recall
- Personal Notes

Lifestyle factors:

- Caffeine Consumption
- Screen Time Before Bed
- Exercise Activity
- Alcohol Intake
- Stress Levels

Automatically calculated:

- Sleep Duration
- Sleep Score
- REM Sleep Estimation

---

### 🤖 AI Recommendation Engine

The recommendation engine provides personalized suggestions based on:

- Sleep Duration
- Sleep Quality
- Bedtime Consistency
- Stress Levels
- Exercise Habits
- Caffeine Intake
- Screen Usage
- Alcohol Consumption
- Health Conditions
- User Age Group

Supports recommendations for:

- Insomnia
- Sleep Apnea
- Anxiety
- Stress Management
- Lifestyle Improvements

---

### 📊 Dashboard

The dashboard displays:

- Sleep Score Visualization
- Sleep Duration Metrics
- Sleep Quality Overview
- REM Sleep Estimates
- Mood Tracking
- Night Awakening Analysis
- Goal Achievement Indicators

---

### 📈 Analytics

Advanced analytics include:

- Sleep Score Trends
- Duration Analysis
- Quality Comparison Charts
- Weekly Sleep Averages
- Lifestyle Radar Charts
- Consistency Tracking
- Best & Worst Sleep Comparisons
- Sleep Streak Monitoring

---

### 📋 Sleep History

- Complete Sleep Log Records
- Historical Performance Tracking
- Average Sleep Statistics
- Date-Based Sorting & Filtering

---

### 👤 User Profile Management

Users can configure:

- Age
- Gender
- Height
- Weight
- Sleep Goals
- Target Wake-Up Time
- Exercise Frequency
- Caffeine Consumption
- Stress Level
- Health Conditions
- Medications

---

## 🏗️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|----------|
| React 18 | User Interface |
| Axios | API Communication |
| Recharts | Data Visualization |
| CSS Variables | Theming & Styling |

### Backend

| Technology | Purpose |
|------------|----------|
| FastAPI | REST API Framework |
| SQLAlchemy | ORM |
| PostgreSQL | Database |
| JWT (python-jose) | Authentication |
| bcrypt (passlib) | Password Security |
| slowapi | Rate Limiting |
| Uvicorn | ASGI Server |

### Infrastructure

| Service | Purpose |
|----------|----------|
| Neon | PostgreSQL Database |
| Render | Backend Hosting |
| Vercel | Frontend Hosting |
| GitHub | Version Control |

---

## 📁 Project Structure

```text
sleep-recommendation-system/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── profile.py
│   │       ├── sleep.py
│   │       ├── ai_recommendations.py
│   │       ├── feedback.py
│   │       └── admin.py
│   │
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    └── sleep-dashboard/
        ├── src/
        │   ├── App.js
        │   ├── AuthContext.js
        │   ├── AuthPage.js
        │   ├── api.js
        │   └── components/
        │       ├── Dashboard.js
        │       ├── SleepLogger.js
        │       ├── ProfileSetup.js
        │       ├── History.js
        │       ├── Analytics.js
        │       └── FeedbackForm.js
        │
        ├── public/
        └── package.json
```

---

## 🛠️ Installation & Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL Database (Neon Recommended)

---

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/sleep-recommendation-system.git

cd sleep-recommendation-system
```

---

### 2️⃣ Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
JWT_SECRET_KEY=your-secret-key

DATABASE_URL=postgresql://username:password@host/database

ALLOWED_ORIGINS=http://localhost:3000
```

Create database tables:

```bash
python -c "from app.database import engine, Base; import app.models; Base.metadata.create_all(bind=engine)"
```

Start backend:

```bash
uvicorn app.main:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

API Documentation:

```text
http://127.0.0.1:8000/api/docs
```

---

### 3️⃣ Frontend Setup

```bash
cd frontend/sleep-dashboard

npm install
```

Create `.env.local`

```env
REACT_APP_API_URL=http://127.0.0.1:8000
```

Run application:

```bash
npm start
```

Frontend URL:

```text
http://localhost:3000
```

---

## 🌐 Deployment

### Database (Neon)

1. Create a Neon PostgreSQL project
2. Obtain connection string
3. Add it to `DATABASE_URL`

### Backend (Render)

```text
Build Command:
pip install -r requirements.txt

Start Command:
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required Environment Variables:

```env
JWT_SECRET_KEY=
DATABASE_URL=
ALLOWED_ORIGINS=
```

### Frontend (Vercel)

Required Environment Variable:

```env
REACT_APP_API_URL=https://your-backend-url.onrender.com
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint |
|----------|----------|
| POST | `/auth/register` |
| POST | `/auth/login` |
| POST | `/auth/refresh` |
| POST | `/auth/logout` |
| GET | `/auth/me` |

### Profile

| Method | Endpoint |
|----------|----------|
| GET | `/profile/` |
| POST | `/profile/` |
| PUT | `/profile/` |

### Sleep Management

| Method | Endpoint |
|----------|----------|
| POST | `/sleep/log` |
| GET | `/sleep/latest` |
| GET | `/sleep/history` |
| GET | `/sleep/analytics` |
| DELETE | `/sleep/log/{id}` |

### Health

| Method | Endpoint |
|----------|----------|
| GET | `/health` |

---

## 🗄️ Database Schema

### Users

```sql
id
email
name
hashed_password
is_active
profile_created
created_at
```

### User Profiles

```sql
id
user_id
age
gender
weight
height
sleep_goal_hours
target_wake_time
exercise_frequency
caffeine_intake
stress_level
health_conditions
medications
```

### Sleep Logs

```sql
id
user_id
date
bedtime
wake_time
sleep_duration_hours
sleep_score
quality_rating
stress_level
caffeine_cups
screen_time_before_bed
exercise_today
alcohol_consumed
night_awakenings
morning_mood
dream_recall
notes
logged_at
```

### Feedback

```sql
id
user_id
overall_rating
comment
created_at
```

---

## 🔒 Security Features

- bcrypt Password Hashing
- JWT Authentication
- Refresh Token Support
- Token Blacklisting
- Rate Limiting
- CORS Protection
- SQL Injection Protection
- Secure HTTP Headers


---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit changes

```bash
git commit -m "feat: add new feature"
```

4. Push changes

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👩‍💻 Author

**Mehak**

GitHub: https://github.com/Mehak692002

---

<div align="center">

### 🌙 Sleep Better. Live Better.

Built with ❤️ using React, FastAPI, PostgreSQL, and AI-powered recommendations.

⭐ Star this repository if you found it useful!

</div>
