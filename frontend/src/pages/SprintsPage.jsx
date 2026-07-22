import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Play, CheckCircle2, Edit2, Trash2, Calendar, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { sprintApi, issueApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const initialSprintForm = {
  name: '',
  goal: '',
  start_date: '',
  end_date: '',
};

export default function SprintsPage() {
  const { projectId } = useParams();
  const { isPM } = useAuth();

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sprintsRes, issuesRes] = await Promise.all([
        sprintApi.listByProject(projectId),
        issueApi.listByProject(projectId),
      ]);

      const sprintsData = sprintsRes.data || [];
      const issuesData = issuesRes.data || [];

      const grouped = {};
      sprintsData.forEach((s) => {
        grouped[s.id || s._id] = [];
      });
      issuesData.forEach((issue) => {
        if (issue.sprint_id && grouped[issue.sprint_id]) {
          grouped[issue.sprint_id].push(issue);
        }
      });

      setSprints(sprintsData);
      setIssuesBySprintId(grouped);
    } catch (err) {
      console.error('Failed to fetch sprints:', err);
      toast.error('Failed to load sprints');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateDialog = () => {
    if (!isPM) {
      toast.error('Only Project Managers can create sprints');
      return;
    }
    setEditingSprint(null);
    setSprintForm({
      ...initialSprintForm,
      name: `Sprint ${sprints.length + 1}`,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (sprint) => {
    if (!isPM) {
      toast.error('Only Project Managers can edit sprints');
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
      toast.error('Only Project Managers can manage sprints');
      return;
    }
    if (!sprintForm.name.trim()) {
      toast.error('Sprint name is required');
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
        toast.success('Sprint updated');
      } else {
        payload.project_id = projectId;
        await sprintApi.create(payload);
        toast.success('Sprint created');
      }

      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save sprint:', err);
      toast.error(editingSprint ? 'Failed to update sprint' : 'Failed to create sprint');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSprint = async (sprint) => {
    try {
      await sprintApi.update(sprint.id || sprint._id, { status: 'active' });
      toast.success(`Sprint "${sprint.name}" started`);
      fetchData();
    } catch {
      toast.error('Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprint) => {
    try {
      await sprintApi.update(sprint.id || sprint._id, { status: 'completed' });
      toast.success(`Sprint "${sprint.name}" completed`);
      fetchData();
    } catch {
      toast.error('Failed to complete sprint');
    }
  };

  const handleDeleteSprint = async () => {
    if (!deletingSprint) return;
    try {
      setDeleting(true);
      await sprintApi.delete(deletingSprint.id || deletingSprint._id);
      toast.success('Sprint deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete sprint');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeletingSprint(null);
    }
  };

  const getSprintProgress = (sprintId) => {
    const issues = issuesBySprintId[sprintId] || [];
    if (issues.length === 0) return { done: 0, total: 0, pct: 0 };
    const done = issues.filter((i) => i.status === 'done').length;
    return { done, total: issues.length, pct: Math.round((done / issues.length) * 100) };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading sprints...</div>;
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Sprint Management
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {sprints.length} total sprints
          </div>
        </div>

        <Button variant="primary" icon={Plus} onClick={openCreateDialog} disabled={!isPM}>
          Create Sprint
        </Button>
      </div>

      {/* Sprint Cards */}
      {sprints.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Calendar size={48} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>No Sprints Created</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, marginBottom: 16 }}>
            {isPM ? 'Create your first sprint to organize work iterations.' : 'No sprints have been created for this project.'}
          </p>
          {isPM && (
            <Button variant="primary" icon={Plus} onClick={openCreateDialog}>
              Create Sprint
            </Button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sprints.map((sprint) => {
            const sprintId = sprint.id || sprint._id;
            const progress = getSprintProgress(sprintId);

            return (
              <div key={sprintId} className="card card-hover" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{sprint.name}</h3>
                      <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', textTransform: 'capitalize' }}>
                        {sprint.status || 'planned'}
                      </span>
                    </div>

                    {sprint.goal && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        <Target size={14} color="var(--primary)" />
                        Goal: {sprint.goal}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-light)' }}>
                      <Calendar size={14} />
                      {sprint.start_date && sprint.end_date ? `${formatDate(sprint.start_date)} – ${formatDate(sprint.end_date)}` : 'Dates not set'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {sprint.status === 'planned' && (
                      <Button variant="primary" size="sm" icon={Play} onClick={() => handleStartSprint(sprint)} disabled={progress.total === 0}>
                        Start Sprint
                      </Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button variant="outline" size="sm" icon={CheckCircle2} onClick={() => handleCompleteSprint(sprint)}>
                        Complete Sprint
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sprint Progress</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {progress.done} of {progress.total} done ({progress.pct}%)
                    </span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--bg-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress.pct}%`, backgroundColor: progress.pct === 100 ? '#16a34a' : 'var(--primary)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Sprint Modal */}
      <Modal
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingSprint ? 'Edit Sprint' : 'Create Sprint'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting || !sprintForm.name.trim()}>
              {submitting ? 'Saving...' : editingSprint ? 'Save Changes' : 'Create Sprint'}
            </Button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Sprint Name *</label>
          <input
            className="form-input"
            type="text"
            placeholder="Sprint 1"
            value={sprintForm.name}
            onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Sprint Goal</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="What is the objective of this sprint?"
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
            <label className="form-label">End Date</label>
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
        title="Delete Sprint"
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
          Are you sure you want to delete <strong>{deletingSprint?.name}</strong>? Tasks in this sprint will return to the backlog.
        </p>
      </Modal>
    </div>
  );
}
