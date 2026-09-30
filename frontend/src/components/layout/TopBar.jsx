import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Menu } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import NotificationBell from './NotificationBell';

export default function TopBar({ onMobileMenuToggle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    if (logout) logout();
    navigate('/login');
  };

  const handleProfile = () => {
    setMenuOpen(false);
    navigate('/settings');
  };

  return (
    <header
      className="topbar-glass"
      style={{
        height: 60,
        minHeight: 60,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      {/* Left: Mobile Menu Toggle Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onMobileMenuToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            color: 'var(--text-main)',
            display: 'flex',
            alignItems: 'center',
          }}
          className="mobile-show icon-btn"
          title="Toggle Navigation Menu"
        >
          <Menu size={22} color="var(--primary)" />
        </button>
        <div className="mobile-show" style={{ alignItems: 'center', gap: 8 }}>
          <img src="/Logo.png" alt="Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Jired
          </span>
        </div>
      </div>

      {/* Actions & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <NotificationBell />

        {/* User Menu Dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <Avatar name={user?.full_name || user?.username || user?.name} src={user?.avatar_url || user?.avatar} size={34} />
          </button>

          <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="card popover-surface"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 44,
                width: 220,
                padding: '8px 0',
                zIndex: 200,
                boxShadow: 'var(--shadow-xl)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  {user?.full_name || user?.username || user?.name || 'User'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {user?.email || ''}
                </div>
              </div>

              <div style={{ padding: '4px 0' }}>
                <button
                  className="btn btn-ghost"
                  onClick={handleProfile}
                  style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 16px' }}
                >
                  <Settings size={16} />
                  Settings
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    borderRadius: 0,
                    padding: '8px 16px',
                    color: '#dc2626',
                  }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
