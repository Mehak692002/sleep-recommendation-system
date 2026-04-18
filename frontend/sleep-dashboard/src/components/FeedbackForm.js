import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { submitFeedback } from '../api';

/* ── Star Rating ─────────────────────────────────────── */
function StarRating({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 160 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 22, lineHeight: 1, padding: '0 1px',
              color: star <= (hover || value) ? '#fbbf24' : 'rgba(255,255,255,0.15)',
              transition: 'color 0.12s, transform 0.1s',
              transform: hover === star ? 'scale(1.2)' : 'scale(1)',
            }}>★</button>
        ))}
      </div>
      {value > 0 && (
        <span style={{ fontSize: 12, color: '#64748b' }}>{labels[value]}</span>
      )}
    </div>
  );
}

/* ── Compact Likert Row ───────────────────────────────── */
const LIKERT_OPTS = ['SD', 'D', 'N', 'A', 'SA'];
const LIKERT_FULL = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

function LikertRow({ label, field, form, setForm }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 12, color: '#94a3b8', flex: 1, lineHeight: 1.3 }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {LIKERT_OPTS.map((opt, i) => (
          <button key={opt} type="button"
            title={LIKERT_FULL[i]}
            onClick={() => setForm(f => ({ ...f, [field]: i + 1 }))}
            style={{
              width: 32, height: 28,
              borderRadius: 6,
              border: `1px solid ${form[field] === i + 1 ? 'rgba(129,140,248,0.6)' : 'rgba(255,255,255,0.1)'}`,
              background: form[field] === i + 1 ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.03)',
              color: form[field] === i + 1 ? '#818cf8' : '#64748b',
              fontSize: 10, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.12s',
            }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function FeedbackForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    overallRating: 0, accuracyRating: 0, usabilityRating: 0, recommendRating: 0,
    insightUseful: 0, changedBehavior: 0, trustsAI: 0, easyToUse: 0, wouldRecommend: 0,
    bestFeature: '', improvementArea: '', sleepImpact: '', additionalComments: '',
    occupation: '', sleepIssuesBefore: '', usageDuration: '', heardFrom: '',
    consentResearch: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (form.overallRating === 0) { setError('Please provide an overall rating.'); return; }
    setLoading(true); setError('');
    try {
      await submitFeedback({ ...form, username: user?.username || user?.email, submittedAt: new Date().toISOString() });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || 'Could not submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <div className="card profile-card-wide" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 300, gap: 14, textAlign: 'center'
    }}>
      <div style={{ fontSize: 52 }}>🌙</div>
      <div className="section-title">Thank you for your feedback!</div>
      <div className="section-sub" style={{ maxWidth: 420 }}>
        Your responses help improve the Sleep AI system and will contribute to ongoing sleep research.
      </div>
      <div className="insight-badge badge-good" style={{ marginTop: 6 }}>✓ Feedback recorded</div>
    </div>
  );

  return (
    <div className="card profile-card-wide">
      <div style={{ marginBottom: 14 }}>
        <div className="section-title">📋 Share Your Feedback</div>
        <div className="section-sub">Help improve the system · Support sleep research</div>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: 10 }}>⚠️ {error}</div>}

      {/* ── 3-column grid: ratings | open-ended | demographics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* COL 1 — Ratings + Likert */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="profile-section-label" style={{ marginBottom: 6 }}>Star Ratings</div>

          <StarRating label="Overall experience *" value={form.overallRating}   onChange={v => set('overallRating', v)} />
          <StarRating label="AI insight accuracy"  value={form.accuracyRating}  onChange={v => set('accuracyRating', v)} />
          <StarRating label="Ease of use"           value={form.usabilityRating} onChange={v => set('usabilityRating', v)} />
          <StarRating label="Likely to recommend"   value={form.recommendRating} onChange={v => set('recommendRating', v)} />

          <div className="profile-section-label" style={{ marginTop: 10, marginBottom: 6 }}>
            Research Scale &nbsp;<span style={{ fontWeight: 400, textTransform: 'none', fontSize: 10 }}>(SD · D · N · A · SA)</span>
          </div>

          <LikertRow label="Sleep insights were useful"        field="insightUseful"   form={form} setForm={setForm} />
          <LikertRow label="App changed my sleep habits"       field="changedBehavior" form={form} setForm={setForm} />
          <LikertRow label="I trust the AI recommendations"    field="trustsAI"        form={form} setForm={setForm} />
          <LikertRow label="App is easy to understand"         field="easyToUse"       form={form} setForm={setForm} />
          <LikertRow label="I would recommend this to others"  field="wouldRecommend"  form={form} setForm={setForm} />
        </div>

        {/* COL 2 — Open-ended */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="profile-section-label" style={{ marginBottom: 6 }}>Your Experience</div>

          <div className="form-group">
            <label className="form-label">What did you like most?</label>
            <textarea className="form-input" rows={3}
              placeholder="e.g. The AI suggestions were very personalised…"
              value={form.bestFeature} onChange={e => set('bestFeature', e.target.value)}
              style={{ resize: 'none', fontSize: 13 }} />
          </div>

          <div className="form-group">
            <label className="form-label">What could be improved?</label>
            <textarea className="form-input" rows={3}
              placeholder="e.g. More detailed sleep stage breakdowns…"
              value={form.improvementArea} onChange={e => set('improvementArea', e.target.value)}
              style={{ resize: 'none', fontSize: 13 }} />
          </div>

          <div className="form-group">
            <label className="form-label">How has this app affected your sleep?</label>
            <textarea className="form-input" rows={3}
              placeholder="e.g. I now fall asleep 30 min faster…"
              value={form.sleepImpact} onChange={e => set('sleepImpact', e.target.value)}
              style={{ resize: 'none', fontSize: 13 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Additional comments</label>
            <textarea className="form-input" rows={2}
              placeholder="Anything else you'd like us to know…"
              value={form.additionalComments} onChange={e => set('additionalComments', e.target.value)}
              style={{ resize: 'none', fontSize: 13 }} />
          </div>
        </div>

        {/* COL 3 — Demographics + Submit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="profile-section-label" style={{ marginBottom: 6 }}>Demographics (Research)</div>

          <div className="form-group">
            <label className="form-label">Occupation / field</label>
            <input className="form-input" placeholder="e.g. Student, Engineer"
              value={form.occupation} onChange={e => set('occupation', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">How long have you used this app?</label>
            <select className="form-select" value={form.usageDuration} onChange={e => set('usageDuration', e.target.value)}>
              <option value="">Select</option>
              <option>Less than a week</option>
              <option>1–2 weeks</option>
              <option>1 month</option>
              <option>2–3 months</option>
              <option>3+ months</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Sleep issues before using app?</label>
            <select className="form-select" value={form.sleepIssuesBefore} onChange={e => set('sleepIssuesBefore', e.target.value)}>
              <option value="">Select</option>
              <option>Yes, diagnosed</option>
              <option>Yes, self-reported</option>
              <option>Mild issues</option>
              <option>No issues</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">How did you hear about us?</label>
            <select className="form-select" value={form.heardFrom} onChange={e => set('heardFrom', e.target.value)}>
              <option value="">Select</option>
              <option>Social media</option>
              <option>Friend / colleague</option>
              <option>Academic / research</option>
              <option>Search engine</option>
              <option>Other</option>
            </select>
          </div>

          {/* Consent */}
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            cursor: 'pointer', fontSize: 12, color: '#94a3b8',
            background: 'rgba(129,140,248,0.05)',
            border: '1px solid rgba(129,140,248,0.15)',
            borderRadius: 10, padding: '10px 12px', marginTop: 4,
          }}>
            <input type="checkbox" checked={form.consentResearch}
              onChange={e => set('consentResearch', e.target.checked)}
              style={{ marginTop: 2, accentColor: '#818cf8', width: 15, height: 15, flexShrink: 0 }} />
            I consent to my anonymised responses being used for sleep research and academic publication.
          </label>

          <button className="btn-primary btn-full"
            style={{ marginTop: 'auto', paddingTop: 13, paddingBottom: 13 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '⏳ Submitting…' : 'Submit Feedback →'}
          </button>
        </div>
      </div>
    </div>
  );
}