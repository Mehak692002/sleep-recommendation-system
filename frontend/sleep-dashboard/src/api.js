/**
 * api.js — Unified API client with JWT auth
 */

export const API_BASE = "http://localhost:8000";

// ── Token helpers ──────────────────────────────────────────────────────────
export const getToken   = ()  => localStorage.getItem("token");
export const setToken   = (t) => localStorage.setItem("token", t);
export const clearToken = ()  => localStorage.removeItem("token");

// ── Base request ───────────────────────────────────────────────────────────
async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      Array.isArray(err.detail)
        ? err.detail.map((e) => e.msg).join(", ")
        : err.detail || "Request failed"
    );
  }
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────
export async function loginUser({ email, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token) setToken(data.access_token);
  return data;
}

export async function registerUser({ email, password, name }) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  if (data.access_token) setToken(data.access_token);
  return data;
}

export function logoutUser() {
  clearToken();
}

// ── Profile ────────────────────────────────────────────────────────────────
function toProfilePayload(form) {
  const sleepGoalHours =
    parseFloat((form.sleepGoal || "8h").replace("h", "")) || 8;
  return {
    age:                parseInt(form.age, 10) || null,
    gender:             form.gender             || null,
    weight:             form.weight             ? parseFloat(form.weight)  : null,
    height:             form.height             ? parseFloat(form.height)  : null,
    sleep_goal_hours:   sleepGoalHours,
    target_wake_time:   form.wakeTime           || "07:00",
    exercise_frequency: form.exerciseFreq       || "",
    caffeine_intake:    form.caffeineIntake      || "",
    stress_level:       form.stressLevel        || "",
    health_conditions:  form.healthConditions   || [],
    medications:        form.medications        || null,
  };
}

export async function saveProfile(form) {
  return request("/profile/", {
    method: "POST",
    body: JSON.stringify(toProfilePayload(form)),
  });
}

export async function updateProfile(form) {
  return request("/profile/", {
    method: "PUT",
    body: JSON.stringify(toProfilePayload(form)),
  });
}

export async function getProfile() {
  return request("/profile/");
}

// ── Sleep Logs ─────────────────────────────────────────────────────────────
function toSleepPayload(form) {
  return {
    date:                   form.date,
    bedtime:                form.bedtime,
    wake_time:              form.wakeTime,
    quality_rating:         form.sleepQuality,
    stress_level:           form.stressLevel,
    caffeine_cups:          form.caffeineCups,
    screen_time_before_bed: form.screenTime,
    exercise_today:         form.exercised,
    alcohol_consumed:       form.alcoholConsumed,
    naps_taken:             0,
    nap_duration_mins:      null,
    dream_recall:           form.dreams !== "None",
    night_awakenings:       form.nightAwakenings,
    notes:                  form.notes || "",
  };
}

export async function logSleep(form) {
  return request("/sleep/log", {
    method: "POST",
    body: JSON.stringify(toSleepPayload(form)),
  });
}

export async function getSleepLogs() {
  return request("/sleep/history");
}

export async function getLatestSleepLog() {
  return request("/sleep/latest");
}

// ── AI Recommendations ─────────────────────────────────────────────────────
export async function getRecommendations(daysToAnalyze = 7) {
  return request("/ai/recommendations", {
    method: "POST",
    body: JSON.stringify({ days_to_analyze: daysToAnalyze }),
  });
}

export async function getQuickTip() {
  return request("/ai/quick-tip");
}

// ── Feedback ───────────────────────────────────────────────────────────────
export async function submitFeedback(data) {
  return request("/feedback/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getFeedbackSummary() {
  return request("/feedback/summary");
}

// ── History (convenience alias) ────────────────────────────────────────────
export const getHistory = () => getSleepLogs();

// ── Default export (object form for `import api from './api'`) ─────────────
const api = {
  // raw request for one-off calls
  get:  (path)        => request(path),
  post: (path, body)  => request(path, { method: "POST", body: JSON.stringify(body) }),
  put:  (path, body)  => request(path, { method: "PUT",  body: JSON.stringify(body) }),

  // named helpers
  API_BASE, getToken, setToken, clearToken,
  loginUser, registerUser, logoutUser,
  saveProfile, updateProfile, getProfile,
  logSleep, getSleepLogs, getLatestSleepLog,
  getRecommendations, getQuickTip,
  submitFeedback, getFeedbackSummary,
  getHistory,
};

export default api;