import { useState, useRef } from 'react';
import { User, Lock, Save, Shield, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authApi, userApi, getAttachmentUrl } from '../api';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';

export default function SettingsPage() {
  const { user, isSuperAdmin, isPM, updateUser } = useAuth();
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setUploadingAvatar(true);
      const res = await userApi.uploadAvatar(file);
      const updatedUser = res.data;
      setProfile((prev) => ({ ...prev, avatar_url: updatedUser.avatar_url }));
      if (updateUser) updateUser(updatedUser);
      toast.success('Profile picture updated!');
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      toast.error(err.response?.data?.detail || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      const res = await authApi.updateMe({ full_name: profile.full_name, avatar_url: profile.avatar_url });
      if (updateUser && res.data) updateUser(res.data);
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
  const avatarUrl = profile.avatar_url || user?.avatar_url || user?.avatar;

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
          <div style={{ position: 'relative' }}>
            <Avatar name={user?.full_name || user?.username} src={getAttachmentUrl(avatarUrl)} size={68} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: '2px solid #ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s ease',
              }}
              title="Change Profile Picture"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarFileSelect}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{user?.full_name || user?.username}</div>
              {uploadingAvatar && <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>Uploading...</span>}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>@{user?.username} &middot; {user?.email}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
              <span
                className="badge"
                style={{
                  backgroundColor: isSuperAdmin ? '#dc2626' : isPM ? 'var(--primary-light)' : 'var(--bg-subtle)',
                  color: isSuperAdmin ? '#ffffff' : isPM ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                Role: {roleText}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{ fontSize: '0.75rem', padding: '2px 8px', color: '#dc2626' }}
              >
                {uploadingAvatar ? 'Uploading Photo...' : 'Change Photo'}
              </button>
            </div>
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
