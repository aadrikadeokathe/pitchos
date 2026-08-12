import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport } from '../api';
import { Trophy, AlertTriangle, CheckCircle, ArrowUpRight, LayoutDashboard, Printer } from 'lucide-react';

const scoreColor = (s) => s >= 4 ? 'var(--green)' : s >= 3 ? 'var(--yellow)' : s >= 2 ? 'var(--orange)' : 'var(--red)';

const AREA_NAMES = {
  PROBLEM:'Problem Clarity', MARKET:'Market Sizing', SOLUTION:'Solution Differentiation',
  BUSINESS_MODEL:'Revenue Logic', GTM:'Go-To-Market', TRACTION:'Traction & Validation',
  TEAM:'Team-Market Fit', COMPETITION:'Competitive Moat', ASK:'The Ask',
};

export default function Report() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReport(sessionId).then((r) => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!data) return <div className="page"><div className="container"><p className="text-muted">Report not found.</p></div></div>;

  const actions = data.report?.priorityActions || [];
  const score = data.overallScore;

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Hero Score */}
        <div className="card card-glow mb-6" style={{ textAlign: 'center', padding: '48px 32px', background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(79,70,229,0.05))' }}>
          <Trophy size={40} style={{ color: score >= 4 ? 'var(--green)' : score >= 3 ? 'var(--yellow)' : 'var(--orange)', margin: '0 auto 16px' }} />
          <div style={{ fontSize: '4rem', fontWeight: 900, color: scoreColor(score), fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{score?.toFixed(1)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 20 }}>Overall Deck Score / 5.0</div>
          <h2 style={{ marginBottom: 8 }}>{data.deckName}</h2>
          <p className="text-sm text-muted">Completed {new Date(data.createdAt).toLocaleDateString()}</p>
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => window.print()} className="btn btn-ghost btn-sm"><Printer size={14} /> Export PDF</button>
            <Link to="/dashboard" className="btn btn-ghost btn-sm"><LayoutDashboard size={14} /> Dashboard</Link>
          </div>
        </div>

        {/* Priority Actions */}
        {actions.length > 0 && (
          <div className="mb-6">
            <h3 style={{ marginBottom: 16 }}>Priority Action List</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actions.map((action, i) => (
                <div key={i} className="card" style={{ display: 'flex', gap: 16, padding: '20px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? 'rgba(239,68,68,0.12)' : i === 1 ? 'rgba(249,115,22,0.12)' : 'rgba(234,179,8,0.1)', border: `1px solid ${i === 0 ? 'rgba(239,68,68,0.3)' : i === 1 ? 'rgba(249,115,22,0.3)' : 'rgba(234,179,8,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', color: i === 0 ? 'var(--red)' : i === 1 ? 'var(--orange)' : 'var(--yellow)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <span style={{ fontWeight: 600 }}>{action.action}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 999 }}>{action.area}</span>
                    </div>
                    <p className="text-sm text-muted">{action.why}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage Summary */}
        <div className="mb-6">
          <h3 style={{ marginBottom: 16 }}>Area Coverage Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {data.qaAreas?.map((area) => (
              <div key={area.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {area.status === 'COVERED'
                  ? <CheckCircle size={16} color="var(--green)" />
                  : <AlertTriangle size={16} color="var(--orange)" />}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{area.areaName || AREA_NAMES[area.areaId] || area.areaId}</div>
                  <div style={{ fontSize: '0.7rem', color: area.status === 'COVERED' ? 'var(--green)' : 'var(--orange)' }}>{area.questionsAsked} question{area.questionsAsked !== 1 ? 's' : ''} · {area.status.replace('_', ' ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slide Breakdown */}
        <div className="mb-6">
          <h3 style={{ marginBottom: 16 }}>Slide-by-Slide Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.slides?.map((slide) => (
              <div key={slide.id} className="card" style={{ display: 'flex', gap: 14, padding: '16px 20px' }}>
                <div className={`score-badge score-${Math.round(slide.analysis?.score || 3)}`} style={{ flexShrink: 0 }}>
                  {slide.analysis?.score}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex gap-2 items-center mb-2">
                    <span style={{ fontWeight: 600 }}>{slide.title}</span>
                    <span className={`verdict-chip verdict-${slide.analysis?.verdict}`}>{slide.analysis?.verdict}</span>
                  </div>
                  {slide.analysis?.suggestions?.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {slide.analysis.suggestions.map((s, i) => <div key={i} style={{ marginTop: 3 }}>→ {s}</div>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload new version CTA */}
        <div className="card" style={{ textAlign: 'center', padding: '32px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginBottom: 8 }}>Ready for v2?</h3>
          <p className="text-muted mb-4">Apply the fixes above and upload your improved deck to track your progress.</p>
          <Link to="/upload" className="btn btn-primary"><ArrowUpRight size={16} /> Upload Next Version</Link>
        </div>
      </div>
    </div>
  );
}
