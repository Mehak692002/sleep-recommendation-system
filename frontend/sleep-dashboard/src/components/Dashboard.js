/**
 * Dashboard.js — AI-generated sleep analysis and recommendations
 */
import React, { useEffect, useState } from "react";
import api from "../api";

// ─── Local fallback recommendation engine ─────────────────────────────────────
function generateRecommendations(profile, log) {
  const recs = [];
  const goal       = profile ? Number(profile.sleep_goal_hours || 8) : 8;
  const quality    = Number(log.quality_rating    || log.quality    || 0);
  const awakenings = Number(log.night_awakenings  || log.awakenings || 0);
  const hours      = Number(log.sleep_duration_hours || log.hoursSlept || 0);
  const caffeine   = Number(log.caffeine_cups     || 0);
  const screenTime = Number(log.screen_time_before_bed || 0);
  const exercised  = log.exercise_today   || false;
  const alcohol    = log.alcohol_consumed || false;
  const mood       = log.morning_mood     || log.mood || "";
  const conditions = profile?.health_conditions  || [];
  const profStress = profile?.stress_level        || "";
  const age        = Number(profile?.age || 0);
  const deficit    = goal - hours;

  if (deficit > 1) {
    recs.push({ icon: "🛏", title: "Increase sleep duration",
      desc: `You slept ${hours}h but your goal is ${goal}h. Try moving bedtime ${Math.ceil(deficit * 60)} min earlier.` });
  } else if (deficit < -1) {
    recs.push({ icon: "⏰", title: "You may be over-sleeping",
      desc: `Sleeping ${hours}h (vs ${goal}h goal) can fragment your circadian rhythm. Try a consistent alarm.` });
  }
  if (quality <= 4) {
    recs.push({ icon: "🌡", title: "Optimise sleep environment",
      desc: "Low quality scores correlate with temperature, noise, or light. Aim for 18–20°C and blackout conditions." });
  } else if (quality <= 6) {
    recs.push({ icon: "🌙", title: "Improve sleep quality",
      desc: "Moderate quality — try a consistent pre-bed wind-down: no screens 30 min before sleep." });
  }
  if (awakenings >= 3) {
    recs.push({ icon: "💤", title: "Reduce night-time awakenings",
      desc: `You woke ${awakenings} times. Limit fluids 2hrs before bed and consider white noise.` });
  }
  if (caffeine >= 3) {
    recs.push({ icon: "☕", title: "Cut afternoon caffeine",
      desc: `${caffeine} cups today. Caffeine's 5–6hr half-life means it's still active at midnight.` });
  }
  if (screenTime >= 60) {
    recs.push({ icon: "📱", title: "Reduce screen time before bed",
      desc: `${screenTime} min of screens suppresses melatonin by up to 50%. Switch to reading or stretching.` });
  }
  if (alcohol) {
    recs.push({ icon: "🍷", title: "Alcohol disrupts deep sleep",
      desc: "Alcohol reduces REM and deep sleep. Avoid within 3hrs of bedtime." });
  }
  if (!exercised) {
    recs.push({ icon: "🏃", title: "Add movement to your day",
      desc: "Even 20 min of brisk walking improves sleep onset by ~15 min on average." });
  }
  if (profStress === "High (7–10)") {
    recs.push({ icon: "🧘", title: "Wind-down routine for high stress",
      desc: "A 20-min pre-bed ritual (journalling, 4-7-8 breathing, stretching) lowers cortisol by up to 30%." });
  }
  if (mood.includes("Groggy") || mood.includes("Okay")) {
    recs.push({ icon: "☀️", title: "Boost morning alertness",
      desc: "Get bright outdoor light within 30 min of waking to reset your circadian clock." });
  }
  if (conditions.includes("Sleep Apnea")) {
    recs.push({ icon: "🌬", title: "Review Sleep Apnea management",
      desc: "Ensure CPAP settings are up-to-date. Side-sleeping reduces AHI by up to 50% in mild cases." });
  }
  if (conditions.includes("Insomnia")) {
    recs.push({ icon: "🕐", title: "CBT-I for Insomnia",
      desc: "Cognitive Behavioural Therapy for Insomnia is more effective than sleep medication long-term." });
  }
  if (conditions.includes("Anxiety")) {
    recs.push({ icon: "💭", title: "Manage pre-sleep anxiety",
      desc: "Try 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s. Repeat 4 cycles." });
  }
  if (age >= 60) {
    recs.push({ icon: "🌅", title: "Sleep changes with age",
      desc: "A short 20-min afternoon nap (before 3 PM) can help without disrupting night sleep." });
  }
  // Diet tip always shows
  recs.push({ icon: "🥗", title: "Sleep-supportive nutrition",
    desc: "Tryptophan-rich foods (eggs, nuts, turkey) boost melatonin. Avoid heavy meals within 2hrs of bed." });

  if (quality >= 8 && hours >= goal - 0.5 && awakenings <= 1 && recs.length <= 2) {
    recs.unshift({ icon: "⭐", title: "Great sleep — maintain consistency",
      desc: "Your stats look excellent! A fixed wake time every day (including weekends) is your #1 habit." });
  }
  return recs.slice(0, 6);
}

function sleepScore(log, profile) {
  const goal  = profile ? Number(profile.sleep_goal_hours || 8) : 8;
  const hours = Number(log.sleep_duration_hours || log.hoursSlept || 0);
  const qual  = Number(log.quality_rating || log.quality || 0);
  const awake = Number(log.night_awakenings || log.awakenings || 0);
  let score = 50;
  score += Math.min(hours / goal, 1) * 20;
  if (hours < goal - 1) score -= 10;
  score += (qual / 10) * 20;
  score -= Math.min(awake * 2, 10);
  return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreBadge(score) {
  if (score >= 80) return { cls: "badge-good", label: "Excellent" };
  if (score >= 60) return { cls: "badge-warn", label: "Fair" };
  return { cls: "badge-bad", label: "Poor" };
}

function ScoreRing({ score }) {
  const r    = 56;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#4ade80" : score >= 60 ? "#fbbf24" : "#f87171";
  return (
    <div className="score-ring">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="65" cy="65" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s ease", transform: "rotate(-90deg)", transformOrigin: "65px 65px" }}
        />
      </svg>
      <div className="score-ring-val">
        {score}
        <span className="score-ring-label">/ 100</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard({ profile, latestLog, recommendations, onRecommendations, onLogMore, onFeedback }) {
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!latestLog || recommendations) return;
    setGenerating(true);
    const run = async () => {
      try {
        const { data } = await api.get("/ai/recommendations");
        if (data?.recommendations?.length) {
          onRecommendations(data.recommendations.map((r) => ({
            icon:  r.icon  || "💡",
            title: r.title || r.category || "Tip",
            desc:  r.description || r.desc || r.message || "",
          })));
          return;
        }
      } catch { /* fall through to local */ }
      onRecommendations(generateRecommendations(profile, latestLog));
    };
    run().finally(() => setGenerating(false));
  }, [latestLog, recommendations, profile, onRecommendations]);

  // ── Empty state ──
  if (!latestLog) {
    return (
      <div className="dashboard-empty">
        <div className="dashboard-empty-icon">🌙</div>
        <h2 className="dashboard-empty-title">No Sleep Log Yet</h2>
        <p className="dashboard-empty-sub">
          Log your first night's sleep to unlock your personal AI sleep analysis.
        </p>
        <button className="btn-primary" onClick={onLogMore}>Log Sleep Now →</button>
      </div>
    );
  }

  const score = latestLog.sleep_score || sleepScore(latestLog, profile);
  const badge = scoreBadge(score);
  const goal  = profile ? Number(profile.sleep_goal_hours || 8) : 8;
  const hours = Number(latestLog.sleep_duration_hours || latestLog.hoursSlept || 0);
  const qual  = Number(latestLog.quality_rating || latestLog.quality || 0);
  const awake = Number(latestLog.night_awakenings || latestLog.awakenings || 0);

  return (
    // ✅ FIX: removed inline width/flex wrapper — card-wide handles max-width
    // ✅ FIX: changed "profile-card-wide" → "card card-wide" (correct CSS class)
    <div className="card card-wide">

      {/* Header */}
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <div>
          <div className="section-title">Sleep Dashboard</div>
          <div className="section-sub">{latestLog.date} · AI-powered analysis</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={onLogMore} style={{ fontSize: 13 }}>
            + Log New Night
          </button>
          {onFeedback && (
            <button className="btn-secondary" onClick={onFeedback} style={{ fontSize: 13 }}>
              📋 Feedback
            </button>
          )}
        </div>
      </div>

      <hr className="divider" />

      {/* Score + Stats — ✅ FIX: flex-wrap so stats don't overflow on small screens */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="score-ring-wrap" style={{ flex: "0 0 auto" }}>
          <ScoreRing score={score} />
          <div className="score-ring-caption">Sleep Score</div>
          <span className={`insight-badge ${badge.cls}`} style={{ marginTop: 8 }}>
            {badge.label}
          </span>
        </div>

        {/* ✅ FIX: minWidth reduced so it wraps properly on smaller screens */}
        <div className="dashboard-grid" style={{ flex: 1, minWidth: 220 }}>
          <div className="stat-card">
            <div className="stat-label">Duration</div>
            <div className="stat-value">{hours}<span className="stat-unit">hrs</span></div>
            <div className="stat-sub">
              Goal: {goal}h · {hours >= goal ? "✅ Met" : `⚠ ${(goal - hours).toFixed(1)}h short`}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Quality</div>
            <div className="stat-value">{qual}<span className="stat-unit">/10</span></div>
            <div className="stat-sub">Self-reported</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">REM Estimate</div>
            <div className="stat-value">{(hours * 0.22).toFixed(1)}<span className="stat-unit">hrs</span></div>
            <div className="stat-sub">~22% of total sleep</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Awakenings</div>
            <div className="stat-value">{awake}</div>
            <div className="stat-sub">
              {awake === 0 ? "Perfect continuity" : awake <= 2 ? "Acceptable" : "High — see tips"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Morning Mood</div>
            <div className="stat-value" style={{ fontSize: 18, letterSpacing: 0 }}>
              {latestLog.morning_mood || latestLog.mood || "—"}
            </div>
            <div className="stat-sub">
              Dreams recalled: {latestLog.dream_recall ? "Yes" : latestLog.dreams || "—"}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Bedtime</div>
            <div className="stat-value" style={{ fontSize: 18, letterSpacing: 0 }}>
              {latestLog.bedtime || "—"}
            </div>
            <div className="stat-sub">Wake: {latestLog.wake_time || latestLog.wakeTime || "—"}</div>
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* AI Recommendations */}
      <div>
        <div className="flex-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>
            🤖 AI Recommendations
          </span>
          {generating && (
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#818cf8" }}>
              <span className="ai-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              Analysing…
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>
          Personalised to your sleep data{profile ? " and health profile" : ""}.
        </p>

        {generating && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: 72, borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        )}

        {recommendations && !generating && (
          <div className="rec-list">
            {recommendations.map((r, i) => (
              <div className="rec-item" key={i}>
                <span className="rec-icon">{r.icon}</span>
                <div>
                  <div className="rec-title">{r.title}</div>
                  <div className="rec-desc">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {latestLog.notes && (
        <>
          <hr className="divider" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>📝 Your notes</div>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{latestLog.notes}</p>
          </div>
        </>
      )}
    </div>
  );
}