import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.identifier.trim() || !formData.password.trim()) {
      toast.error('Silakan isi username/email dan kata sandi');
      return;
    }

    setLoading(true);
    try {
      const userRes = await login(formData.identifier.trim(), formData.password);
      toast.success('Berhasil masuk!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      toast.error(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Login gagal. Silakan periksa kembali.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        fontFamily: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* Left Visual Panel - Vector Globe & PM Accents */}
      <div
        className="login-hero-panel"
        style={{
          flex: 1.1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          background: 'radial-gradient(circle at 20% 25%, rgba(220, 38, 38, 0.18) 0%, transparent 50%), radial-gradient(circle at 80% 75%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), #090d16',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Vector Background Overlay */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Brand Header */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/Logo.png"
            alt="Logo"
            style={{ width: 38, height: 38, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(220, 38, 38, 0.4))' }}
          />
          <div>
            <div style={{ fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.02em', color: '#ffffff' }}>
              Jired
            </div>
            <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, letterSpacing: '0.5px' }}>
              Project Management Platform
            </div>
          </div>
        </div>

        {/* Center Vector Globe & Interactive Accents */}
        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto', marginBottom: 'auto', padding: '24px 0' }}>
          {/* Vector Globe Container */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 440, margin: '0 auto', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Ambient Pulse Ring */}
            <div
              className="animate-pulse-glow"
              style={{
                position: 'absolute',
                width: '85%',
                height: '85%',
                borderRadius: '50%',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                boxShadow: '0 0 60px rgba(220, 38, 38, 0.2)',
              }}
            />

            {/* SVG Globe Illustration */}
            <svg viewBox="0 0 500 500" style={{ width: '90%', height: '90%', filter: 'drop-shadow(0 0 25px rgba(220, 38, 38, 0.25))' }}>
              {/* Spinning Outer Ring Group */}
              <g className="animate-spin-globe">
                <circle cx="250" cy="250" r="200" fill="none" stroke="rgba(220, 38, 38, 0.4)" strokeWidth="1.5" strokeDasharray="6 6" />
                <ellipse cx="250" cy="250" rx="200" ry="70" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.2" />
                <ellipse cx="250" cy="250" rx="70" ry="200" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.2" />
              </g>

              {/* Reverse Spinning Inner Ring Group */}
              <g className="animate-spin-globe-rev">
                <circle cx="250" cy="250" r="160" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
                <circle cx="250" cy="250" r="120" fill="none" stroke="rgba(220, 38, 38, 0.25)" strokeWidth="1" />
                <ellipse cx="250" cy="250" rx="200" ry="130" fill="none" stroke="rgba(220, 38, 38, 0.35)" strokeWidth="1.2" />
                <ellipse cx="250" cy="250" rx="130" ry="200" fill="none" stroke="rgba(220, 38, 38, 0.35)" strokeWidth="1.2" />
              </g>

              {/* Connecting Animated Task Flow Arcs */}
              <path className="animate-dash-flow" d="M 120 180 Q 250 100 380 180" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="8 8" />
              <path className="animate-dash-flow" d="M 90 290 Q 250 400 410 290" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="6 6" />

              {/* Node Points (Cities / Team Hubs) */}
              <g>
                <circle cx="120" cy="180" r="6" fill="#ef4444" />
                <circle className="animate-pulse-glow" cx="120" cy="180" r="12" fill="rgba(239, 68, 68, 0.35)" />

                <circle cx="380" cy="180" r="6" fill="#10b981" />
                <circle className="animate-pulse-glow" cx="380" cy="180" r="12" fill="rgba(16, 185, 129, 0.35)" />

                <circle cx="250" cy="250" r="8" fill="#ffffff" />
                <circle className="animate-pulse-glow" cx="250" cy="250" r="16" fill="rgba(255, 255, 255, 0.25)" />

                <circle cx="90" cy="290" r="6" fill="#6366f1" />
                <circle cx="410" cy="290" r="6" fill="#f59e0b" />
              </g>
            </svg>

            {/* Floating PM Widget 1: Active Sprint Card */}
            <div
              className="animate-float-slow"
              style={{
                position: 'absolute',
                top: '4%',
                right: '-4%',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 14,
                padding: '12px 16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(220, 38, 38, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 210,
                zIndex: 10,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(220, 38, 38, 0.18)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Active Sprint 14</div>
                <div style={{ fontSize: '0.825rem', color: '#ffffff', fontWeight: 800 }}>88% Completed</div>
                <div style={{ width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                  <div style={{ width: '88%', height: '100%', backgroundColor: '#ef4444', borderRadius: 2 }} />
                </div>
              </div>
            </div>

            {/* Floating PM Widget 2: Resolved Issues Badge */}
            <div
              className="animate-float-rev"
              style={{
                position: 'absolute',
                bottom: '8%',
                left: '-4%',
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                borderRadius: 14,
                padding: '12px 16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 20px rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                zIndex: 10,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(16, 185, 129, 0.18)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.825rem', color: '#ffffff', fontWeight: 800 }}>24 Tasks Resolved</div>
                <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>+18% Team Velocity</div>
              </div>
            </div>

          </div>

          {/* Headline Text */}
          <div style={{ textAlign: 'center', maxWidth: 460, margin: '24px auto 0' }}>
            <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              Streamline Global Agile Teams with Precision
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
              Manage backlog items, track sprint progress, and deliver project outcomes effortlessly.
            </p>
          </div>
        </div>

        {/* Hero Footer */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Enterprise Grade Security</span>
          </div>
          <div>&copy; 2026 Jired Platform</div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div
        style={{
          flex: 0.9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          backgroundColor: 'var(--bg-surface)',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {/* Header Mobile Brand & Title */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <img
                src="/Logo.png"
                alt="Logo"
                style={{ width: 34, height: 34, objectFit: 'contain' }}
              />
              <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                Jired
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Sign in with your Username or Email to access your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Username / Email</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  className="form-input"
                  type="text"
                  name="identifier"
                  placeholder="Enter your username or email"
                  value={formData.identifier}
                  onChange={handleChange}
                  style={{ paddingLeft: 40, height: 42 }}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-light)',
                  }}
                />
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: 40, paddingRight: 40, height: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-light)',
                    padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 8, height: 44, fontSize: '0.95rem', fontWeight: 700 }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Need an account? Contact your workspace Super Admin.
          </div>
        </div>
      </div>
    </div>
  );
}
