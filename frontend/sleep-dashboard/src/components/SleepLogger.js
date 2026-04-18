import React, { useState } from 'react';
import { logSleep } from '../api';

const DREAM_OPTS = ['None', 'Vague', 'Vivid', 'Nightmares'];
const MOOD_OPTS  = [
  { label: 'Groggy',  emoji: '🥴' },
  { label: 'Okay',    emoji: '😐' },
  { label: 'Good',    emoji: '😊' },
  { label: 'Great',   emoji: '😁' },
  { label: 'Amazing', emoji: '🤩' },
];

export default function SleepLogger({ onLogged }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    bedtime: '23:00', wakeTime: '07:00',
    sleepQuality: 5, nightAwakenings: 0, stressLevel: 5,
    caffeineCups: 0, screenTime: 0,
    exercised: false, alcoholConsumed: false,
    dreams: 'None', morningMood: 'Good', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const Slider = ({ label, field, min = 0, max = 10, lo, hi }) => (
    <div className="form-group">
      <label className="form-label">{label} — {form[field]}</label>
      <div className="slider-wrap">
        {lo && <span style={{ fontSize: 12, color: '#64748b' }}>{lo}</span>}
        <input className="slider" type="range" min={min} max={max}
          value={form[field]} onChange={e => set(field, +e.target.value)} />
        {hi && <span style={{ fontSize: 12, color: '#64748b' }}>{hi}</span>}
        <span className="slider-val">{form[field]}</span>
      </div>
    </div>
  );

  const Toggle = ({ label, field }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="tag-wrap">
        {['Yes', 'No'].map(v => (
          <button key={v}
            className={`tag-pill${(form[field] ? 'Yes' : 'No') === v ? ' selected' : ''}`}
            onClick={() => set(field, v === 'Yes')} type="button">{v}
          </button>
        ))}
      </div>
    </div>
  );

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ FIX: capture the response and pass it to onLogged
      // Backend returns: { message, sleep_duration_hours, sleep_score, entry }
      const result = await logSleep(form);
      onLogged?.(result);
    } catch (e) {
      setError(e.message || 'Failed to log sleep. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card profile-card-wide">
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <div>
          <div className="section-title">Log Your Sleep</div>
          <div className="section-sub">Track last night for personalised AI insights</div>
        </div>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 12 }}>⚠️ {error}</div>}

      <div className="profile-grid">
        {/* LEFT */}
        <div className="profile-col">
          <div className="profile-section-label">Sleep Times</div>
          <div className="two-col" style={{ gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date}
                onChange={e => set('date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bedtime</label>
              <input className="form-input" type="time" value={form.bedtime}
                onChange={e => set('bedtime', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Wake-up time</label>
            <input className="form-input" type="time" value={form.wakeTime}
              onChange={e => set('wakeTime', e.target.value)} style={{ maxWidth: 160 }} />
          </div>

          <div className="profile-section-label" style={{ marginTop: 4 }}>Quality Metrics</div>
          <Slider label="Sleep quality"        field="sleepQuality"    lo="Poor"  hi="Excellent" />
          <Slider label="Night awakenings"     field="nightAwakenings" min={0} max={10} lo="0" hi="10+" />
          <Slider label="Stress level tonight" field="stressLevel"     lo="Low"   hi="High" />

          <div className="two-col" style={{ gap: 10, marginTop: 2 }}>
            <div className="form-group">
              <label className="form-label">Caffeine cups today</label>
              <input className="form-input" type="number" min="0" max="20"
                value={form.caffeineCups} onChange={e => set('caffeineCups', +e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Screen time before bed (min)</label>
              <input className="form-input" type="number" min="0" max="480"
                value={form.screenTime} onChange={e => set('screenTime', +e.target.value)} />
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="profile-col">
          <div className="profile-section-label">Lifestyle & Mood</div>
          <Toggle label="Exercised today?"  field="exercised" />
          <Toggle label="Alcohol consumed?" field="alcoholConsumed" />

          <div className="form-group">
            <label className="form-label">Dreams</label>
            <div className="tag-wrap">
              {DREAM_OPTS.map(d => (
                <button key={d}
                  className={`tag-pill${form.dreams === d ? ' selected' : ''}`}
                  onClick={() => set('dreams', d)} type="button">{d}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Morning mood</label>
            <div className="tag-wrap">
              {MOOD_OPTS.map(({ label, emoji }) => (
                <button key={label}
                  className={`tag-pill${form.morningMood === label ? ' selected' : ''}`}
                  onClick={() => set('morningMood', label)} type="button">
                  {emoji} {label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-input" rows={3}
              placeholder="Anything affecting your sleep last night?"
              value={form.notes} onChange={e => set('notes', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
          </div>

          <button className="btn-primary btn-full"
            style={{ marginTop: 'auto', paddingTop: 13, paddingBottom: 13 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Analysing…' : 'Analyse Sleep & Get AI Insights →'}
          </button>
        </div>
      </div>
    </div>
  );
}