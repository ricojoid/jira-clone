import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Avatar,
  Chip,
  Button,
  IconButton,
  Paper,
  Divider,
  Stack,
  Breadcrumbs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
  Autocomplete,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Send as SendIcon,
  NavigateNext as BreadcrumbIcon,
  BugReport as BugIcon,
  TaskAlt as TaskIcon,
  AutoStories as StoryIcon,
  Bolt as EpicIcon,
  AccountTree as SubtaskIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { issueApi, userApi, sprintApi } from '../api';
import { useAuth } from '../context/AuthContext';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', color: '#94a3b8' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'in_review', label: 'In Review', color: '#f59e0b' },
  { value: 'done', label: 'Done', color: '#22c55e' },
];

const PRIORITY_OPTIONS = [
  { value: 'highest', label: 'Highest', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'lowest', label: 'Lowest', color: '#22c55e' },
];

const TYPE_OPTIONS = [
  { value: 'bug', label: 'Bug', icon: <BugIcon sx={{ color: '#ef4444', fontSize: 18 }} /> },
  { value: 'task', label: 'Task', icon: <TaskIcon sx={{ color: '#3b82f6', fontSize: 18 }} /> },
  { value: 'story', label: 'Story', icon: <StoryIcon sx={{ color: '#22c55e', fontSize: 18 }} /> },
  { value: 'epic', label: 'Epic', icon: <EpicIcon sx={{ color: '#a855f7', fontSize: 18 }} /> },
  { value: 'subtask', label: 'Subtask', icon: <SubtaskIcon sx={{ color: '#64748b', fontSize: 18 }} /> },
];

const sidebarFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#f8fafc',
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
  },
};

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [labels, setLabels] = useState([]);

  // Editable fields
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      toast.error('Failed to load issue');
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      const res = await issueApi.addComment(issueId, { content: commentText.trim() });
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
    try {
      setDeleting(true);
      await issueApi.delete(issueId);
      toast.success('Issue deleted');
      navigate(`/issues/${issue?.project_id}`);
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete issue');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="text" width={300} height={32} />
        <Skeleton variant="text" width={500} height={48} sx={{ mt: 2 }} />
        <Stack direction="row" spacing={3} mt={3}>
          <Box flex={0.65}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Box>
          <Box flex={0.35}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Box>
        </Stack>
      </Box>
    );
  }

  if (!issue) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', mt: 8 }}>
        <Typography variant="h6" color="#64748b">Issue not found</Typography>
        <Button
          component={Link}
          to="/dashboard"
          sx={{ mt: 2, color: '#6366f1', textTransform: 'none' }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const statusMeta = STATUS_OPTIONS.find((s) => s.value === issue.status) || STATUS_OPTIONS[0];
  const typeMeta = TYPE_OPTIONS.find((t) => t.value === (issue.issue_type || issue.type)) || TYPE_OPTIONS[1];

  return (
    <Box sx={{ p: 1, maxWidth: '100%', mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<BreadcrumbIcon fontSize="small" />} sx={{ mb: 2 }}>
        <Typography
          component={Link}
          to={`/issues/${issue?.project_id}`}
          sx={{ color: '#6366f1', textDecoration: 'none', fontSize: 14, '&:hover': { textDecoration: 'underline' } }}
        >
          Issues
        </Typography>
        <Typography color="#64748b" fontSize={14}>
          {issue.issue_key || issue.key}
        </Typography>
      </Breadcrumbs>

      {/* Issue Key & Type */}
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        {typeMeta.icon}
        <Typography variant="body2" color="#64748b" fontWeight={600}>
          {issue.issue_key || issue.key}
        </Typography>
      </Stack>

      {/* Two-column layout */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        {/* Main Content - Left */}
        <Box flex={0.65}>
          {/* Title */}
          {editingTitle ? (
            <TextField
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              autoFocus
              fullWidth
              variant="standard"
              InputProps={{
                sx: { fontSize: 24, fontWeight: 700, color: '#1e293b' },
                disableUnderline: false,
              }}
            />
          ) : (
            <Typography
              variant="h5"
              fontWeight={700}
              color="#1e293b"
              onClick={() => setEditingTitle(true)}
              sx={{
                cursor: 'pointer',
                py: 0.5,
                px: 1,
                mx: -1,
                borderRadius: 1,
                '&:hover': { bgcolor: '#f1f5f9' },
              }}
            >
              {issue.title}
            </Typography>
          )}

          {/* Description */}
          <Paper
            elevation={0}
            sx={{ mt: 3, p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={700} color="#475569">
                Description
              </Typography>
              {!editingDesc && (
                <IconButton size="small" onClick={() => setEditingDesc(true)}>
                  <EditIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                </IconButton>
              )}
            </Stack>
            {editingDesc ? (
              <Box>
                <TextField
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  multiline
                  minRows={4}
                  maxRows={12}
                  fullWidth
                  placeholder="Add a description..."
                  sx={sidebarFieldSx}
                />
                <Stack direction="row" spacing={1} mt={1.5} justifyContent="flex-end">
                  <Button
                    size="small"
                    onClick={() => { setEditingDesc(false); setDescDraft(issue.description || ''); }}
                    sx={{ textTransform: 'none', color: '#64748b' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleDescSave}
                    sx={{ textTransform: 'none', bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
                  >
                    Save
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Typography
                variant="body2"
                color={issue.description ? '#475569' : '#94a3b8'}
                onClick={() => setEditingDesc(true)}
                sx={{
                  cursor: 'pointer',
                  whiteSpace: 'pre-wrap',
                  minHeight: 60,
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { bgcolor: '#f8fafc' },
                }}
              >
                {issue.description || 'Click to add a description...'}
              </Typography>
            )}
          </Paper>

          {/* Child Issues / Subtasks */}
          <Paper
            elevation={0}
            sx={{ mt: 3, p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2" fontWeight={700} color="#475569">
                {issue.issue_type === 'epic' ? 'Linked Issues' : 'Subtasks'} ({issue.children?.length || 0})
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setSubtaskDialogOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  borderColor: '#c7d2fe',
                  color: '#6366f1',
                  '&:hover': { borderColor: '#6366f1', bgcolor: '#eef2ff' },
                }}
              >
                + {issue.issue_type === 'epic' ? 'Add Issue' : 'Add Subtask'}
              </Button>
            </Stack>
            {issue.children?.length > 0 ? (
              <Stack spacing={1}>
                {issue.children.map((child) => {
                  const childType = TYPE_OPTIONS.find((t) => t.value === child.issue_type) || TYPE_OPTIONS[1];
                  return (
                    <Box
                      key={child.id}
                      onClick={() => navigate(`/issue/${child.id}`)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 1.5,
                        border: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: '#f8fafc' },
                      }}
                    >
                      {childType.icon}
                      <Typography variant="body2" fontWeight={600} color="#64748b" fontSize={13}>
                        {child.issue_key}
                      </Typography>
                      <Typography variant="body2" color="#1e293b" fontSize={13} noWrap sx={{ flex: 1 }}>
                        {child.title}
                      </Typography>
                      <Chip
                        label={STATUS_OPTIONS.find((s) => s.value === child.status)?.label || child.status}
                        size="small"
                        sx={{
                          bgcolor: `${STATUS_OPTIONS.find((s) => s.value === child.status)?.color || '#94a3b8'}15`,
                          color: STATUS_OPTIONS.find((s) => s.value === child.status)?.color || '#94a3b8',
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="#94a3b8">
                No {issue.issue_type === 'epic' ? 'linked issues' : 'subtasks'} yet.
              </Typography>
            )}
          </Paper>

          {/* Comments */}
          <Paper
            elevation={0}
            sx={{ mt: 3, p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#475569" mb={2}>
              Comments ({comments.length})
            </Typography>

            {comments.length === 0 ? (
              <Typography variant="body2" color="#94a3b8" mb={2}>
                No comments yet. Be the first to comment.
              </Typography>
            ) : (
              <Stack spacing={2} mb={2}>
                {comments.map((comment, idx) => (
                  <Box
                    key={comment.id || comment._id || idx}
                    sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #f1f5f9' }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#6366f1' }}>
                        {(comment.author?.full_name || comment.author?.username || comment.author?.name)?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600} color="#334155" fontSize={13}>
                          {comment.author?.full_name || comment.author?.username || comment.author?.name || comment.author?.email || 'Unknown'}
                        </Typography>
                        <Typography variant="caption" color="#94a3b8">
                          {formatDate(comment.created_at)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" color="#475569" sx={{ whiteSpace: 'pre-wrap', ml: 5 }}>
                      {comment.content}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Add Comment */}
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: '#6366f1', mt: 0.5 }}>
                {(user?.full_name || user?.username || user?.name)?.[0]?.toUpperCase() || '?'}
              </Avatar>
              <Box flex={1}>
                <TextField
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  multiline
                  minRows={2}
                  maxRows={6}
                  fullWidth
                  placeholder="Add a comment..."
                  sx={sidebarFieldSx}
                />
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    size="small"
                    endIcon={<SendIcon sx={{ fontSize: 14 }} />}
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || submittingComment}
                    sx={{
                      textTransform: 'none',
                      bgcolor: '#6366f1',
                      fontWeight: 600,
                      borderRadius: 1.5,
                      '&:hover': { bgcolor: '#4f46e5' },
                    }}
                  >
                    Comment
                  </Button>
                </Box>
              </Box>
            </Stack>
          </Paper>
        </Box>

        {/* Sidebar - Right */}
        <Box flex={0.35}>
          <Paper
            elevation={0}
            sx={{ p: 2.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}
          >
            <Stack spacing={2.5}>
              {/* Status */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Status
                </Typography>
                <Select
                  value={issue.status || 'todo'}
                  onChange={(e) => updateField('status', e.target.value)}
                  fullWidth
                  size="small"
                  sx={{
                    bgcolor: `${statusMeta.color}15`,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: `${statusMeta.color}40` },
                    fontWeight: 600,
                    color: statusMeta.color,
                    fontSize: 14,
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s.value} value={s.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                        <span>{s.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Assignee */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Assignee
                </Typography>
                <Select
                  value={issue.assignee_id || ''}
                  onChange={(e) => updateField('assignee_id', e.target.value || null)}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={sidebarFieldSx}
                >
                  <MenuItem value="">Unassigned</MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u.id || u._id} value={u.id || u._id}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 10, bgcolor: '#6366f1' }}>
                          {(u.full_name || u.username || u.name)?.[0]?.toUpperCase() || '?'}
                        </Avatar>
                        <span>{u.full_name || u.username || u.name || u.email}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Priority */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Priority
                </Typography>
                <Select
                  value={issue.priority || 'medium'}
                  onChange={(e) => updateField('priority', e.target.value)}
                  fullWidth
                  size="small"
                  sx={sidebarFieldSx}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <MenuItem key={p.value} value={p.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
                        <span>{p.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Type */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Type
                </Typography>
                <Select
                  value={issue.issue_type || issue.type || 'task'}
                  onChange={(e) => updateField('type', e.target.value)}
                  fullWidth
                  size="small"
                  sx={sidebarFieldSx}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {t.icon}
                        <span>{t.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Sprint */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Sprint
                </Typography>
                <Select
                  value={issue.sprint_id || ''}
                  onChange={(e) => updateField('sprint_id', e.target.value || null)}
                  fullWidth
                  size="small"
                  displayEmpty
                  sx={sidebarFieldSx}
                >
                  <MenuItem value="">No Sprint</MenuItem>
                  {sprints.map((s) => (
                    <MenuItem key={s.id || s._id} value={s.id || s._id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* Parent Issue */}
              {issue.parent && (
                <Box>
                  <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                    Parent Issue
                  </Typography>
                  <Box
                    onClick={() => navigate(`/issue/${issue.parent_id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f8fafc' },
                    }}
                  >
                    {(TYPE_OPTIONS.find((t) => t.value === issue.parent.issue_type) || TYPE_OPTIONS[1]).icon}
                    <Typography variant="body2" fontWeight={600} color="#6366f1" fontSize={13}>
                      {issue.parent.issue_key}
                    </Typography>
                    <Typography variant="body2" color="#475569" fontSize={13} noWrap>
                      {issue.parent.title}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Story Points */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Story Points
                </Typography>
                <TextField
                  type="number"
                  value={issue.story_points ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    updateField('story_points', val);
                  }}
                  fullWidth
                  size="small"
                  placeholder="0"
                  inputProps={{ min: 0, max: 100 }}
                  sx={sidebarFieldSx}
                />
              </Box>

              {/* Labels */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Labels
                </Typography>
                <Autocomplete
                  multiple
                  freeSolo
                  options={labels.map((l) => l.name || l)}
                  value={(issue.labels || []).map((l) => typeof l === 'string' ? l : l.name)}
                  onChange={(_, newVal) => updateField('labels', newVal)}
                  renderTags={(value, getTagProps) =>
                    value.map((label, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={typeof label === 'string' ? label : label.name}
                        label={typeof label === 'string' ? label : label.name}
                        size="small"
                        sx={{
                          bgcolor: '#eef2ff',
                          color: '#6366f1',
                          fontWeight: 500,
                          fontSize: 12,
                          border: '1px solid #c7d2fe',
                        }}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} size="small" placeholder="Add labels" sx={sidebarFieldSx} />
                  )}
                />
              </Box>

              {/* Due Date */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Due Date
                </Typography>
                <TextField
                  type="date"
                  value={issue.due_date ? issue.due_date.slice(0, 10) : ''}
                  onChange={(e) => updateField('due_date', e.target.value || null)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  sx={sidebarFieldSx}
                />
              </Box>

              <Divider />

              {/* Reporter */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Reporter
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: '#8b5cf6' }}>
                    {(issue.reporter?.full_name || issue.reporter?.username || issue.reporter?.name)?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography variant="body2" color="#475569" fontSize={13}>
                    {issue.reporter?.full_name || issue.reporter?.username || issue.reporter?.name || issue.reporter?.email || 'Unknown'}
                  </Typography>
                </Stack>
              </Box>

              {/* Dates */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Created
                </Typography>
                <Typography variant="body2" color="#64748b" fontSize={13}>
                  {formatDate(issue.created_at)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" fontWeight={700} color="#64748b" mb={0.5} display="block">
                  Updated
                </Typography>
                <Typography variant="body2" color="#64748b" fontSize={13}>
                  {formatDate(issue.updated_at)}
                </Typography>
              </Box>

              <Divider />

              {/* Delete */}
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteOpen(true)}
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  borderColor: '#fca5a5',
                  color: '#ef4444',
                  '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444' },
                }}
              >
                Delete Issue
              </Button>
            </Stack>
          </Paper>
        </Box>
      </Stack>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Delete Issue
        </DialogTitle>
        <DialogContent>
          <DialogContentText color="#64748b">
            Are you sure you want to delete <strong>{issue.issue_key || issue.key}</strong>? This action cannot be undone
            and all comments will be permanently removed.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            disabled={deleting}
            sx={{
              textTransform: 'none',
              bgcolor: '#ef4444',
              fontWeight: 600,
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <CreateIssueDialog
        open={subtaskDialogOpen}
        onClose={() => setSubtaskDialogOpen(false)}
        projectId={issue.project_id}
        parentId={issue.id}
        onCreated={() => {
          setSubtaskDialogOpen(false);
          fetchIssue();
        }}
      />
    </Box>
  );
}
