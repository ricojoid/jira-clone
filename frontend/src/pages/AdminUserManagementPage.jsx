import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  UserPlus,
  KeyRound,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';

export default function AdminUserManagementPage() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Register Modal State
  const [registerOpen, setRegisterOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'member',
    password: '',
  });

  // Reset Password Modal State
  const [resetOpen, setResetOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // Delete User Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      setLoading(true);
      const res = await adminApi.listUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error(err?.response?.data?.detail || 'Failed to load user management list');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Check Access Restriction
  if (!isSuperAdmin) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: '60px auto',
          textAlign: 'center',
        }}
      >
        <div
          className="card"
          style={{
            padding: 40,
            borderLeft: '5px solid #dc2626',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
            Access Restricted (403 Forbidden)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8, marginBottom: 24, lineHeight: 1.5 }}>
            This page is strictly reserved for users with the <strong>Super Admin</strong> role. You do not have permission to manage accounts.
          </p>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Handle User Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!registerForm.fullName.trim() || !registerForm.username.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      toast.error('Please complete all required fields');
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setCreating(true);
      await adminApi.createUser({
        full_name: registerForm.fullName.trim(),
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        role: registerForm.role,
        password: registerForm.password,
      });

      toast.success(`Account created for @${registerForm.username}`);
      setRegisterOpen(false);
      setRegisterForm({ fullName: '', username: '', email: '', role: 'member', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to create user account');
    } finally {
      setCreating(false);
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApi.updateRole(userId, newRole);
      toast.success('User role updated successfully');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update user role');
    }
  };

  // Handle Password Reset
  const handleOpenReset = (user) => {
    setTargetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setResetOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setResetting(true);
      await adminApi.resetPassword(targetUser.id, newPassword);
      toast.success(`Password reset for @${targetUser.username}`);
      setResetOpen(false);
      setTargetUser(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  // Handle Active Status Toggle
  const handleToggleStatus = async (user) => {
    const nextStatus = !user.is_active;
    try {
      await adminApi.updateStatus(user.id, nextStatus);
      toast.success(`Account ${nextStatus ? 'activated' : 'deactivated'}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: nextStatus } : u))
      );
    } catch (err) {
      toast.error('Failed to update account status');
    }
  };

  // Handle User Deletion
  const handleOpenDelete = (user) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    setDeletingUser(user);
    setDeleteOpen(true);
  };

  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    try {
      setDeleting(true);
      await adminApi.deleteUser(deletingUser.id);
      toast.success(`User @${deletingUser.username} deleted successfully`);
      setDeleteOpen(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeStyle = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'super_admin':
        return { bg: '#dc2626', color: '#ffffff', border: '#b91c1c', label: 'Super Admin' };
      case 'pm':
        return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Project Manager' };
      default:
        return { bg: '#f4f4f5', color: '#71717a', border: '#e4e4e7', label: 'Member' };
    }
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={24} color="#dc2626" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' }}>
              Super Admin User Console
            </h2>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Register new user accounts, update security roles, reset forgotten passwords, and manage accounts.
          </p>
        </div>

        <Button variant="primary" icon={UserPlus} onClick={() => setRegisterOpen(true)}>
          Register New Account
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ position: 'relative', width: 320 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            className="form-input"
            placeholder="Search users by name, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, height: 36 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span>Total Registered Users: <strong style={{ color: 'var(--text-main)' }}>{users.length}</strong></span>
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchUsers}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Users Management Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading user accounts...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          No user accounts found matching your query.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>User</th>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>Email Address</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, minWidth: 180 }}>Assigned Role</th>
                <th style={{ padding: '12px 16px', fontWeight: 800 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 800, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const badge = getRoleBadgeStyle(u.role);
                const isSelf = u.id === currentUser?.id;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={u.full_name || u.username} src={u.avatar_url} size={36} />
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                            {u.full_name} {isSelf && <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 800 }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', color: 'var(--text-body)', fontWeight: 500 }}>
                      {u.email}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <select
                        className="form-select"
                        value={u.role || 'member'}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        style={{
                          width: '100%',
                          minWidth: 170,
                          height: 34,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          paddingLeft: 12,
                          paddingRight: 28,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          borderColor: badge.border,
                          borderRadius: 8,
                        }}
                      >
                        <option value="super_admin" style={{ backgroundColor: '#ffffff', color: '#18181b' }}>Super Admin</option>
                        <option value="pm" style={{ backgroundColor: '#ffffff', color: '#18181b' }}>Project Manager</option>
                        <option value="member" style={{ backgroundColor: '#ffffff', color: '#18181b' }}>Member</option>
                      </select>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: u.is_active ? '#16a34a' : '#71717a',
                        }}
                      >
                        {u.is_active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={KeyRound}
                          onClick={() => handleOpenReset(u)}
                        >
                          Reset Password
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => handleOpenDelete(u)}
                          disabled={isSelf}
                          title={isSelf ? 'Cannot delete your own account' : 'Delete user account'}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Register User Modal */}
      <Modal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        title="Register New User Account"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRegisterOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRegisterSubmit} disabled={creating}>
              {creating ? 'Creating Account...' : 'Register User'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Jane Doe"
              value={registerForm.fullName}
              onChange={(e) => setRegisterForm((p) => ({ ...p, fullName: e.target.value }))}
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                className="form-input"
                type="text"
                placeholder="janedoe"
                value={registerForm.username}
                onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                className="form-input"
                type="email"
                placeholder="jane@company.com"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assign Role *</label>
            <select
              className="form-select"
              value={registerForm.role}
              onChange={(e) => setRegisterForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="member">Member (Standard Team Member)</option>
              <option value="pm">Project Manager (PM - Full Workspace Access)</option>
              <option value="super_admin">Super Admin (System Management Privileges)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Initial Password *</label>
            <input
              className="form-input"
              type="password"
              placeholder="At least 6 characters"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={`Reset Password for @${targetUser?.username}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleResetPasswordSubmit}
              disabled={resetting || !newPassword || newPassword !== confirmPassword}
            >
              {resetting ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Enter a new password for user <strong>{targetUser?.full_name}</strong> (@{targetUser?.username}). The user will immediately be able to log in with this new password.
          </p>

          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password *</label>
            <input
              className="form-input"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete User Account @${deletingUser?.username}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSubmit} disabled={deleting}>
              {deleting ? 'Deleting User...' : 'Delete User'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Are you sure you want to permanently delete the account for <strong>{deletingUser?.full_name}</strong> (@{deletingUser?.username})?
          This action cannot be undone and will detach all associated task assignments.
        </p>
      </Modal>
    </div>
  );
}
