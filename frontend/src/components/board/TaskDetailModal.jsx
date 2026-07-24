import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Trash2, Edit2, Send, Plus, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { issueApi, userApi, sprintApi, projectApi, getAttachmentUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { TYPE_META, PRIORITY_META, STATUS_META, TypeIcon, StatusBadge, PriorityBadge, DeadlineBadge } from '../ui/Badge';
import CreateIssueDialog from '../issues/CreateIssueDialog';
import CommentInputWithMention from '../issues/CommentInputWithMention';
import FormattedText from '../ui/FormattedText';
import { formatDateForDateInput } from '../../utils/deadline';

export default function TaskDetailModal({ issueId, open, onClose, onUpdated }) {
  const navigate = useNavigate();
  const { user, isPM, isSuperAdmin } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  // Editable fields
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Subtask creation
  const [subtaskDialogOpen, setSubtaskDialogOpen] = useState(false);

  const fetchIssue = useCallback(async () => {
    if (!issueId || !open) return;
    try {
      setLoading(true);
      const issueRes = await issueApi.get(issueId);
      const issueData = issueRes.data;
      setIssue(issueData);
      setTitleDraft(issueData.title || '');
      setDescDraft(issueData.description || '');
      setComments(issueData.comments || []);

      const actualProjectId = issueData.project_id;

      const [membersRes, sprintsRes] = await Promise.all([
        projectApi.listMembers(actualProjectId).catch(() => ({ data: [] })),
        sprintApi.listByProject(actualProjectId).catch(() => ({ data: [] })),
      ]);
      const projectMembers = (membersRes.data || []).map((m) => m.user || m);
      setUsers(projectMembers);
      setSprints(sprintsRes.data || []);

      try {
        const labelsRes = await issueApi.listLabels(actualProjectId);
        setLabels(labelsRes.data || []);
      } catch {
        setLabels([]);
      }
    } catch (err) {
      console.error('Failed to fetch issue details:', err);
      toast.error('Failed to load issue details');
    } finally {
      setLoading(false);
    }
  }, [issueId, open]);

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
      if (onUpdated) onUpdated();
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
      setTitleDraft(issue?.title || '');
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

  const canDelete = isPM || isSuperAdmin || (user && issue && (user.id === issue.reporter_id || user.id === issue.project?.owner_id));

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error('Only the reporter, Project Manager, or Super Admin can delete issues');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    try {
      await issueApi.delete(issueId);
      toast.success('Issue deleted');
      onClose();
      if (onUpdated) onUpdated();
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
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });
  };

  if (!open) return null;

  const subtasks = issue?.children || [];
  const completedSubtasks = subtasks.filter((s) => s.status === 'done').length;
  const subtaskProgress = subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0;

  return (
    <Modal open={open} onClose={onClose} title={issue?.issue_key || 'Issue Details'} maxWidth="920px">
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading task details...
        </div>
      ) : !issue ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Issue not found
        </div>
      ) : (
        <div className="grid-responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header / Title */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TypeIcon type={issue.issue_type || issue.type} size={18} />
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {issue.issue_key}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  • {issue.project?.name || 'Project'}
                </span>
              </div>

              {editingTitle ? (
                <input
                  className="form-input"
                  style={{ fontSize: '1.25rem', fontWeight: 700 }}
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background 0.15s',
                  }}
                  className="card-hover"
                >
                  {issue.title}
                </h2>
              )}
            </div>

            {/* Description */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Description</h4>
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
                    rows={5}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    placeholder="Add a detailed description..."
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
                    padding: 12,
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--border-color)',
                    cursor: 'pointer',
                    minHeight: 60,
                    whiteSpace: 'pre-wrap',
                    color: issue.description ? 'var(--text-body)' : 'var(--text-light)',
                    fontSize: '0.875rem',
                  }}
                >
                  {issue.description || 'Click to add a description...'}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    {issue.issue_type === 'epic' ? 'Linked Issues' : 'Subtasks'} ({subtasks.length})
                  </h4>
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
                      onClick={() => {
                        onClose();
                        navigate(`/issue/${child.id}`);
                      }}
                      className="card card-hover"
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <TypeIcon type={child.issue_type} size={16} style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)', flexShrink: 0 }}>
                        {child.issue_key}
                      </span>
                      <span
                        title={child.title}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: '0.85rem',
                          textDecoration: child.status === 'done' ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {child.title}
                      </span>
                      <div style={{ flexShrink: 0 }}>
                        <StatusBadge status={child.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No {issue.issue_type === 'epic' ? 'linked issues' : 'subtasks'} yet.
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>
                Comments ({comments.length})
              </h4>

              {comments.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  No comments yet. Be the first to comment.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {comments.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      style={{
                        padding: 12,
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Avatar name={c.author?.full_name || c.author?.username || c.author?.name} src={c.author?.avatar_url || c.author?.avatar} size={24} />
                        <span style={{ fontWeight: 700, fontSize: '0.825rem' }}>
                          {c.author?.full_name || c.author?.username || c.author?.name || 'User'}
                        </span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {formatDate(c.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-body)', whiteSpace: 'pre-wrap', paddingLeft: 34 }}>
                        <FormattedText text={c.content} />
                      </div>
                      {c.attachment_url && (
                        <div style={{ marginTop: 8, paddingLeft: 34 }}>
                          {/\.(png|jpe?g|webp|gif|svg)$/i.test(c.attachment_url) ? (
                            <div style={{ marginTop: 4 }}>
                              <img
                                src={getAttachmentUrl(c.attachment_url)}
                                alt="Attachment"
                                onClick={() => setPreviewImage(getAttachmentUrl(c.attachment_url))}
                                style={{
                                  maxWidth: 280,
                                  maxHeight: 200,
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

              {/* Add Comment */}
              <div style={{ display: 'flex', gap: 12 }}>
                <Avatar name={user?.full_name || user?.username || user?.name} src={user?.avatar_url || user?.avatar} size={32} />
                <div style={{ flex: 1 }}>
                  <CommentInputWithMention onSubmit={handleAddComment} submitting={submittingComment} allowedUsers={users} />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Attributes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-light)', paddingBottom: 10 }}>
                Attributes
              </h4>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={issue.status || 'todo'} onChange={(e) => updateField('status', e.target.value)}>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
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
                  {Object.entries(PRIORITY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Issue Type</label>
                <select className="form-select" value={issue.issue_type || issue.type || 'task'} onChange={(e) => updateField('type', e.target.value)}>
                  {Object.entries(TYPE_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{(issue?.project?.sdlc_type || '').toLowerCase() === 'waterfall' ? 'Phase' : 'Sprint'}</label>
                <select className="form-select" value={issue.sprint_id || ''} onChange={(e) => updateField('sprint_id', e.target.value || null)}>
                  <option value="">{(issue?.project?.sdlc_type || '').toLowerCase() === 'waterfall' ? 'No Phase (Backlog)' : 'No Sprint (Backlog)'}</option>
                  {sprints.map((s) => (
                    <option key={s.id || s._id} value={s.id || s._id}>
                      {s.name}
                    </option>
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
                  style={{ cursor: 'pointer' }}
                  value={formatDateForDateInput(issue.due_date)}
                  onClick={(e) => { try { e.target.showPicker(); } catch {} }}
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

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ExternalLink}
                  onClick={() => {
                    onClose();
                    navigate(`/issue/${issueId}`);
                  }}
                  style={{ flex: 1 }}
                >
                  Full View
                </Button>
                {canDelete && (
                  <Button variant="danger" size="sm" icon={Trash2} onClick={handleDelete}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateIssueDialog
        open={subtaskDialogOpen}
        onClose={() => setSubtaskDialogOpen(false)}
        projectId={issue?.project_id}
        parentId={issue?.id}
        onCreated={() => {
          setSubtaskDialogOpen(false);
          fetchIssue();
          if (onUpdated) onUpdated();
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
    </Modal>
  );
}
