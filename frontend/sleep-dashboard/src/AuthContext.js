/**
 * AuthContext.js — JWT auth state, login/register/logout + markProfileCreated
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { loginUser, registerUser, logoutUser, getProfile } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Rehydrate session on mount ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    getProfile()
      .then((profile) => {
        // Build a unified user object from profile data
        setUser({
          user_id:         profile.user_id  || profile.id || "me",
          name:            profile.name     || profile.full_name || "User",
          email:           profile.email    || "",
          profile_created: true,
          ...profile,
        });
      })
      .catch(() => {
        // Token expired or invalid — clear it
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    // After login, fetch profile to know if it has been created
    try {
      const profile = await getProfile();
      setUser({
        user_id:         profile.user_id  || profile.id || "me",
        name:            profile.name     || profile.full_name || email.split("@")[0],
        email:           profile.email    || email,
        profile_created: true,
        ...profile,
      });
    } catch {
      // Profile doesn't exist yet — new user
      setUser({
        user_id:         data.user_id || "me",
        name:            data.name    || email.split("@")[0],
        email:           email,
        profile_created: false,
      });
    }
    return data;
  };

  // ── Register ────────────────────────────────────────────────────────────
  const register = async (email, password, name) => {
    const data = await registerUser({ email, password, name });
    setUser({
      user_id:         data.user_id || "me",
      name:            name || data.name || email.split("@")[0],
      email:           email,
      profile_created: false,   // new user — needs profile setup
    });
    return data;
  };

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = async () => {
    logoutUser();
    setUser(null);
  };

  // ── markProfileCreated — called by App.js after ProfileSetup completes ──
  const markProfileCreated = () => {
    setUser((prev) => prev ? { ...prev, profile_created: true } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, markProfileCreated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}