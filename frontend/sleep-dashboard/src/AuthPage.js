/**
 * AuthPage.js — Login / Register with dark sleep-themed UI
 */
import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function AuthPage({ onAuth }) {
  const { login, register } = useAuth();
  const [tab, setTab]         = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Password strength
  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)            s++;
    if (/[A-Z]/.test(p))          s++;
    if (/[0-9]/.test(p))          s++;
    if (/[^A-Za-z0-9]/.test(p))   s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"][strength];

  const handleSubmit = async () => {
    setError("");

    if (tab === "register") {
      if (!form.name.trim())                        return setError("Name is required");
      if (form.password !== form.confirmPassword)   return setError("Passwords don't match");
      if (strength < 2)                             return setError("Please choose a stronger password");
    }

    setLoading(true);
    try {
      let result;
      if (tab === "login") {
        // login(email, password) — matches AuthContext signature
        result = await login(form.email, form.password);
      } else {
        // register(email, password, name) — matches AuthContext signature
        result = await register(form.email, form.password, form.name);
      }
      // onAuth may be undefined if App.js manages state via useAuth directly
      if (onAuth) onAuth(result);
    } catch (e) {
      // api.js already normalises error messages into e.message
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="auth-page" onKeyDown={handleKey}>
      {/* Ambient orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon">◎</span>
          <span className="logo-text">SleepSense<span className="logo-ai">AI</span></span>
        </div>
        <p className="auth-tagline">Your personal sleep intelligence platform</p>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === "login" ? "active" : ""}`}
            onClick={() => { setTab("login"); setError(""); }}
          >Sign In</button>
          <button
            className={`auth-tab ${tab === "register" ? "active" : ""}`}
            onClick={() => { setTab("register"); setError(""); }}
          >Create Account</button>
        </div>

        <div className="auth-form">
          {/* Name — register only */}
          {tab === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                className="form-input"
                placeholder="e.g. Aryan Mehta"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label>Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password</label>
            <div className="input-wrap">
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder={tab === "register" ? "Min 8 chars, 1 uppercase, 1 number" : "Your password"}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                className="pass-toggle"
                onClick={() => setShowPass((s) => !s)}
              >{showPass ? "👁" : "🔒"}</button>
            </div>
            {tab === "register" && form.password && (
              <div className="strength-bar-wrap">
                <div className="strength-bar">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="strength-seg"
                      style={{ background: i <= strength ? strengthColor : "#1e293b" }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirm Password — register only */}
          {tab === "register" && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Repeat your password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="error-msg">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            className="btn-primary auth-submit"
            onClick={handleSubmit}
            disabled={loading || !form.email || !form.password}
          >
            {loading
              ? (tab === "login" ? "Signing in..." : "Creating account...")
              : (tab === "login" ? "Sign In →" : "Create Account →")
            }
          </button>

          {tab === "login" && (
            <p className="auth-switch">
              Don't have an account?{" "}
              <button className="link-btn" onClick={() => { setTab("register"); setError(""); }}>
                Create one free
              </button>
            </p>
          )}
          {tab === "register" && (
            <p className="auth-switch">
              Already have an account?{" "}
              <button className="link-btn" onClick={() => { setTab("login"); setError(""); }}>
                Sign in
              </button>
            </p>
          )}
        </div>

        <p className="auth-disclaimer">
          🔒 Your data is stored locally and never shared.
        </p>
      </div>
    </div>
  );
}