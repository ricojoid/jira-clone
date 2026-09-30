import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function MainLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pageRef = useRef(null);

  // Visual-only page entrance on route change (WAAPI, no fill so no lingering transform)
  useEffect(() => {
    const el = pageRef.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const handleToggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="app-shell-main" style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', animation: 'spin 0.9s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite' }} />
          <img src="/Logo.png" alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </motion.div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>Loading workspace…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-shell-main" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 9, 11, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 140,
          }}
          className="mobile-show"
        />
      )}
      </AnimatePresence>

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
          <div ref={pageRef} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
