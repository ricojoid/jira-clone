import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { issueApi, userApi, sprintApi, projectApi } from '../../api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { TYPE_META, PRIORITY_META, TypeIcon } from '../ui/Badge';

const WATERFALL_DEFAULT_PHASES = [
  { code: 'UR', name: 'UR' },
  { code: 'DR', name: 'DR' },
  { code: 'PU', name: 'PU' },
  { code: 'ST', name: 'ST' },
  { code: 'UT', name: 'UT' },
  { code: 'TR', name: 'TR' },
  { code: 'IP', name: 'IP' },
  { code: 'MA', name: 'MA' },
];

import { formatDateForDateInput } from '../../utils/deadline';

const getInitialForm = () => ({
  title: '',
  description: '',
  type: 'task',
  priority: 'medium',
  assignee_id: '',
  sprint_id: '',
  story_points: '',
  due_date: formatDateForDateInput(new Date()),
  labels: [],
});

export default function CreateIssueDialog({ open, onClose, projectId, onCreated, parentId }) {
  const [form, setForm] = useState(getInitialForm);
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;

    const fetchData = async () => {
      try {
        const [usersRes, sprintsRes, projRes] = await Promise.all([
          userApi.list(),
          sprintApi.listByProject(projectId),
          projectApi.get(projectId).catch(() => ({ data: null })),
        ]);
        setUsers(usersRes.data || []);
        if (projRes.data) setProject(projRes.data);

        const sprintList = sprintsRes.data?.sprints ?? sprintsRes.data ?? [];
        setSprints(sprintList);

        try {
          const labelsRes = await issueApi.listLabels(projectId);
          setLabels(labelsRes.data || []);
        } catch {
          setLabels([]);
        }
      } catch (err) {
        console.error('Failed to fetch form data:', err);
      }
    };

    fetchData();
  }, [open, projectId]);

  const isWaterfall = (project?.sdlc_type || '').toLowerCase() === 'waterfall';

  const displaySprints = (() => {
    if (sprints && sprints.length > 0) {
      return sprints;
    }
    if (isWaterfall) {
      return WATERFALL_DEFAULT_PHASES.map((p) => ({
        id: `virtual_${p.code}`,
        name: `${p.code} - ${p.name}`,
      }));
    }
    return [];
  })();

  useEffect(() => {
    if (!open) {
      setForm(parentId ? { ...getInitialForm(), type: 'subtask' } : getInitialForm());
      setTagInput('');
    }
  }, [open, parentId]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleAddTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().replace(/^,|,$/g, '');
      if (val && !form.labels.includes(val)) {
        setForm((prev) => ({ ...prev, labels: [...prev.labels, val] }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setForm((prev) => ({ ...prev, labels: prev.labels.filter((t) => t !== tag) }));
  };

  const resolveLabels = async (labelNames) => {
    const resolvedIds = [];
    for (const name of labelNames) {
      const existing = labels.find((l) => l.name?.toLowerCase() === name.toLowerCase());
      if (existing) {
        resolvedIds.push(existing.id);
      } else {
        try {
          const res = await issueApi.createLabel({ name, project_id: projectId });
          resolvedIds.push(res.data.id);
          setLabels((prev) => [...prev, res.data]);
        } catch (err) {
          console.error('Failed to create label:', name, err);
        }
      }
    }
    return resolvedIds;
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        issue_type: form.type,
        priority: form.priority,
        project_id: Number(projectId),
      };

      if (form.assignee_id) payload.assignee_id = Number(form.assignee_id);
      if (form.sprint_id) {
        if (String(form.sprint_id).startsWith('virtual_')) {
          const code = String(form.sprint_id).replace('virtual_', '');
          const phaseMatch = WATERFALL_DEFAULT_PHASES.find((p) => p.code === code);
          if (phaseMatch) {
            try {
              const res = await sprintApi.create({
                project_id: Number(projectId),
                name: `${phaseMatch.code} - ${phaseMatch.name}`,
                goal: `Deliverables for ${phaseMatch.name} phase`,
              });
              if (res.data?.id || res.data?._id) {
                payload.sprint_id = Number(res.data.id || res.data._id);
              }
            } catch (err) {
              console.error('Failed creating virtual phase:', err);
            }
          }
        } else {
          payload.sprint_id = Number(form.sprint_id);
        }
      }
      if (form.story_points !== '') payload.story_points = Number(form.story_points);
      if (form.due_date) payload.due_date = new Date(form.due_date).toISOString();
      if (parentId) payload.parent_id = Number(parentId);
      if (form.labels.length > 0) {
        payload.label_ids = await resolveLabels(form.labels);
      }

      await issueApi.create(payload);
      toast.success('Issue created successfully');
      onCreated?.();
    } catch (err) {
      console.error('Failed to create issue:', err);
      toast.error(err.response?.data?.message || 'Failed to create issue');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit} disabled={submitting || !form.title.trim()}>
        {submitting ? 'Creating...' : 'Create Issue'}
      </Button>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Create Issue" footer={footer} maxWidth="600px">
      <div className="form-group">
        <label className="form-label">Issue Title *</label>
        <input
          className="form-input"
          type="text"
          placeholder="e.g. Implement user authentication flow"
          value={form.title}
          onChange={handleChange('title')}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-textarea"
          rows={4}
          placeholder="Add details, steps to reproduce, or acceptance criteria..."
          value={form.description}
          onChange={handleChange('description')}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Issue Type</label>
          <select className="form-select" value={form.type} onChange={handleChange('type')}>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Priority</label>
          <select className="form-select" value={form.priority} onChange={handleChange('priority')}>
            {Object.entries(PRIORITY_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Assignee</label>
          <select className="form-select" value={form.assignee_id} onChange={handleChange('assignee_id')}>
            <option value="">Unassigned</option>
            {users
              .filter((u) => !['super_admin', 'super admin', 'superadmin', 'admin'].includes((u.role || '').toLowerCase()))
              .map((u) => (
                <option key={u.id || u._id} value={u.id || u._id}>
                  {u.full_name || u.username || u.name || u.email}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{isWaterfall ? 'Phase' : 'Sprint'}</label>
          <select className="form-select" value={form.sprint_id} onChange={handleChange('sprint_id')}>
            <option value="">{isWaterfall ? 'No Phase (Backlog)' : 'No Sprint (Backlog)'}</option>
            {displaySprints.map((s) => (
              <option key={s.id || s._id} value={s.id || s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Due Date (Deadline)</label>
          <input
            className="form-input"
            type="date"
            value={form.due_date}
            onChange={handleChange('due_date')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Story Points</label>
          <input
            className="form-input"
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 3"
            value={form.story_points}
            onChange={handleChange('story_points')}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Labels (press Enter or comma)</label>
        <input
          className="form-input"
          type="text"
          placeholder="Add label..."
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
        />
      </div>

      {form.labels.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: -8 }}>
          {form.labels.map((t) => (
            <span
              key={t}
              className="badge"
              style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary-border)', paddingRight: 6 }}
            >
              {t}
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, marginLeft: 4 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </Modal>
  );
}
