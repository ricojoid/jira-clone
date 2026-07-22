import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #eef2ff', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar} />

      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflow: 'hidden' }}>
        <TopBar />
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px 32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
