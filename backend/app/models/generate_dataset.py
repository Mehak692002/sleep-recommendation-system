"""
generate_dataset.py
Run this first to create sleep_data.csv for training.
Place this file in: backend/app/models/
Run: python generate_dataset.py
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)
N = 5000  # number of synthetic sleep records

def generate_sleep_dataset(n=N):
    data = []
    for _ in range(n):
        # ── Input features (what your app collects) ──────────────────────────
        sleep_duration      = np.random.normal(7.0, 1.2)
        sleep_duration      = np.clip(sleep_duration, 3.0, 11.0)

        quality_rating      = np.random.randint(1, 11)
        stress_level        = np.random.randint(1, 11)
        caffeine_cups       = np.random.randint(0, 6)
        screen_time         = np.random.randint(0, 180)
        exercise_today      = np.random.randint(0, 2)
        alcohol_consumed    = np.random.randint(0, 2)
        nap_duration_mins   = np.random.choice([0, 0, 0, 20, 30, 45, 60, 90], p=[0.4,0.15,0.1,0.1,0.1,0.05,0.05,0.05])
        night_awakenings    = np.random.randint(0, 6)
        age                 = np.random.randint(18, 65)
        weight_kg           = np.random.uniform(45, 110)
        height_cm           = np.random.uniform(150, 195)
        sleep_goal_hours    = np.random.choice([6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0])

        # ── Rule-based sleep score (ground truth label) ───────────────────────
        score = 50.0

        # Duration vs goal
        duration_diff = sleep_duration - sleep_goal_hours
        if -0.5 <= duration_diff <= 1.0:    score += 20
        elif -1.0 <= duration_diff < -0.5:  score += 10
        elif duration_diff < -1.0:          score -= 15
        else:                               score += 5

        # Quality self-rating
        score += (quality_rating / 10) * 20

        # Stress penalty
        score -= (stress_level / 10) * 15

        # Caffeine penalty
        score -= caffeine_cups * 3

        # Screen time penalty
        score -= min(screen_time / 30, 5)

        # Exercise bonus
        score += exercise_today * 5

        # Alcohol penalty
        score -= alcohol_consumed * 8

        # Long nap penalty
        if nap_duration_mins > 30:
            score -= 5

        # Awakenings penalty
        score -= night_awakenings * 3

        # Age factor (older = slightly harder to maintain score)
        if age > 50:
            score -= 3

        # Add realistic noise
        score += np.random.normal(0, 3)
        score = round(float(np.clip(score, 0, 100)), 2)

        data.append({
            "sleep_duration_hours":   round(sleep_duration, 2),
            "quality_rating":         quality_rating,
            "stress_level":           stress_level,
            "caffeine_cups":          caffeine_cups,
            "screen_time_before_bed": screen_time,
            "exercise_today":         exercise_today,
            "alcohol_consumed":       alcohol_consumed,
            "nap_duration_mins":      nap_duration_mins,
            "night_awakenings":       night_awakenings,
            "age":                    age,
            "weight_kg":              round(weight_kg, 1),
            "height_cm":              round(height_cm, 1),
            "sleep_goal_hours":       sleep_goal_hours,
            "sleep_score":            score,   # ← label
        })

    return pd.DataFrame(data)


if __name__ == "__main__":
    df = generate_sleep_dataset()
    out_path = os.path.join(os.path.dirname(__file__), "sleep_data.csv")
    df.to_csv(out_path, index=False)
    print(f"✅ Dataset saved: {out_path}")
    print(f"   Rows: {len(df)}")
    print(f"   Score range: {df['sleep_score'].min():.1f} – {df['sleep_score'].max():.1f}")
    print(f"   Mean score:  {df['sleep_score'].mean():.1f}")
    print(df.head())