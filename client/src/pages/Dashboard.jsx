import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllSessions } from '../api';
import { useAuth } from '../context/AuthContext';
import { Plus, Clock, CheckCircle, BarChart2, ArrowRight, FileText } from 'lucide-react';

const statusLabel = { ANALYZING:'Analyzing',QA_PENDING:'Ready for QA',QA_IN_PROGRESS:'In Progress',COMPLETE:'Complete' };
const statusColor = { ANALYZING:'var(--yellow)',QA_PENDING:'var(--accent-hi)',QA_IN_PROGRESS:'var(--orange)',COMPLETE:'var(--green)' };

function ScoreRing({ score }) {
  const pct = ((score || 0) / 5) * 100;
  const r = 22, c = 2 * Math.PI * r;
  const clr = score >= 4 ? 'var(--green)' : score >= 3 ? 'var(--yellow)' : 'var(--red)';
  return (
    <svg width="56" height="56" style={{ flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={clr} strokeWidth="3"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x="28" y="33" textAnchor="middle" fill={clr} fontSize="12" fontWeight="700" fontFamily="Inter">{score ? score.toFixed(1) : '—'}</text>
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllSessions().then((r) => setSessions(r.data.sessions)).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 style={{ marginBottom: 4 }}>Your Decks</h2>
            <p className="text-muted text-sm">{user?.email}</p>
          </div>
          <Link to="/upload" className="btn btn-primary">
            <Plus size={16} /> New Deck
          </Link>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px 32px' }}>
            <FileText size={40} style={{ color: 'var(--text-dim)', margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: 8 }}>No decks yet</h3>
            <p style={{ marginBottom: 24 }}>Upload your first pitch deck to get started.</p>
            <Link to="/upload" className="btn btn-primary">Upload Deck</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map((s) => (
              <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <ScoreRing score={s.overallScore} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{s.deckName}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusColor[s.status], background: `${statusColor[s.status]}18`, padding: '2px 8px', borderRadius: 999, border: `1px solid ${statusColor[s.status]}30` }}>
                      {statusLabel[s.status]}
                    </span>
                  </div>
                  <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                    <span className="text-xs text-muted flex items-center gap-1"><FileText size={11} /> {s._count?.slides || 0} slides</span>
                    <span className="text-xs text-muted flex items-center gap-1"><Clock size={11} /> {new Date(s.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {s.status === 'QA_PENDING' || s.status === 'QA_IN_PROGRESS' ? (
                    <Link to={`/qa/${s.id}`} className="btn btn-primary btn-sm">Continue QA <ArrowRight size={13} /></Link>
                  ) : s.status === 'COMPLETE' ? (
                    <Link to={`/report/${s.id}`} className="btn btn-ghost btn-sm"><BarChart2 size={13} /> Report</Link>
                  ) : (
                    <Link to={`/analysis/${s.id}`} className="btn btn-ghost btn-sm">View <ArrowRight size={13} /></Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
