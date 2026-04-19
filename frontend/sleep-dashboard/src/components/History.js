/**
 * History.js — Sleep history with charts and trend insights
 */
import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import api from "../api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

function ScoreBadge({ score }) {
  let cls = "badge-bad", label = "Poor";
  if (score >= 80) { cls = "badge-good"; label = "Excellent"; }
  else if (score >= 60) { cls = "badge-warn"; label = "Fair"; }
  return <span className={`insight-badge ${cls}`}>{label}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#141824", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function History({ onLogMore }) {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!user) return;

    // ✅ FIX: use user_id from auth context in the URL

    api.get("/sleep/history")
      .then((data) => {
        const arr = data?.history || data?.logs || (Array.isArray(data) ? data : []);
        arr.sort((a, b) => new Date(a.date || a.logged_at) - new Date(b.date || b.logged_at));
        setHistory(arr);
      })
      .catch((e) => setError(e.message || "Could not load history. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
        <div className="ai-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 500, textAlign: "center" }}>
          <div className="error-msg"><span>⚠️</span> {error}</div>
        </div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 500, textAlign: "center", padding: "3rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌙</div>
          <div className="section-title">No History Yet</div>
          <div className="section-sub" style={{ marginBottom: "1.5rem" }}>
            Start logging sleep to see trends and insights here.
          </div>
          <button className="btn-primary" onClick={onLogMore}>Log Your First Sleep</button>
        </div>
      </div>
    );
  }

  // ── Summary stats ──────────────────────────────────────────────────────────
  const avgScore = (
    history.reduce((s, h) => s + (h.sleep_score || 0), 0) / history.length
  ).toFixed(1);
  const avgHours = (
    history.reduce((s, h) => s + (h.sleep_duration_hours || 0), 0) / history.length
  ).toFixed(1);
  const avgQuality = (
    history.reduce((s, h) => s + (h.quality_rating || 0), 0) / history.length
  ).toFixed(1);

  const scores = history.map((h) => h.sleep_score || 0);
  const avg    = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = Math.sqrt(
    scores.reduce((s, x) => s + Math.pow(x - avg, 2), 0) / scores.length
  );
  const consistencyScore = Math.max(0, 100 - stdDev).toFixed(1);
  const trend = scores.length > 1
    ? scores[scores.length - 1] > scores[0] ? "📈 Improving" : "📉 Declining"
    : "—";

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = history.map((h) => ({
    date:     (h.date || "").slice(5),
    score:    Math.round(h.sleep_score || 0),
    duration: Number((h.sleep_duration_hours || 0).toFixed(1)),
    quality:  h.quality_rating || 0,
  }));

  const chartStyle = {
    background: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: "16px 8px",
    marginBottom: 20,
    border: "1px solid rgba(255,255,255,0.06)",
  };

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <div className="card card-wide">
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div>
            <div className="section-title">📊 Sleep History</div>
            <div className="section-sub">{history.length} nights logged</div>
          </div>
          <button className="btn-primary" onClick={onLogMore}>+ Log Tonight</button>
        </div>

        {/* Summary cards */}
        <div className="dashboard-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Avg Score</div>
            <div className="stat-value">{avgScore}<span className="stat-unit">/100</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Duration</div>
            <div className="stat-value">{avgHours}<span className="stat-unit">hrs</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Quality</div>
            <div className="stat-value">{avgQuality}<span className="stat-unit">/10</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Consistency</div>
            <div className="stat-value">{consistencyScore}<span className="stat-unit">/100</span></div>
          </div>
        </div>

        <hr className="divider" />

        {/* Charts */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
            📈 Sleep Score Trend
          </div>
          <div style={chartStyle}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="score" name="Score"
                  stroke="#818cf8" strokeWidth={2.5}
                  dot={{ fill: "#818cf8", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>
            🕐 Sleep Duration & Quality
          </div>
          <div style={chartStyle}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis yAxisId="left"  tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 10]}
                  tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 13 }} />
                <Line yAxisId="left"  type="monotone" dataKey="duration" name="Duration (hrs)"
                  stroke="#4ade80" strokeWidth={2.5} dot={{ fill: "#4ade80", r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="quality"  name="Quality (/10)"
                  stroke="#fbbf24" strokeWidth={2.5} dot={{ fill: "#fbbf24", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <hr className="divider" />

        {/* Trend Insights */}
        <div style={{
          background: "rgba(129,140,248,0.06)",
          border: "1px solid rgba(129,140,248,0.15)",
          borderRadius: 12, padding: "16px 20px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>
            🧠 Trend Insights
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#94a3b8" }}>
            <span>Your sleep score trend is <b style={{ color: "#e2e8f0" }}>{trend}</b></span>
            <span>Average sleep score: <b style={{ color: "#818cf8" }}>{avg.toFixed(1)}/100</b></span>
            <span>
              Consistency score: <b style={{ color: "#4ade80" }}>{consistencyScore}/100</b>
              {stdDev > 15
                ? " — High variability detected. Try keeping a fixed bedtime."
                : " — Good consistency! Keep it up."}
            </span>
          </div>
        </div>

        {/* History list — newest first */}
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
          📋 All Logs
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...history].reverse().map((h, i) => (
            <div key={i} style={{
              padding: "14px 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontWeight: 600, color: "#f1f5f9", marginBottom: 3 }}>
                  {h.date}
                </div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>
                  {h.bedtime} → {h.wake_time} &nbsp;·&nbsp;
                  {h.sleep_duration_hours}h &nbsp;·&nbsp;
                  Quality {h.quality_rating}/10 &nbsp;·&nbsp;
                  Awakenings {h.night_awakenings}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: -1 }}>
                  {Math.round(h.sleep_score)}
                </div>
                <ScoreBadge score={h.sleep_score} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}