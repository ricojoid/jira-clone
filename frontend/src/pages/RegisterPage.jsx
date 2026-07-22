import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
        padding: '24px 16px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 460,
          padding: 36,
          boxShadow: 'var(--shadow-xl)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 22,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              boxShadow: '0 8px 18px rgba(99, 102, 241, 0.35)',
            }}
          >
            JC
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Create an Account
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Join Jira Clone to manage your agile workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                className="form-input"
                type="text"
                name="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                style={{ paddingLeft: 40 }}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              name="username"
              placeholder="johndoe"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                style={{ paddingLeft: 40 }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Role</label>
            <select className="form-select" name="role" value={formData.role} onChange={handleChange}>
              <option value="pm">Project Manager (PM) - Full Access</option>
              <option value="member">Team Member</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                style={{ paddingLeft: 40, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
              <input
                className="form-input"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{ paddingLeft: 40, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: 0 }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'Creating Account...' : 'Register'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
