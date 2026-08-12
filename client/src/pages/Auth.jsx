import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../api';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function Auth() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { if (user) navigate('/dashboard'); }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fn = mode === 'register' ? register : login;
      const res = await fn(email, password);
      loginUser(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link to="/" className="navbar-logo" style={{ fontSize: '1.5rem', display: 'inline-block', marginBottom: 24 }}>PitchOS</Link>
          <h2 style={{ marginBottom: 8 }}>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
          <p>{mode === 'register' ? 'Start analyzing your deck in minutes.' : 'Sign in to your dashboard.'}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="auth-email"
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input" placeholder="you@startup.com"
                  style={{ paddingLeft: 42 }} required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="auth-password"
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input" placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
                  style={{ paddingLeft: 42 }} required
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                <AlertCircle size={15} color="var(--red)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--red)' }}>{error}</span>
              </div>
            )}

            <button id="auth-submit" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', marginTop: 4 }}>
              {loading ? <><div className="spinner" /> {mode === 'register' ? 'Creating account...' : 'Signing in...'}</> : <>{mode === 'register' ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
          <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-hi)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
            {mode === 'register' ? 'Sign In' : 'Register'}
          </button>
        </p>
      </div>
    </div>
  );
}
