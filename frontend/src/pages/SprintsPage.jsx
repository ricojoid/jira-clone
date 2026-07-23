import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Play, CheckCircle2, Edit2, Trash2, Calendar, Target, Layers, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { sprintApi, issueApi, projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const WATERFALL_PHASES = [
  { code: 'UR', name: 'User Requirement', color: '#6366f1' },
  { code: 'DR', name: 'Design Review', color: '#8b5cf6' },
  { code: 'PU', name: 'Production Update', color: '#ec4899' },
  { code: 'ST', name: 'System Testing', color: '#3b82f6' },
  { code: 'UT', name: 'User Acceptance Testing (UAT)', color: '#06b6d4' },
  { code: 'TR', name: 'Training', color: '#f59e0b' },
  { code: 'IP', name: 'Implementation', color: '#10b981' },
  { code: 'MA', name: 'Maintenance', color: '#22c55e' },
];

const initialSprintForm = {
  name: '',
  goal: '',
  start_date: '',
  end_date: '',
};

export default function SprintsPage() {
  const { projectId } = useParams();
  const { isPM } = useAuth();

  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [issuesBySprintId, setIssuesBySprintId] = useState({});
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [sprintForm, setSprintForm] = useState(initialSprintForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingSprint, setDeletingSprint] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isWaterfall = (project?.sdlc_type || '').toLowerCase() === 'waterfall';

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projRes, sprintsRes, issuesRes] = await Promise.all([
        projectApi.get(projectId),
        sprintApi.listByProject(projectId),
        issueApi.listByProject(projectId),
      ]);

      setProject(projRes.data);
      const sprintsData = sprintsRes.data || [];
      const issuesData = issuesRes.data || [];

      const grouped = {};
      sprintsData.forEach((s) => {
        const sKey = String(s.id || s._id);
        grouped[sKey] = [];
      });

      issuesData.forEach((issue) => {
        const issueSprintKey = issue.sprint_id ? String(issue.sprint_id) : null;
        if (issueSprintKey && grouped[issueSprintKey]) {
          grouped[issueSprintKey].push(issue);
          return;
        }

        // Fallback matching for Waterfall phases by phase code or title
        const matchedSprint = sprintsData.find((s) => {
          const sName = (s.name || '').trim();
          const iTitle = (issue.title || '').trim();
          const phaseCode = sName.split(' ')[0]?.replace(/-/g, '').trim(); // e.g. 'UR'
          if (phaseCode && phaseCode.length <= 4) {
            const regex = new RegExp(`^\\b${phaseCode}\\b`, 'i');
            return regex.test(iTitle) || iTitle.toLowerCase().includes(sName.toLowerCase());
          }
          return false;
        });

        if (matchedSprint) {
          const sKey = String(matchedSprint.id || matchedSprint._id);
          if (grouped[sKey]) {
            grouped[sKey].push(issue);
          }
        }
      });

      setSprints(sprintsData);
      setIssuesBySprintId(grouped);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInitWaterfallPhases = async () => {
    if (!isPM) return;
    try {
      setSubmitting(true);
      for (const phase of WATERFALL_PHASES) {
        await sprintApi.create({
          project_id: projectId,
          name: phase.code,
          goal: `Objectives and deliverables for ${phase.code} phase.`,
        });
      }
      toast.success('Successfully initialized all 8 Waterfall SDLC phases!');
      fetchData();
    } catch (err) {
      console.error('Failed to init phases:', err);
      toast.error('Failed to initialize phases');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = (prefillName = '') => {
    if (!isPM) {
      toast.error('Only Project Managers can add items');
      return;
    }
    setEditingSprint(null);
    setSprintForm({
      ...initialSprintForm,
      name: prefillName || (isWaterfall ? 'UR' : `Sprint ${sprints.length + 1}`),
    });
    setDialogOpen(true);
  };

  const openEditDialog = (sprint) => {
    if (!isPM) {
      toast.error('Only Project Managers can edit items');
      return;
    }
    setEditingSprint(sprint);
    setSprintForm({
      name: sprint.name || '',
      goal: sprint.goal || '',
      start_date: sprint.start_date ? sprint.start_date.slice(0, 10) : '',
      end_date: sprint.end_date ? sprint.end_date.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!isPM) {
      toast.error('Only Project Managers can manage items');
      return;
    }
    if (!sprintForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: sprintForm.name.trim(),
        goal: sprintForm.goal.trim() || undefined,
        start_date: sprintForm.start_date || undefined,
        end_date: sprintForm.end_date || undefined,
      };

      if (editingSprint) {
        await sprintApi.update(editingSprint.id || editingSprint._id, payload);
        toast.success(isWaterfall ? 'Phase updated' : 'Sprint updated');
      } else {
        payload.project_id = projectId;
        await sprintApi.create(payload);
        toast.success(isWaterfall ? 'Phase added' : 'Sprint created');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save:', err);
      toast.error(editingSprint ? 'Failed to update' : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSprint = async (sprint) => {
    try {
      await sprintApi.update(sprint.id || sprint._id, { status: 'active' });
      toast.success(`${isWaterfall ? 'Phase' : 'Sprint'} "${sprint.name}" started`);
      fetchData();
    } catch {
      toast.error('Failed to start');
    }
  };

  const handleCompleteSprint = async (sprint) => {
    try {
      await sprintApi.update(sprint.id || sprint._id, { status: 'completed' });
      toast.success(`${isWaterfall ? 'Phase' : 'Sprint'} "${sprint.name}" completed`);
      fetchData();
    } catch {
      toast.error('Failed to complete');
    }
  };

  const handleDeleteSprint = async () => {
    if (!deletingSprint) return;
    try {
      setDeleting(true);
      await sprintApi.delete(deletingSprint.id || deletingSprint._id);
      toast.success(isWaterfall ? 'Phase deleted' : 'Sprint deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeletingSprint(null);
    }
  };

  const getSprintProgress = (sprintId) => {
    const sKey = String(sprintId);
    const issues = issuesBySprintId[sKey] || [];
    if (issues.length === 0) return { done: 0, total: 0, pct: 0, issues: [] };
    const done = issues.filter((i) => String(i.status || '').toLowerCase() === 'done').length;
    const pct = Math.round((done / issues.length) * 100);
    return { done, total: issues.length, pct, issues };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {isWaterfall ? 'Waterfall Phase Management' : 'Sprint Management'}
            </h2>
            <span
              className="badge"
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                backgroundColor: isWaterfall ? '#fef3c7' : '#e0e7ff',
                color: isWaterfall ? '#b45309' : '#4338ca',
                border: `1px solid ${isWaterfall ? '#fcd34d' : '#c7d2fe'}`,
              }}
            >
              {isWaterfall ? 'WATERFALL SDLC' : 'AGILE SCRUM'}
            </span>
          </div>
          {!isWaterfall && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {sprints.length} total sprints planned and active
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {isWaterfall && sprints.length === 0 && isPM && (
            <Button variant="secondary" icon={Zap} onClick={handleInitWaterfallPhases} disabled={submitting}>
              Auto-Create 8 Standard Phases
            </Button>
          )}
          <Button variant="primary" icon={Plus} onClick={() => openCreateDialog()} disabled={!isPM}>
            {isWaterfall ? 'Add Phase' : 'Create Sprint'}
          </Button>
        </div>
      </div>



      {/* Sprint / Phase Cards */}
      {sprints.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Calendar size={48} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>
            {isWaterfall ? 'No SDLC Phases Configured' : 'No Sprints Created'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
            {isWaterfall
              ? 'Click below to initialize standard Waterfall phases.'
              : isPM ? 'Create your first sprint to organize work iterations.' : 'No sprints have been created for this project.'}
          </p>
          {isPM && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
              {isWaterfall ? (
                <Button variant="primary" icon={Zap} onClick={handleInitWaterfallPhases} disabled={submitting}>
                  Auto-Create 8 Standard Phases
                </Button>
              ) : (
                <Button variant="primary" icon={Plus} onClick={() => openCreateDialog()}>
                  Create Sprint
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sprints.map((sprint) => {
            const sprintId = sprint.id || sprint._id;
            const progress = getSprintProgress(sprintId);
            const rawName = sprint.name || '';
            const sprintDisplayName = rawName.includes(' - ') ? rawName.split(' - ')[0].trim() : rawName;

            return (
              <div key={sprintId} className="card card-hover" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sprintDisplayName}</h3>
                      <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', textTransform: 'capitalize' }}>
                        {sprint.status || 'planned'}
                      </span>
                    </div>

                    {!isWaterfall && sprint.goal && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        <Target size={14} color="var(--primary)" />
                        Goal: {sprint.goal}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <Calendar size={14} />
                      {sprint.start_date && sprint.end_date ? `${formatDate(sprint.start_date)} – ${formatDate(sprint.end_date)}` : 'Target dates not set'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {sprint.status === 'planned' && (
                      <Button variant="primary" size="sm" icon={Play} onClick={() => handleStartSprint(sprint)}>
                        {isWaterfall ? 'Start Phase' : 'Start Sprint'}
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button variant="outline" size="sm" icon={CheckCircle2} onClick={() => handleCompleteSprint(sprint)}>
                        {isWaterfall ? 'Complete Phase' : 'Complete Sprint'}
                      </Button>
                    )}
                    {isPM && (
                      <>
                        <Button variant="ghost" size="sm" icon={Edit2} onClick={() => openEditDialog(sprint)} />
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => { setDeletingSprint(sprint); setDeleteOpen(true); }} />
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      {isWaterfall ? 'Phase Task Progress' : 'Sprint Task Progress'}
                    </span>
                    <span style={{ fontWeight: 800, color: progress.pct === 100 ? '#16a34a' : 'var(--primary)' }}>
                      {progress.done} of {progress.total} tasks completed ({progress.pct}%)
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress.pct}%`, backgroundColor: progress.pct === 100 ? '#16a34a' : '#dc2626', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingSprint ? (isWaterfall ? 'Edit Phase' : 'Edit Sprint') : (isWaterfall ? 'Add Phase' : 'Create Sprint')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting || !sprintForm.name.trim()}>
              {submitting ? 'Saving...' : editingSprint ? 'Save Changes' : (isWaterfall ? 'Save Phase' : 'Create Sprint')}
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">{isWaterfall ? 'Phase Name / Code *' : 'Sprint Name *'}</label>
          <input
            className="form-input"
            type="text"
            placeholder={isWaterfall ? 'e.g. UR' : 'Sprint 1'}
            value={sprintForm.name}
            onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">{isWaterfall ? 'Phase Goal / Deliverables' : 'Sprint Goal'}</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder={isWaterfall ? 'What are the main deliverables for this phase?' : 'What is the objective of this sprint?'}
            value={sprintForm.goal}
            onChange={(e) => setSprintForm((p) => ({ ...p, goal: e.target.value }))}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              className="form-input"
              type="date"
              value={sprintForm.start_date}
              onChange={(e) => setSprintForm((p) => ({ ...p, start_date: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">End Date / Target Date</label>
            <input
              className="form-input"
              type="date"
              value={sprintForm.end_date}
              onChange={(e) => setSprintForm((p) => ({ ...p, end_date: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={isWaterfall ? 'Delete Phase' : 'Delete Sprint'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteSprint} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Are you sure you want to delete <strong>{deletingSprint?.name}</strong>? Tasks assigned to this phase will remain in the project backlog.
        </p>
      </Modal>
    </div>
  );
}
