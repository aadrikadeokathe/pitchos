import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Analysis from './pages/Analysis';
import QA from './pages/QA';
import Report from './pages/Report';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  return user ? children : <Navigate to="/auth" replace />;
};

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"           element={<Landing />} />
        <Route path="/auth"       element={<Auth />} />
        <Route path="/dashboard"  element={<Protected><Dashboard /></Protected>} />
        <Route path="/upload"     element={<Protected><Upload /></Protected>} />
        <Route path="/analysis/:sessionId" element={<Protected><Analysis /></Protected>} />
        <Route path="/qa/:sessionId"       element={<Protected><QA /></Protected>} />
        <Route path="/report/:sessionId"   element={<Protected><Report /></Protected>} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
