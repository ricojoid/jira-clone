import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import AuthHero from '../components/auth/AuthHero';

const formStagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'pm',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (
      !formData.fullName.trim() ||
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      !formData.confirmPassword.trim()
    ) {
      toast.error('Silakan isi semua bidang');
      return false;
    }

    if (formData.fullName.trim().length < 2) {
      toast.error('Nama lengkap minimal 2 karakter');
      return false;
    }

    if (formData.username.trim().length < 3) {
      toast.error('Username minimal 3 karakter');
      return false;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      toast.error('Username hanya boleh berupa huruf, angka, dan garis bawah');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Masukkan alamat email yang valid');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        full_name: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        role: formData.role,
        password: formData.password,
      });
      toast.success('Akun berhasil dibuat!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Pendaftaran gagal. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* Left Visual Panel - Animated product illustration */}
      <AuthHero
        title="Join the Jired"
        highlight="workspace today."
        subtitle="Collaborate on backlog management, monitor sprint velocity, and track task deadlines effortlessly."
      />

      {/* Right Form Panel */}
      <div
        className="auth-form-panel"
        style={{
          flex: 0.9,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          backgroundColor: 'var(--bg-surface)',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        <motion.div
          initial="hidden"
          animate="show"
          variants={formStagger}
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Header Mobile Brand & Title */}
          <motion.div variants={fadeUp}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="auth-logo-tile">
                <img src="/Logo.png" alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              </span>
              <span style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                Jired
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Create an Account
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Join Jired to start managing your agile workspace
            </p>
          </motion.div>

          <motion.form variants={fadeUp} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Full Name</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  className="form-input"
                  type="text"
                  name="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  style={{ paddingLeft: 38, height: 38 }}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Username</label>
              <input
                className="form-input"
                type="text"
                name="username"
                placeholder="johndoe"
                value={formData.username}
                onChange={handleChange}
                style={{ height: 38 }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Email Address</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: 38, height: 38 }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Initial Role</label>
              <select className="form-select" name="role" value={formData.role} onChange={handleChange} style={{ height: 38, fontSize: '0.85rem' }}>
                <option value="pm">Project Manager (PM) - Full Access</option>
                <option value="member">Team Member</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Password</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: 38, paddingRight: 38, height: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem' }}>Confirm Password</label>
              <div className="input-icon-wrap" style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
                <input
                  className="form-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{ paddingLeft: 38, paddingRight: 38, height: 38 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 0 }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', marginTop: 6, height: 42, fontSize: '0.9rem', fontWeight: 700 }}>
              {loading && <span className="btn-spinner" />}
              {loading ? 'Creating Account...' : 'Register'}
            </Button>
          </motion.form>

          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginTop: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Sign In
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
