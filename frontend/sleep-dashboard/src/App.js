/**
 * App.js — Root with auth gate, protected routing, session management
 */
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage      from "./AuthPage";
import ProfileSetup  from "./components/ProfileSetup";
import SleepLogger   from "./components/SleepLogger";
import Dashboard     from "./components/Dashboard";
import History       from "./components/History";
import FeedbackForm  from "./components/FeedbackForm";
import api           from "./api";
import "./index.css";

function AppInner() {
  const { user, loading, logout, markProfileCreated } = useAuth();
  const [step,            setStep]            = useState(null);
  const [profile,         setProfile]         = useState(null);
  const [latestLog,       setLatestLog]       = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [showUserMenu,    setShowUserMenu]    = useState(false);

  // ── Set starting step based on user ──────────────────────────────────────
  useEffect(() => {
  if (!user) {
    setStep(null);
    setProfile(null);
    setLatestLog(null);
    setRecommendations(null);
    return;
  }
  setStep(user.profile_created ? "log" : "profile");
}, [user]);                          // ← was [user?.user_id]


  // ── Fetch profile for returning users ────────────────────────────────────
  useEffect(() => {
  if (!user?.profile_created) return;
  api.get("/profile/")
    .then((data) => setProfile(data))
    .catch(() => {});
}, [user?.profile_created, user]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || (user && step === null)) {
    return (
      <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="bg-orb bg-orb-1" /><div className="bg-orb bg-orb-2" /><div className="bg-orb bg-orb-3" />
        <div className="ai-spinner" />
      </div>
    );
  }

  if (!user) return <AuthPage onAuth={() => {}} />;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleProfileCreated = (profileData) => {
    setProfile(profileData);
    markProfileCreated();
    setStep("log");
  };

  // ✅ FIX: SleepLogger passes the log data directly via onLogged(logData)
  // We use it immediately instead of re-fetching, which avoids timing/auth issues
  const handleSleepLogged = async (logData) => {  // logData comes from SleepLogger via onLogged(result)
    // logData is whatever logSleep() returned from the backend
    if (logData && (logData.entry || logData.sleep_score !== undefined)) {
      // Backend returns { message, sleep_duration_hours, sleep_score, entry }
      // Flatten entry into the top-level object for Dashboard consumption
      const flatLog = {
        ...(logData.entry || logData),
        sleep_score:          logData.sleep_score          ?? logData.entry?.sleep_score,
        sleep_duration_hours: logData.sleep_duration_hours ?? logData.entry?.sleep_duration_hours,
      };
      setLatestLog(flatLog);
    } else {
      // Fallback: fetch latest from backend
      try {
        const latest = await api.get("/sleep/latest");
        setLatestLog(latest);
      } catch {
        // If this also fails, set logData as-is so dashboard isn't empty
        setLatestLog(logData || {});
      }
    }

    // Refresh profile in background (non-blocking)
    api.get("/profile/").then(setProfile).catch(() => {});

    setRecommendations(null);
    setStep("dashboard");
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const NAV = [
    { key: "log",       label: "Log Sleep" },
    { key: "history",   label: "History"   },
    { key: "dashboard", label: "Dashboard" },
    { key: "feedback",  label: "Feedback"  },
  ];

  return (
    <div className="app-shell" onClick={() => setShowUserMenu(false)}>
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◎</span>
            <span className="logo-text">SleepSense<span className="logo-ai">AI</span></span>
          </div>
          <nav className="header-nav">
            {user.profile_created && NAV.map(({ key, label }) => {
              const disabled = key === "dashboard" && !latestLog;
              return (
                <button key={key}
                  className={`nav-btn ${step === key ? "active" : ""}`}
                  onClick={() => { if (!disabled) setStep(key); }}
                  disabled={disabled}
                  title={disabled ? "Log sleep first to view dashboard" : ""}
                >
                  {label}
                </button>
              );
            })}
          </nav>
          {/* User avatar */}
          <div className="user-menu-wrap" onClick={(e) => e.stopPropagation()}>
            <button className="user-avatar-btn"
              onClick={() => setShowUserMenu((s) => !s)}
              title={user.name}>
              {getInitials(user.name)}
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-header">
                  <span className="user-dropdown-name">{user.name}</span>
                  <span className="user-dropdown-email">{user.email}</span>
                </div>
                <hr className="dropdown-divider" />
                {user.profile_created && (
                  <button className="dropdown-item"
                    onClick={() => { setStep("profile"); setShowUserMenu(false); }}>
                    ✏️ Edit Profile
                  </button>
                )}
                <button className="dropdown-item"
                  onClick={() => { setStep("feedback"); setShowUserMenu(false); }}>
                  📋 Give Feedback
                </button>
                <button className="dropdown-item danger" onClick={handleLogout}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="app-main">
        {step === "profile" && (
          <ProfileSetup onComplete={handleProfileCreated} />
        )}
        {step === "log" && (
          <SleepLogger profile={profile} onLogged={handleSleepLogged} />
        )}
        {step === "dashboard" && (
          <Dashboard
            profile={profile}
            latestLog={latestLog}
            recommendations={recommendations}
            onRecommendations={setRecommendations}
            onLogMore={() => setStep("log")}
            onFeedback={() => setStep("feedback")}
          />
        )}
        {step === "history" && (
          <History onLogMore={() => setStep("log")} />
        )}
        {step === "feedback" && (
          <FeedbackForm />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}