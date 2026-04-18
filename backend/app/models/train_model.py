"""
train_model.py
Trains a lightweight LSTM model on tabular sleep data.
Place this file in: backend/app/models/
Run AFTER generate_dataset.py:
    python train_model.py
Saves: sleep_model.h5  and  scaler.pkl  in the same folder.
"""

import numpy as np
import pandas as pd
import os, pickle

from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    LSTM, Dense, Dropout, Bidirectional,
    Conv1D, MaxPooling1D, Reshape
)
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.optimizers import Adam

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE       = os.path.dirname(__file__)
DATA_PATH  = os.path.join(BASE, "sleep_data.csv")
MODEL_PATH = os.path.join(BASE, "sleep_model.h5")
SCALER_PATH= os.path.join(BASE, "scaler.pkl")

# ── Feature columns (must match ai_recommendations.py) ───────────────────────
FEATURES = [
    "sleep_duration_hours",
    "quality_rating",
    "stress_level",
    "caffeine_cups",
    "screen_time_before_bed",
    "exercise_today",
    "alcohol_consumed",
    "nap_duration_mins",
    "night_awakenings",
    "age",
    "weight_kg",
    "height_cm",
    "sleep_goal_hours",
]
TARGET = "sleep_score"

# ── Load data ─────────────────────────────────────────────────────────────────
print("📂 Loading dataset...")
df = pd.read_csv(DATA_PATH)
print(f"   {len(df)} rows, {len(FEATURES)} features")

X = df[FEATURES].values.astype(np.float32)
y = df[TARGET].values.astype(np.float32)

# ── Scale features to [0, 1] ──────────────────────────────────────────────────
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# Save scaler — needed at inference time
with open(SCALER_PATH, "wb") as f:
    pickle.dump(scaler, f)
print(f"✅ Scaler saved: {SCALER_PATH}")

# ── Reshape for LSTM: (samples, timesteps, features) ─────────────────────────
# We treat each sample as a sequence of 1 timestep with 13 features.
# This lets CNN+BiLSTM work on single-night input.
X_reshaped = X_scaled.reshape((X_scaled.shape[0], 1, X_scaled.shape[1]))

# ── Train / val / test split ──────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X_reshaped, y, test_size=0.15, random_state=42
)
X_train, X_val, y_train, y_val = train_test_split(
    X_train, y_train, test_size=0.15, random_state=42
)
print(f"   Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}")

# ── Model: CNN + BiLSTM ───────────────────────────────────────────────────────
n_features = len(FEATURES)

model = Sequential([
    # Reshape to add a channel dim for Conv1D: (batch, 1, 13) → (batch, 13, 1)
    Reshape((n_features, 1), input_shape=(1, n_features)),

    # CNN block — extracts local feature patterns
    Conv1D(filters=64, kernel_size=3, activation="relu", padding="same"),
    Conv1D(filters=32, kernel_size=3, activation="relu", padding="same"),
    Dropout(0.2),

    # BiLSTM block — captures temporal dependencies
    Bidirectional(LSTM(64, return_sequences=True)),
    Dropout(0.2),
    Bidirectional(LSTM(32, return_sequences=False)),
    Dropout(0.2),

    # Regression head
    Dense(64, activation="relu"),
    Dense(32, activation="relu"),
    Dense(1, activation="linear"),   # output: sleep score 0-100
])

model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss="mse",
    metrics=["mae"]
)
model.summary()

# ── Train ─────────────────────────────────────────────────────────────────────
callbacks = [
    EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True, verbose=1),
    ModelCheckpoint(MODEL_PATH, monitor="val_loss", save_best_only=True, verbose=1),
]

print("\n🚀 Training started...")
history = model.fit(
    X_train, y_train,
    validation_data=(X_val, y_val),
    epochs=100,
    batch_size=64,
    callbacks=callbacks,
    verbose=1,
)

# ── Evaluate ──────────────────────────────────────────────────────────────────
print("\n📊 Evaluating on test set...")
y_pred = model.predict(X_test, verbose=0).flatten()
mae  = mean_absolute_error(y_test, y_pred)
r2   = r2_score(y_test, y_pred)

print(f"   MAE  : {mae:.2f} points")
print(f"   R²   : {r2:.4f}")
print(f"   Sample predictions vs actual:")
for i in range(5):
    print(f"     Predicted: {y_pred[i]:.1f}  |  Actual: {y_test[i]:.1f}")

print(f"\n✅ Model saved: {MODEL_PATH}")
print("   You can now start the backend — it will load this model automatically.")