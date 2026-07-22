import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  Chip,
  Autocomplete,
  Avatar,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  BugReport as BugIcon,
  TaskAlt as TaskIcon,
  AutoStories as StoryIcon,
  Bolt as EpicIcon,
  AccountTree as SubtaskIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { issueApi, userApi, sprintApi } from '../../api';

const TYPE_OPTIONS = [
  { value: 'task', label: 'Task', icon: <TaskIcon sx={{ color: '#3b82f6', fontSize: 18 }} /> },
  { value: 'bug', label: 'Bug', icon: <BugIcon sx={{ color: '#ef4444', fontSize: 18 }} /> },
  { value: 'story', label: 'Story', icon: <StoryIcon sx={{ color: '#22c55e', fontSize: 18 }} /> },
  { value: 'epic', label: 'Epic', icon: <EpicIcon sx={{ color: '#a855f7', fontSize: 18 }} /> },
  { value: 'subtask', label: 'Subtask', icon: <SubtaskIcon sx={{ color: '#64748b', fontSize: 18 }} /> },
];

const PRIORITY_OPTIONS = [
  { value: 'highest', label: 'Highest', color: '#ef4444' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low', label: 'Low', color: '#3b82f6' },
  { value: 'lowest', label: 'Lowest', color: '#22c55e' },
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: '#e2e8f0' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '&.Mui-focused fieldset': { borderColor: '#6366f1' },
  },
};

const initialForm = {
  title: '',
  description: '',
  type: 'task',
  priority: 'medium',
  assignee_id: '',
  sprint_id: '',
  story_points: '',
  labels: [],
};

export default function CreateIssueDialog({ open, onClose, projectId, onCreated, parentId }) {
  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;

    const fetchData = async () => {
      try {
        const [usersRes, sprintsRes] = await Promise.all([
          userApi.list(),
          sprintApi.listByProject(projectId),
        ]);
        setUsers(usersRes.data || []);
        setSprints(sprintsRes.data || []);

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

  useEffect(() => {
    if (!open) {
      setForm(parentId ? { ...initialForm, type: 'subtask' } : initialForm);
    }
  }, [open, parentId]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
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
        project_id: projectId,
      };

      if (form.assignee_id) payload.assignee_id = form.assignee_id;
      if (form.sprint_id) payload.sprint_id = form.sprint_id;
      if (form.story_points !== '') payload.story_points = Number(form.story_points);
      if (parentId) payload.parent_id = parentId;
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#ffffff',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight={700} color="#1e293b">
          Create Issue
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon sx={{ color: '#94a3b8' }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2.5} mt={1}>
          {/* Title */}
          <TextField
            label="Title"
            value={form.title}
            onChange={handleChange('title')}
            fullWidth
            required
            placeholder="Enter issue title"
            autoFocus
            sx={fieldSx}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={form.description}
            onChange={handleChange('description')}
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            placeholder="Describe the issue..."
            sx={fieldSx}
          />

          {/* Type and Priority row */}
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Type</InputLabel>
              <Select
                value={form.type}
                label="Type"
                onChange={handleChange('type')}
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
            </FormControl>

            <FormControl fullWidth sx={fieldSx}>
              <InputLabel>Priority</InputLabel>
              <Select
                value={form.priority}
                label="Priority"
                onChange={handleChange('priority')}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: p.color,
                        }}
                      />
                      <span>{p.label}</span>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Assignee */}
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>Assignee</InputLabel>
            <Select
              value={form.assignee_id}
              label="Assignee"
              onChange={handleChange('assignee_id')}
              displayEmpty
            >
              <MenuItem value="">
                <Typography color="#94a3b8">Unassigned</Typography>
              </MenuItem>
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
          </FormControl>

          {/* Sprint */}
          <FormControl fullWidth sx={fieldSx}>
            <InputLabel>Sprint</InputLabel>
            <Select
              value={form.sprint_id}
              label="Sprint"
              onChange={handleChange('sprint_id')}
              displayEmpty
            >
              <MenuItem value="">
                <Typography color="#94a3b8">No Sprint (Backlog)</Typography>
              </MenuItem>
              {sprints.map((s) => (
                <MenuItem key={s.id || s._id} value={s.id || s._id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Story Points */}
          <TextField
            label="Story Points"
            type="number"
            value={form.story_points}
            onChange={handleChange('story_points')}
            fullWidth
            placeholder="0"
            inputProps={{ min: 0, max: 100 }}
            sx={fieldSx}
          />

          {/* Labels */}
          <Autocomplete
            multiple
            freeSolo
            options={labels.map((l) => l.name || l)}
            value={form.labels}
            onChange={(_, newVal) => setForm((prev) => ({ ...prev, labels: newVal }))}
            renderTags={(value, getTagProps) =>
              value.map((label, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={label}
                  label={label}
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
              <TextField
                {...params}
                label="Labels"
                placeholder="Add labels"
                sx={fieldSx}
              />
            )}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !form.title.trim()}
          sx={{
            textTransform: 'none',
            bgcolor: '#6366f1',
            fontWeight: 600,
            px: 4,
            borderRadius: 2,
            '&:hover': { bgcolor: '#4f46e5' },
            '&.Mui-disabled': { bgcolor: '#c7d2fe' },
          }}
        >
          {submitting ? 'Creating...' : 'Create Issue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
