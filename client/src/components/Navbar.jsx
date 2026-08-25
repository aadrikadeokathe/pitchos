import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Upload } from 'lucide-react';

export default function Navbar() {
  const { user, loginDemo, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };
  const handleDemo = async () => {
    await loginDemo();
    navigate('/dashboard');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={user ? '/dashboard' : '/'} className="navbar-logo">PitchOS</Link>
        <div className="navbar-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="btn btn-ghost btn-sm">
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <Link to="/upload" className="btn btn-primary btn-sm">
                <Upload size={14} /> New Deck
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
                <LogOut size={14} />
              </button>
            </>
          ) : (
            <>
              <button onClick={handleDemo} className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-hi)', border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)' }}>
                ⚡ Demo Mode
              </button>
              <Link to="/auth" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/auth?mode=register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
