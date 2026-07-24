import { useState, useEffect, useCallback } from 'react';
import { UserPlus, UserMinus, Users, Shield, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectApi, userApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

export default function ManageProjectMembersModal({
  open,
  onClose,
  projectId,
  onMembersUpdated,
}) {
  const { user, isPM, isSuperAdmin } = useAuth();

  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form to add member
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const fetchMembersAndUsers = useCallback(async () => {
    if (!open || !projectId) return;
    try {
      setLoading(true);
      const [projRes, membersRes, usersRes] = await Promise.all([
        projectApi.get(projectId).catch(() => ({ data: null })),
        projectApi.listMembers(projectId).catch(() => ({ data: [] })),
        userApi.list().catch(() => ({ data: [] })),
      ]);

      setProject(projRes.data);
      const memList = membersRes.data || [];
      setMembers(memList);

      const systemUsers = usersRes.data || [];
      setAllUsers(systemUsers);
    } catch (err) {
      console.error('Failed to load project members:', err);
      toast.error('Failed to load project members');
    } finally {
      setLoading(false);
    }
  }, [open, projectId]);

  useEffect(() => {
    fetchMembersAndUsers();
  }, [fetchMembersAndUsers]);

  const existingUserIds = new Set(
    members.map((m) => (m.user?.id || m.user_id || m.id))
  );

  // Filter out system users who are already members or are super admins
  const availableUsers = allUsers.filter(
    (u) =>
      !existingUserIds.has(u.id || u._id) &&
      !['super_admin', 'super admin', 'superadmin', 'admin'].includes(
        (u.role || '').toLowerCase()
      )
  );

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user to add');
      return;
    }

    try {
      setAdding(true);
      await projectApi.addMember(projectId, {
        user_id: Number(selectedUserId),
        role: selectedRole,
      });

      toast.success('Member assigned to project successfully!');
      setSelectedUserId('');
      setSelectedRole('member');
      fetchMembersAndUsers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      console.error('Failed to add member:', err);
      toast.error(err.response?.data?.detail || 'Failed to add member to project');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      setRemovingId(targetUserId);
      await projectApi.removeMember(projectId, targetUserId);
      toast.success('Member removed from project');
      fetchMembersAndUsers();
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  if (!open) return null;

  const isProjectOwnerOrAdmin =
    isSuperAdmin ||
    isPM ||
    (project && (user?.id === project.owner_id || user?._id === project.owner_id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={22} color="var(--primary)" />
          <span>Project Members - {project?.name || 'Management'}</span>
        </div>
      }
      maxWidth="680px"
    >
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading members list...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 1: Add New Member Form */}
          {isProjectOwnerOrAdmin && (
            <div
              className="card"
              style={{
                padding: 20,
                backgroundColor: 'var(--bg-app)',
                border: '1px dashed var(--primary-border)',
              }}
            >
              <h4
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <UserPlus size={18} color="var(--primary)" />
                Assign New Member to Project
              </h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <select
                  className="form-select"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- Select User to Assign --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id || u._id} value={u.id || u._id}>
                      {u.full_name || u.username || u.name} ({u.email})
                    </option>
                  ))}
                </select>

                <select
                  className="form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin / PM</option>
                  <option value="viewer">Viewer</option>
                </select>

                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={handleAddMember}
                  disabled={adding || !selectedUserId}
                >
                  {adding ? 'Assigning...' : 'Assign'}
                </Button>
              </div>

              {availableUsers.length === 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  All registered users are already members of this project.
                </div>
              )}
            </div>
          )}

          {/* Section 2: Current Members List */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                Assigned Members ({members.length})
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Only assigned members can view tasks & get tagged in comments
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map((mem) => {
                const memberUser = mem.user || mem;
                const memberUserId = memberUser.id || memberUser.user_id || mem.user_id;
                const isOwner = project && project.owner_id === memberUserId;

                return (
                  <div
                    key={mem.id || memberUserId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar
                        name={memberUser.full_name || memberUser.username || memberUser.name}
                        src={memberUser.avatar_url || memberUser.avatar}
                        size={36}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                            {memberUser.full_name || memberUser.username || memberUser.name || 'Member'}
                          </span>
                          {isOwner && (
                            <span
                              className="badge"
                              style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.68rem', fontWeight: 800 }}
                            >
                              PROJECT OWNER
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          @{memberUser.username || 'user'} &middot; {memberUser.email || ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        className="badge"
                        style={{
                          backgroundColor:
                            mem.role === 'admin' ? 'var(--primary-light)' : 'var(--bg-subtle)',
                          color: mem.role === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
                          textTransform: 'capitalize',
                        }}
                      >
                        {mem.role || 'member'}
                      </span>

                      {isProjectOwnerOrAdmin && !isOwner && memberUserId !== user?.id && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(memberUserId)}
                          disabled={removingId === memberUserId}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            padding: 6,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          className="card-hover"
                          title="Remove from project"
                        >
                          <UserMinus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
