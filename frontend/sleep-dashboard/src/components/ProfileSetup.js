/**
 * ProfileSetup.js — Multi-step profile creation / edit
 * Calls onComplete(profileData) when saved successfully.
 */
import React, { useState } from "react";
import { saveProfile, updateProfile } from "../api";

const HEALTH_CONDITIONS = [
  "Anxiety", "Depression", "Insomnia", "Sleep Apnea",
  "Diabetes", "Hypertension", "GERD/Acid Reflux", "Chronic Pain", "None",
];

export default function ProfileSetup({ onComplete, existingProfile }) {
  const isEdit = !!existingProfile;

  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    name:              existingProfile?.name              || "",
    age:               existingProfile?.age               || "",
    gender:            existingProfile?.gender            || "",
    weight:            existingProfile?.weight            || "",
    height:            existingProfile?.height            || "",
    occupation:        existingProfile?.occupation        || "",
    activityLevel:     existingProfile?.activity_level   || "",
    healthConditions:  existingProfile?.health_conditions || [],
    dietaryPreference: existingProfile?.dietary_preference|| "",
    sleepGoal:         existingProfile?.sleep_goal_hours
                         ? `${existingProfile.sleep_goal_hours}h`
                         : "7.5h",
    wakeTime:          existingProfile?.target_wake_time || "07:00",
    exerciseFreq:      existingProfile?.exercise_frequency || "",
    caffeineIntake:    existingProfile?.caffeine_intake   || "",
    stressLevel:       existingProfile?.stress_level      || "",
    medications:       existingProfile?.medications       || "",
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleCondition = (c) => {
    setForm((f) => {
      const cur = f.healthConditions;
      if (c === "None") return { ...f, healthConditions: ["None"] };
      const without = cur.filter((x) => x !== "None");
      return {
        ...f,
        healthConditions: without.includes(c)
          ? without.filter((x) => x !== c)
          : [...without, c],
      };
    });
  };

  // ── Pages ────────────────────────────────────────────────────────────────
  const pages = [
    {
      title:    "Who are you?",
      subtitle: "Personal details help us tailor your sleep plan.",
      valid:    form.name && form.age && form.gender,
      fields: (
        <div className="form-grid">
          <div className="form-group full">
            <label>Full Name</label>
            <input className="form-input" placeholder="e.g. Aryan Mehta"
              value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input className="form-input" type="number" placeholder="25"
              value={form.age} onChange={(e) => set("age", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <div className="pill-select">
              {["Male", "Female", "Other"].map((g) => (
                <button key={g} type="button"
                  className={`pill ${form.gender === g.toLowerCase() ? "selected" : ""}`}
                  onClick={() => set("gender", g.toLowerCase())}>
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input className="form-input" type="number" placeholder="65"
              value={form.weight} onChange={(e) => set("weight", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Height (cm)</label>
            <input className="form-input" type="number" placeholder="170"
              value={form.height} onChange={(e) => set("height", e.target.value)} />
          </div>
          <div className="form-group full">
            <label>Occupation</label>
            <input className="form-input" placeholder="e.g. Software Engineer, Student"
              value={form.occupation} onChange={(e) => set("occupation", e.target.value)} />
          </div>
        </div>
      ),
    },
    {
      title:    "Your lifestyle",
      subtitle: "Helps us personalise your sleep and diet recommendations.",
      valid:    form.activityLevel && form.dietaryPreference,
      fields: (
        <div className="form-grid">
          <div className="form-group full">
            <label>Activity Level</label>
            <div className="card-select">
              {[
                { val: "sedentary", label: "🪑 Sedentary", desc: "Desk job, minimal movement" },
                { val: "light",     label: "🚶 Light",     desc: "Light walks, housework" },
                { val: "moderate",  label: "🏃 Moderate",  desc: "Exercise 3–4×/week" },
                { val: "active",    label: "💪 Active",    desc: "Daily intense exercise" },
              ].map((opt) => (
                <button key={opt.val} type="button"
                  className={`card-option ${form.activityLevel === opt.val ? "selected" : ""}`}
                  onClick={() => set("activityLevel", opt.val)}>
                  <span className="card-label">{opt.label}</span>
                  <span className="card-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group full">
            <label>Dietary Preference</label>
            <div className="pill-select">
              {["Vegetarian", "Vegan", "Non-Veg", "Keto", "Jain"].map((d) => (
                <button key={d} type="button"
                  className={`pill ${form.dietaryPreference === d.toLowerCase() ? "selected" : ""}`}
                  onClick={() => set("dietaryPreference", d.toLowerCase())}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group full">
            <label>Sleep Goal (hours/night)</label>
            <div className="slider-wrap">
              <input type="range" min="5" max="10" step="0.5" className="range-slider"
                value={parseFloat(form.sleepGoal) || 7.5}
                onChange={(e) => set("sleepGoal", `${e.target.value}h`)} />
              <span className="slider-val">{form.sleepGoal}</span>
            </div>
          </div>
          <div className="form-group">
            <label>Target Wake Time</label>
            <input className="form-input" type="time"
              value={form.wakeTime} onChange={(e) => set("wakeTime", e.target.value)} />
          </div>
          <div className="form-group">
            <label>Stress Level</label>
            <div className="pill-select">
              {["Low (1–3)", "Medium (4–6)", "High (7–10)"].map((s) => (
                <button key={s} type="button"
                  className={`pill ${form.stressLevel === s ? "selected" : ""}`}
                  onClick={() => set("stressLevel", s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Caffeine Intake</label>
            <div className="pill-select">
              {["None", "1–2 cups/day", "3–4 cups/day", "5+ cups/day"].map((c) => (
                <button key={c} type="button"
                  className={`pill ${form.caffeineIntake === c ? "selected" : ""}`}
                  onClick={() => set("caffeineIntake", c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title:    "Health & Conditions",
      subtitle: "Makes recommendations safer and more relevant.",
      valid:    form.healthConditions.length > 0,
      fields: (
        <div className="form-grid">
          <div className="form-group full">
            <label>Health Conditions (select all that apply)</label>
            <div className="condition-grid">
              {HEALTH_CONDITIONS.map((c) => (
                <button key={c} type="button"
                  className={`condition-chip ${form.healthConditions.includes(c) ? "selected" : ""}`}
                  onClick={() => toggleCondition(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group full">
            <label>Medications (optional)</label>
            <input className="form-input"
              placeholder="e.g. Melatonin, Antihistamines — leave blank if none"
              value={form.medications}
              onChange={(e) => set("medications", e.target.value)} />
          </div>
        </div>
      ),
    },
  ];

  const currentPage = pages[page];

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const saved = isEdit
        ? await updateProfile(form)
        : await saveProfile(form);

      // onComplete receives the saved profile data
      // App.js handler: handleProfileCreated(profileData) → markProfileCreated() + setStep("log")
      onComplete(saved || form);
    } catch (e) {
      setError(e.message || "Failed to save profile. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="card-page">
      <div className="setup-card">
        <div className="page-header">
          <div className="page-tag">
            {isEdit ? "Edit Profile" : `Step ${page + 1} of ${pages.length}`}
          </div>
          <h2 className="page-title">{currentPage.title}</h2>
          <p className="page-subtitle">{currentPage.subtitle}</p>
        </div>

        <div className="page-body">{currentPage.fields}</div>

        {error && <div className="error-msg">{error}</div>}

        <div className="page-footer">
          {page > 0 && (
            <button className="btn-ghost" onClick={() => setPage((p) => p - 1)}>
              ← Back
            </button>
          )}
          {page < pages.length - 1 ? (
            <button className="btn-primary"
              disabled={!currentPage.valid}
              onClick={() => setPage((p) => p + 1)}>
              Continue →
            </button>
          ) : (
            <button className="btn-primary"
              disabled={!currentPage.valid || loading}
              onClick={handleSubmit}>
              {loading
                ? "Saving…"
                : isEdit ? "Save Changes ✨" : "Create My Profile ✨"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}