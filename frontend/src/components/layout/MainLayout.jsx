import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleToggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
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
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 140,
          }}
          className="mobile-show"
        />
      )}

      {/* Sidebar Container */}
      <div
        className={mobileMenuOpen ? 'mobile-drawer-open' : ''}
        style={{
          zIndex: 150,
        }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
      </div>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
        <TopBar onMobileMenuToggle={handleToggleMobileMenu} />
        <div
          style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column' }}
          className="app-container"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
