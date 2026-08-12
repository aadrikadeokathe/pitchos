import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAnalysis } from '../api';
import { ArrowRight, ChevronDown, ChevronUp, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';

const scoreColor = (s) => s >= 4 ? 'var(--green)' : s >= 3 ? 'var(--yellow)' : 'var(--red)';

function SlideCard({ slide, index }) {
  const [open, setOpen] = useState(index === 0);
  const a = slide.analysis;
  if (!a) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
        <div className={`score-badge score-${Math.round(a.score)}`} style={{ flexShrink: 0 }}>{a.score}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{slide.title}</span>
            <span className={`verdict-chip verdict-${a.verdict}`}>{a.verdict}</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.slideType}</span>
        </div>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
          {/* Issues */}
          {a.issues?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div className="flex gap-2 items-center mb-2">
                <AlertTriangle size={14} color="var(--orange)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issues Found</span>
              </div>
              {a.issues.map((issue, i) => (
                <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '6px 0 6px 18px', borderLeft: '2px solid rgba(249,115,22,0.3)' }}>
                  {issue}
                </div>
              ))}
            </div>
          )}
          {/* Suggestions */}
          {a.suggestions?.length > 0 && (
            <div>
              <div className="flex gap-2 items-center mb-2">
                <Lightbulb size={14} color="var(--accent-hi)" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-hi)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions</span>
              </div>
              {a.suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '6px 0 6px 18px', borderLeft: '2px solid rgba(124,58,237,0.3)' }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analysis() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAnalysis(sessionId).then((r) => setSession(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="page"><div className="container" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}</div></div>;
  if (!session) return <div className="page"><div className="container"><p className="text-muted">Session not found.</p></div></div>;

  const score = session.overallScore;
  const covered = session.qaAreas?.filter((a) => a.status === 'COVERED').length || 0;
  const total = session.qaAreas?.length || 9;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div className="card card-glow mb-6" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: scoreColor(score), lineHeight: 1 }}>{score?.toFixed(1)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>/ 5.0</div>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 4 }}>{session.deckName}</h2>
            <p className="text-sm text-muted mb-4">{session.slides?.length} slides analyzed · {covered}/{total} areas auto-covered</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(covered / total) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* QA Areas Summary */}
        <div className="card mb-6">
          <p className="label mb-4">Coverage Areas</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {session.qaAreas?.map((area) => (
              <div key={area.id} className="flex gap-2 items-center" style={{ padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div className={`area-dot area-${area.status}`} />
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: area.status === 'COVERED' ? 'var(--green)' : 'var(--text-muted)' }}>
                  {area.areaName || area.areaId}
                </span>
                {area.status === 'COVERED' && <CheckCircle size={12} color="var(--green)" style={{ marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Slide Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {session.slides?.map((slide, i) => <SlideCard key={slide.id} slide={slide} index={i} />)}
        </div>

        {/* CTA */}
        <div className="mt-8" style={{ textAlign: 'center' }}>
          {session.status === 'QA_PENDING' || session.status === 'QA_IN_PROGRESS' ? (
            <Link to={`/qa/${sessionId}`} className="btn btn-primary btn-lg">
              Start the Grilling Session <ArrowRight size={18} />
            </Link>
          ) : session.status === 'COMPLETE' ? (
            <Link to={`/report/${sessionId}`} className="btn btn-primary btn-lg">
              View Report <ArrowRight size={18} />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
