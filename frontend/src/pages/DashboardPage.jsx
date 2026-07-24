import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Plus,
  TrendingUp,
  Activity,
  PlayCircle,
  Zap,
  Layers,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectApi, sprintApi, issueApi, userApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, DeadlineBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ManageProjectMembersModal from '../components/project/ManageProjectMembersModal';

function generateKey(name) {
  if (!name) return 'PRJ';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

function formatDate(str) {
  if (!str) return '-';
  try {
    return new Date(str).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return str;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isPM } = useAuth();

  const [projects, setProjects] = useState([]);
  const [issuesMap, setIssuesMap] = useState({});
  const [sprints, setSprints] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '', sdlc_type: 'scrum' });
  const [systemUsers, setSystemUsers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [activeMemberProjectId, setActiveMemberProjectId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const projRes = await projectApi.list();
      const projList = projRes.data?.projects ?? projRes.data ?? [];
      setProjects(projList);

      const allIssuesMap = {};
      const allSprints = [];
      const allRecentIssues = [];

      await Promise.all(
        projList.map(async (p) => {
          const projId = p.id || p._id;
          try {
            const [issRes, spRes] = await Promise.all([
              issueApi.listByProject(projId),
              sprintApi.listByProject(projId),
            ]);
            const issList = issRes.data?.issues ?? issRes.data ?? [];
            const spList = spRes.data?.sprints ?? spRes.data ?? [];

            allIssuesMap[projId] = issList;
            allSprints.push(...spList.filter((s) => s.status === 'active'));
            allRecentIssues.push(...issList);
          } catch (err) {
            console.error(`Failed loading data for project ${projId}:`, err);
          }
        })
      );

      setIssuesMap(allIssuesMap);
      setSprints(allSprints);

      allRecentIssues.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setRecentIssues(allRecentIssues.slice(0, 7));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      toast.error('Failed to load dashboard information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (dialogOpen) {
      userApi.list().then((res) => {
        setSystemUsers(res.data || []);
      }).catch(() => {});
    }
  }, [dialogOpen]);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, name, key: generateKey(name) }));
  };

  const handleCreate = async () => {
    if (!isPM) {
      toast.error('Only Project Managers can create projects');
      return;
    }
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    try {
      setCreating(true);
      const res = await projectApi.create({
        name: form.name.trim(),
        key: form.key || generateKey(form.name),
        description: form.description.trim(),
        sdlc_type: form.sdlc_type || 'scrum',
      });
      const newProj = res.data;
      const newProjId = newProj.id || newProj._id;

      // Assign selected members to project
      if (selectedMemberIds.length > 0) {
        await Promise.all(
          selectedMemberIds.map((userId) =>
            projectApi.addMember(newProjId, { user_id: Number(userId), role: 'member' }).catch(() => {})
          )
        );
      }

      setProjects((prev) => [newProj, ...prev]);
      setIssuesMap((prev) => ({ ...prev, [newProjId]: [] }));
      toast.success('Project created and members assigned successfully!');
      setDialogOpen(false);
      setForm({ name: '', key: '', description: '', sdlc_type: 'scrum' });
      setSelectedMemberIds([]);
      await fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const myAssignedIssues = useMemo(() => {
    if (!user) return [];
    const userId = user.id || user._id;
    return recentIssues.filter(
      (i) => (i.assignee_id || i.assignee?.id || i.assignee?._id) === userId
    );
  }, [recentIssues, user]);

  const totalTasks = useMemo(() => {
    return Object.values(issuesMap).reduce((acc, list) => acc + list.length, 0);
  }, [issuesMap]);

  const completedTasks = useMemo(() => {
    return Object.values(issuesMap).reduce((acc, list) => {
      return acc + list.filter((i) => (i.status ?? '').toLowerCase() === 'done').length;
    }, 0);
  }, [issuesMap]);

  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Header */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
          borderColor: '#fee2e2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Welcome back, <strong>{user?.full_name || user?.username}</strong>
            </span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Project Management Overview
          </h1>
        </div>

        {isPM && (
          <Button variant="primary" icon={Plus} onClick={() => setDialogOpen(true)}>
            Create New Project
          </Button>
        )}
      </div>

      {/* Metrics Stat Cards (Gapless Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* Stat 1 */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Projects
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: 2 }}>
              {projects.length}
            </div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total Tasks
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: 2 }}>
              {totalTasks}
            </div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Completed Tasks
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', marginTop: 2 }}>
              {completedTasks}
            </div>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Overall Progress
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', marginTop: 2 }}>
              {overallProgress}%
            </div>
          </div>
        </div>
      </div>

      {/* Main Content 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column: Projects Grid & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Projects Card Section */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Projects
              </h3>
            </div>

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <FolderKanban size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
                <div style={{ fontWeight: 700 }}>No projects found</div>
                {isPM && (
                  <Button variant="primary" size="sm" icon={Plus} onClick={() => setDialogOpen(true)} style={{ marginTop: 12 }}>
                    Create First Project
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {projects.map((p) => {
                  const projId = p.id || p._id;
                  const issues = issuesMap[projId] || [];
                  const doneCount = issues.filter((i) => (i.status ?? '').toLowerCase() === 'done').length;
                  const pct = issues.length > 0 ? Math.round((doneCount / issues.length) * 100) : 0;

                  return (
                    <div
                      key={projId}
                      className="card card-hover"
                      onClick={() => navigate(`/board/${projId}`)}
                      style={{
                        padding: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 150,
                        backgroundColor: '#ffffff',
                        borderColor: '#fee2e2',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                            {p.name}
                          </span>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 800,
                              backgroundColor: (p.sdlc_type || '').toLowerCase() === 'waterfall' ? '#fef3c7' : '#e0e7ff',
                              color: (p.sdlc_type || '').toLowerCase() === 'waterfall' ? '#b45309' : '#4338ca',
                              border: `1px solid ${(p.sdlc_type || '').toLowerCase() === 'waterfall' ? '#fcd34d' : '#c7d2fe'}`,
                              flexShrink: 0,
                            }}
                          >
                            {(p.sdlc_type || 'scrum').toUpperCase()}
                          </span>
                        </div>

                        {p.description && (
                          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.description}
                          </p>
                        )}
                      </div>

                      <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', marginBottom: 6, fontWeight: 700 }}>
                            <span style={{ color: '#dc2626' }}>{pct}% complete</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, backgroundColor: '#fee2e2', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#dc2626', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMemberProjectId(projId);
                          }}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            borderRadius: 6,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                          className="card-hover"
                          title="Manage Members"
                        >
                          <Users size={14} />
                          <span>Members</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Issues Table Card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={20} color="#dc2626" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Recent Issues Activity</h3>
              </div>
              <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {recentIssues.length} recent
              </span>
            </div>

            {recentIssues.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No recent activity recorded.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 800 }}>Issue Title</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, width: 130 }}>Status</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, width: 110 }}>Priority</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, width: 110 }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentIssues.map((issue) => (
                      <tr
                        key={issue.id || issue._id}
                        onClick={() => navigate(`/issue/${issue.id || issue._id}`)}
                        style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                        className="card-hover"
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={issue.title}>
                          {issue.title}
                        </td>
                        <td style={{ padding: '12px 14px' }}><StatusBadge status={issue.status} /></td>
                        <td style={{ padding: '12px 14px' }}><PriorityBadge priority={issue.priority} /></td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(issue.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Sprints & Assigned Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Sprints Card */}
          <div className="card" style={{ padding: 22, backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <PlayCircle size={20} color="#dc2626" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Active Sprints</h3>
            </div>

            {sprints.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                No active sprints running right now.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sprints.map((s) => (
                  <div key={s.id || s._id} style={{ padding: 14, backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>{s.name}</span>
                      <span className="badge" style={{ backgroundColor: '#dc2626', color: '#ffffff', fontSize: '0.65rem' }}>ACTIVE</span>
                    </div>
                    {s.goal && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4 }}>Goal: {s.goal}</div>}
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> Ends {formatDate(s.end_date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned to Me Card */}
          <div className="card" style={{ padding: 22, backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Zap size={20} color="#dc2626" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Assigned to Me</h3>
            </div>

            {myAssignedIssues.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                No pending tasks assigned to you.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myAssignedIssues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id || issue._id}
                    onClick={() => navigate(`/issue/${issue.id || issue._id}`)}
                    className="card card-hover"
                    style={{ padding: 12, cursor: 'pointer', backgroundColor: 'var(--bg-app)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      <PriorityBadge priority={issue.priority} />
                      {issue.due_date && <DeadlineBadge dueDate={issue.due_date} status={issue.status} compact />}
                      <StatusBadge status={issue.status} />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {issue.title}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating || !form.name.trim()}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Project Name *</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. E-Commerce Platform"
            value={form.name}
            onChange={handleNameChange}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">SDLC Methodology *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
            {/* Option 1: Scrum */}
            <div
              onClick={() => setForm((p) => ({ ...p, sdlc_type: 'scrum' }))}
              style={{
                padding: 14,
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${form.sdlc_type === 'scrum' ? '#dc2626' : 'var(--border-color)'}`,
                backgroundColor: form.sdlc_type === 'scrum' ? '#fef2f2' : 'var(--bg-app)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 2 }}>
                ⚡ Scrum (Sprint)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Agile sprints with To Do, In Progress, In Review & Done columns.
              </div>
            </div>

            {/* Option 2: Waterfall */}
            <div
              onClick={() => setForm((p) => ({ ...p, sdlc_type: 'waterfall' }))}
              style={{
                padding: 14,
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${form.sdlc_type === 'waterfall' ? '#dc2626' : 'var(--border-color)'}`,
                backgroundColor: form.sdlc_type === 'waterfall' ? '#fef2f2' : 'var(--bg-app)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 2 }}>
                🌊 Waterfall
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Sequential phases: UR, DR, PU, ST, UT, TR, IP, MA.
              </div>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Describe the main objectives of this project..."
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>

        {/* Member Assignment Section */}
        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Assign Project Members (Optional)</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {selectedMemberIds.length} members selected
            </span>
          </label>

          <div
            style={{
              maxHeight: 160,
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: 8,
              backgroundColor: 'var(--bg-app)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {systemUsers
              .filter((u) => (u.id || u._id) !== (user?.id || user?._id) && !['super_admin', 'super admin', 'superadmin', 'admin'].includes((u.role || '').toLowerCase()))
              .map((u) => {
                const uId = u.id || u._id;
                const isChecked = selectedMemberIds.includes(uId);
                return (
                  <label
                    key={uId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '6px 10px',
                      borderRadius: 6,
                      backgroundColor: isChecked ? 'var(--primary-light)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      border: `1px solid ${isChecked ? 'var(--primary-border)' : 'var(--border-light)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMemberIds((prev) => [...prev, uId]);
                        } else {
                          setSelectedMemberIds((prev) => prev.filter((id) => id !== uId));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: '#dc2626' }}
                    />
                    <div style={{ fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.name || u.username}
                    </div>
                  </label>
                );
              })}
            {systemUsers.length <= 1 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>
                No other users available to assign.
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ManageProjectMembersModal
        open={Boolean(activeMemberProjectId)}
        onClose={() => setActiveMemberProjectId(null)}
        projectId={activeMemberProjectId}
        onMembersUpdated={fetchData}
      />
    </div>
  );
}
