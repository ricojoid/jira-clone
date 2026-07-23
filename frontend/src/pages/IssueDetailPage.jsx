import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Edit2, Send, Plus, ExternalLink, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { issueApi, userApi, sprintApi, getAttachmentUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { StatusBadge, PriorityBadge, TypeIcon, STATUS_META, PRIORITY_META, TYPE_META, DeadlineBadge } from '../components/ui/Badge';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';
import CommentInputWithMention from '../components/issues/CommentInputWithMention';
import FormattedText from '../components/ui/FormattedText';
import { formatDateForDateInput } from '../utils/deadline';

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user, isPM } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);

  const fetchIssue = useCallback(async () => {
    try {
      setLoading(true);
      const issueRes = await issueApi.get(issueId);
      const issueData = issueRes.data;
      setIssue(issueData);
      setTitleDraft(issueData.title || '');
      setDescDraft(issueData.description || '');
      setComments(issueData.comments || []);

      const actualProjectId = issueData.project_id;

      const [usersRes, sprintsRes] = await Promise.all([
        userApi.list().catch(() => ({ data: [] })),
        sprintApi.listByProject(actualProjectId).catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setSprints(sprintsRes.data || []);

      try {
        const labelsRes = await issueApi.listLabels(actualProjectId);
        setLabels(labelsRes.data || []);
      } catch {
        setLabels([]);
      }
    } catch (err) {
      console.error('Failed to fetch issue:', err);
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const resolveLabels = async (labelNames) => {
    const resolvedIds = [];
    for (const name of labelNames) {
      const existing = labels.find((l) => l.name?.toLowerCase() === name.toLowerCase());
      if (existing) {
        resolvedIds.push(existing.id);
      } else {
        try {
          const res = await issueApi.createLabel({ name, project_id: issue.project_id });
          resolvedIds.push(res.data.id);
          setLabels((prev) => [...prev, res.data]);
        } catch (err) {
          console.error('Failed to create label:', name, err);
        }
      }
    }
    return resolvedIds;
  };

  const updateField = async (field, value) => {
    try {
      let apiField = field === 'type' ? 'issue_type' : field;
      let apiValue = value;

      if (field === 'labels') {
        apiField = 'label_ids';
        apiValue = await resolveLabels(value);
      }

      const res = await issueApi.update(issueId, { [apiField]: apiValue });
      setIssue(res.data);
      setComments(res.data.comments || []);
      toast.success('Updated successfully');
    } catch (err) {
      console.error('Failed to update:', err);
      toast.error('Failed to update');
    }
  };

  const handleTitleSave = () => {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft !== issue.title) {
      updateField('title', titleDraft.trim());
    } else {
      setTitleDraft(issue.title);
    }
  };

  const handleDescSave = () => {
    setEditingDesc(false);
    if (descDraft !== issue.description) {
      updateField('description', descDraft);
    }
  };

  const handleAddComment = async (payloadData) => {
    let content = '';
    let attachment_url = null;

    if (typeof payloadData === 'object' && payloadData !== null) {
      content = payloadData.content || '';
      attachment_url = payloadData.attachment_url || null;
    } else {
      content = String(payloadData || commentText).trim();
    }

    if (!content && !attachment_url) return;
    try {
      setSubmittingComment(true);
      const res = await issueApi.addComment(issueId, { content, attachment_url });
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
      toast.success('Comment added');
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!isPM) {
      toast.error('Only Project Managers or Super Admins can delete issues');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await issueApi.delete(issueId);
      toast.success('Issue deleted');
      navigate(`/board/${issue?.project_id}`);
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error(err.response?.data?.detail || 'Failed to delete issue');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    let str = String(dateStr);
    if (!str.endsWith('Z') && !str.includes('+') && !str.includes('-')) {
      str = str + 'Z';
    }
    return new Date(str).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading task details...</div>;
  }

  if (!issue) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        <h3>Issue not found</h3>
        <Link to="/dashboard" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 12, display: 'inline-block' }}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const subtasks = issue?.children || [];
  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}>
          <Link to={`/board/${issue.project_id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Board
          </Link>
          <span style={{ color: 'var(--text-light)' }}>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{issue.issue_key}</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(`/board/${issue.project_id}`)}>
            Back to Board
          </Button>
          {isPM && (
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete Issue
            </Button>
          )}
        </div>
      </div>

      {/* 2-Column Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TypeIcon type={issue.issue_type || issue.type} size={20} />
              <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{issue.issue_key}</span>
            </div>

            {editingTitle ? (
              <input
                className="form-input"
                style={{ fontSize: '1.5rem', fontWeight: 800 }}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                autoFocus
              />
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  margin: '-6px -10px',
                  borderRadius: 'var(--radius-md)',
                }}
                className="card-hover"
              >
                {issue.title}
              </h1>
            )}
          </div>

          {/* Description Card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Description</h3>
              {!editingDesc && (
                <Button variant="ghost" size="sm" icon={Edit2} onClick={() => setEditingDesc(true)}>
                  Edit
                </Button>
              )}
            </div>

            {editingDesc ? (
              <div>
                <textarea
                  className="form-textarea"
                  rows={6}
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditingDesc(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleDescSave}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  cursor: 'pointer',
                  minHeight: 80,
                  whiteSpace: 'pre-wrap',
                  color: issue.description ? 'var(--text-body)' : 'var(--text-light)',
                  fontSize: '0.9rem',
                }}
              >
                {issue.description || 'Click to add a detailed description...'}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {issue.issue_type === 'epic' ? 'Linked Issues' : 'Subtasks'} ({subtasks.length})
                </h3>
                {subtasks.length > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {completedSubtasks} of {subtasks.length} done ({Math.round(subtaskProgress)}%)
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" icon={Plus} onClick={() => setSubtaskDialogOpen(true)}>
                {issue.issue_type === 'epic' ? 'Add Issue' : 'Add Subtask'}
              </Button>
            </div>

            {subtasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {subtasks.map((child) => (
                  <div
                    key={child.id}
                    onClick={() => navigate(`/issue/${child.id}`)}
                    className="card card-hover"
                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                  >
                    <TypeIcon type={child.issue_type} size={16} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                      {child.issue_key}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.875rem', textDecoration: child.status === 'done' ? 'line-through' : 'none' }}>
                      {child.title}
                    </span>
                    <StatusBadge status={child.status} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No {issue.issue_type === 'epic' ? 'linked issues' : 'subtasks'} added.
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>
              Comments ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                No comments yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {comments.map((c, idx) => (
                  <div key={c.id || idx} style={{ padding: 14, backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <Avatar name={c.author?.full_name || c.author?.username || c.author?.name} size={26} />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        {c.author?.full_name || c.author?.username || c.author?.name || 'User'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(c.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-body)', whiteSpace: 'pre-wrap', paddingLeft: 36 }}>
                      <FormattedText text={c.content} />
                    </div>
                    {c.attachment_url && (
                      <div style={{ marginTop: 8, paddingLeft: 36 }}>
                        {/\.(png|jpe?g|webp|gif|svg)$/i.test(c.attachment_url) ? (
                          <div style={{ marginTop: 4 }}>
                            <img
                              src={getAttachmentUrl(c.attachment_url)}
                              alt="Attachment"
                              onClick={() => setPreviewImage(getAttachmentUrl(c.attachment_url))}
                              style={{
                                maxWidth: 300,
                                maxHeight: 220,
                                borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                objectFit: 'cover',
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease',
                              }}
                              className="card-hover"
                              title="Click to view full image"
                            />
                          </div>
                        ) : (
                          <a
                            href={getAttachmentUrl(c.attachment_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 12px',
                              backgroundColor: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 8,
                              color: 'var(--primary)',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                              marginTop: 4,
                            }}
                          >
                            <FileText size={16} />
                            <span>Open Attachment ({c.attachment_url.split('/').pop()})</span>
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <Avatar name={user?.full_name || user?.username || user?.name} size={34} />
              <div style={{ flex: 1 }}>
                <CommentInputWithMention onSubmit={handleAddComment} submitting={submittingComment} />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: 12 }}>
              Attributes
            </h3>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={issue.status || 'todo'} onChange={(e) => updateField('status', e.target.value)}>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select className="form-select" value={issue.assignee_id || ''} onChange={(e) => updateField('assignee_id', e.target.value || null)}>
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
              <label className="form-label">Priority</label>
              <select className="form-select" value={issue.priority || 'medium'} onChange={(e) => updateField('priority', e.target.value)}>
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Issue Type</label>
              <select className="form-select" value={issue.issue_type || issue.type || 'task'} onChange={(e) => updateField('type', e.target.value)}>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sprint</label>
              <select className="form-select" value={issue.sprint_id || ''} onChange={(e) => updateField('sprint_id', e.target.value || null)}>
                <option value="">No Sprint (Backlog)</option>
                {sprints.map((s) => (
                  <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Due Date (Deadline)</span>
                {issue.due_date && <DeadlineBadge dueDate={issue.due_date} status={issue.status} compact />}
              </label>
              <input
                className="form-input"
                type="date"
                value={formatDateForDateInput(issue.due_date)}
                onChange={(e) => updateField('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Story Points</label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={issue.story_points ?? ''}
                onChange={(e) => updateField('story_points', e.target.value === '' ? null : Number(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      <CreateIssueDialog
        open={subtaskDialogOpen}
        onClose={() => setSubtaskDialogOpen(false)}
        projectId={issue?.project_id}
        parentId={issue?.id}
        onCreated={() => {
          setSubtaskDialogOpen(false);
          fetchIssue();
        }}
      />
      {/* Lightbox Modal for Image Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            cursor: 'zoom-out',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Full Preview"
              style={{
                maxWidth: '90vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ExternalLink size={16} /> Open original in new tab
              </a>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
