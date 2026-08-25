import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Zap, Target, MessageSquare, FileText, ChevronRight, Play } from 'lucide-react';

const features = [
  { icon: Zap,           title: 'AI Slide Segmentation',   desc: 'Gemini reads your full deck and intelligently identifies every slide — even messy PDFs.' },
  { icon: Target,        title: 'VC-Grade Analysis',        desc: 'Every slide scored on a rigorous rubric. Problem, Market, GTM, Traction — nothing escapes.' },
  { icon: MessageSquare, title: 'The Grilling Session',     desc: 'A coverage-area scoring system that won\'t let you off easy. All 9 areas must be addressed.' },
  { icon: FileText,      title: 'Priority Action Report',   desc: 'Walk away with a ranked list of exactly what to fix before your next investor meeting.' },
];

const areas = ['Problem Clarity','Market Sizing','Solution Differentiation','Revenue Logic','Go-To-Market','Traction & Validation','Team-Market Fit','Competitive Moat','The Ask'];

export default function Landing() {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    await loginDemo();
    navigate('/dashboard');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingTop: 60 }}>
      {/* Hero */}
      <section style={{ position: 'relative', padding: '100px 0 80px', textAlign: 'center', overflow: 'hidden' }}>
        <div className="hero-bg">
          <div className="hero-orb orb-1" />
          <div className="hero-orb orb-2" />
        </div>
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 999, padding: '6px 16px', marginBottom: 32 }}>
            <span style={{ width: 8, height: 8, background: 'var(--accent-hi)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-hi)', fontWeight: 600 }}>Built by a founder, for founders</span>
          </div>
          <h1 className="fade-up" style={{ animationDelay: '0.05s', marginBottom: 24 }}>
            Your pitch deck,<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>torn apart by AI</span>
          </h1>
          <p className="fade-up" style={{ animationDelay: '0.1s', fontSize: '1.15rem', maxWidth: 560, margin: '0 auto 40px', color: 'var(--text-muted)' }}>
            Upload your deck. Get grilled on every weak slide. Walk out with a structured report on exactly what to fix. Not a chatbot. A workflow.
          </p>
          <div className="fade-up flex items-center gap-3" style={{ animationDelay: '0.15s', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={handleDemoLogin} className="btn btn-primary btn-lg" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
              ⚡ 1-Click Demo Mode (For Interviewers)
            </button>
            <Link to="/auth?mode=register" className="btn btn-ghost btn-lg">
              Create Account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Area Coverage Marquee */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 0', overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 32, animation: 'marquee 20s linear infinite', width: 'max-content' }}>
          {[...areas, ...areas].map((a, i) => (
            <span key={i} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 4, height: 4, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} /> {a}
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* Features */}
      <section style={{ padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ marginBottom: 12 }}>Not a ChatGPT wrapper</h2>
            <p style={{ maxWidth: 480, margin: '0 auto' }}>PitchOS is a structured workflow with systematic coverage — the AI doesn't move on until you've actually addressed the gap.</p>
          </div>
          <div className="grid-2">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card" style={{ display: 'flex', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={20} color="var(--accent-hi)" />
                </div>
                <div>
                  <h3 style={{ marginBottom: 6 }}>{title}</h3>
                  <p style={{ fontSize: '0.9rem' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 0 100px' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="card card-glow" style={{ maxWidth: 600, margin: '0 auto', padding: '48px' }}>
            <h2 style={{ marginBottom: 16 }}>Ready to get grilled?</h2>
            <p style={{ marginBottom: 32 }}>Upload your deck and get a VC-grade breakdown in minutes. Free to start.</p>
            <Link to="/auth?mode=register" className="btn btn-primary btn-lg">
              Start Now <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
