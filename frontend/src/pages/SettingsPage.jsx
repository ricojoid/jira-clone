import { useState } from 'react';
import { User, Lock, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';

export default function SettingsPage() {
  const { user, isSuperAdmin, isPM } = useAuth();
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({ full_name: profile.full_name, avatar_url: profile.avatar_url });
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      await authApi.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      toast.success('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const roleText = isSuperAdmin ? 'Super Admin' : isPM ? 'Project Manager (PM)' : 'Team Member';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Account Settings
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Manage your personal profile details and security settings.
        </p>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={20} color="var(--primary)" />
          User Profile
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border-light)' }}>
          <Avatar name={user?.full_name || user?.username} size={64} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user?.full_name || user?.username}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{user?.username} &middot; {user?.email}</div>
            <span
              className="badge"
              style={{
                backgroundColor: isSuperAdmin ? '#dc2626' : isPM ? 'var(--primary-light)' : 'var(--bg-subtle)',
                color: isSuperAdmin ? '#ffffff' : isPM ? 'var(--primary)' : 'var(--text-muted)',
                marginTop: 8,
              }}
            >
              Role: {roleText}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              className="form-input"
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Role (Managed by Super Admin)</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="text"
                disabled
                value={roleText}
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'not-allowed', fontWeight: 700 }}
              />
              <Shield size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              System roles can only be updated by a Super Admin via the User Console.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="primary" icon={Save} onClick={handleProfileSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={20} color="var(--primary)" />
          Security
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              className="form-input"
              type="password"
              value={passwords.current_password}
              onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                className="form-input"
                type="password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button
              variant="primary"
              onClick={handlePasswordChange}
              disabled={changingPassword || !passwords.current_password || !passwords.new_password || !passwords.confirm_password}
            >
              {changingPassword ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
