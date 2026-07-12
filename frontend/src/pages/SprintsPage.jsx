import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  Grid,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  FlagOutlined as GoalIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { sprintApi, issueApi } from '../api';

const STATUS_COLORS = {
  planned: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  active: { bg: '#eff6ff', text: '#3b82f6', border: '#bfdbfe' },
  completed: { bg: '#f0fdf4', text: '#22c55e', border: '#bbf7d0' },
};

const STATUS_LABELS = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed',
};

const initialSprintForm = {
  name: '',
  goal: '',
  start_date: '',
  end_date: '',
};

export default function SprintsPage() {
  const { projectId } = useParams();

  const [sprints, setSprints] = useState([]);
  const [issuesBySprintId, setIssuesBySprintId] = useState({});
  const [loading, setLoading] = useState(true);

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [sprintForm, setSprintForm] = useState(initialSprintForm);
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog
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

      // Group issues by sprint
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
    setEditingSprint(null);
    setSprintForm({
      ...initialSprintForm,
      name: `Sprint ${sprints.length + 1}`,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (sprint) => {
    setEditingSprint(sprint);
    setSprintForm({
      name: sprint.name || '',
      goal: sprint.goal || '',
      start_date: sprint.start_date ? sprint.start_date.slice(0, 10) : '',
      end_date: sprint.end_date ? sprint.end_date.slice(0, 10) : '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSprint(null);
    setSprintForm(initialSprintForm);
  };

  const handleSubmit = async () => {
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

      handleCloseDialog();
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
    } catch (err) {
      console.error('Failed to start sprint:', err);
      toast.error('Failed to start sprint');
    }
  };

  const handleCompleteSprint = async (sprint) => {
    try {
      await sprintApi.update(sprint.id || sprint._id, { status: 'completed' });
      toast.success(`Sprint "${sprint.name}" completed`);
      fetchData();
    } catch (err) {
      console.error('Failed to complete sprint:', err);
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
    } catch (err) {
      console.error('Failed to delete sprint:', err);
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateRange = (start, end) => {
    if (!start && !end) return 'No dates set';
    return `${formatDate(start)} – ${formatDate(end)}`;
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: '#e2e8f0' },
      '&:hover fieldset': { borderColor: '#cbd5e1' },
      '&.Mui-focused fieldset': { borderColor: '#6366f1' },
    },
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={36} />
        <Grid container spacing={2} mt={1}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} key={i}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, maxWidth: '100%', mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Sprints
          </Typography>
          <Typography variant="body2" color="#64748b" mt={0.5}>
            {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          sx={{
            bgcolor: '#6366f1',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: '#4f46e5' },
          }}
        >
          Create Sprint
        </Button>
      </Stack>

      {/* Sprint Cards */}
      {sprints.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            bgcolor: '#ffffff',
            py: 8,
            textAlign: 'center',
          }}
        >
          <CalendarIcon sx={{ fontSize: 56, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="#64748b" fontWeight={600}>
            No sprints yet
          </Typography>
          <Typography variant="body2" color="#94a3b8" mt={1}>
            Create your first sprint to organize your work
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{
              mt: 3,
              textTransform: 'none',
              borderColor: '#6366f1',
              color: '#6366f1',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': { borderColor: '#4f46e5', bgcolor: '#eef2ff' },
            }}
          >
            Create Sprint
          </Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {sprints.map((sprint) => {
            const sprintId = sprint.id || sprint._id;
            const statusStyle = STATUS_COLORS[sprint.status] || STATUS_COLORS.planned;
            const progress = getSprintProgress(sprintId);

            return (
              <Paper
                key={sprintId}
                elevation={0}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  bgcolor: '#ffffff',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
                }}
              >
                {/* Sprint Card Header */}
                <Box sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                        <Typography variant="h6" fontWeight={700} color="#1e293b" fontSize={18}>
                          {sprint.name}
                        </Typography>
                        <Chip
                          label={STATUS_LABELS[sprint.status] || sprint.status}
                          size="small"
                          sx={{
                            bgcolor: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1px solid ${statusStyle.border}`,
                            fontWeight: 600,
                            fontSize: 12,
                            height: 24,
                            textTransform: 'capitalize',
                          }}
                        />
                      </Stack>

                      {sprint.goal && (
                        <Stack direction="row" alignItems="flex-start" spacing={0.5} mb={1}>
                          <GoalIcon sx={{ color: '#94a3b8', fontSize: 16, mt: 0.25 }} />
                          <Typography variant="body2" color="#64748b" fontSize={13}>
                            {sprint.goal}
                          </Typography>
                        </Stack>
                      )}

                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <CalendarIcon sx={{ color: '#94a3b8', fontSize: 14 }} />
                        <Typography variant="caption" color="#94a3b8">
                          {formatDateRange(sprint.start_date, sprint.end_date)}
                        </Typography>
                      </Stack>
                    </Box>

                    {/* Actions */}
                    <Stack direction="row" spacing={0.5}>
                      {sprint.status === 'planned' && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<StartIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handleStartSprint(sprint)}
                          disabled={progress.total === 0}
                          sx={{
                            textTransform: 'none',
                            bgcolor: '#6366f1',
                            fontWeight: 600,
                            fontSize: 12,
                            borderRadius: 1.5,
                            mr: 0.5,
                            '&:hover': { bgcolor: '#4f46e5' },
                          }}
                        >
                          Start
                        </Button>
                      )}
                      {sprint.status === 'active' && (
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CompleteIcon sx={{ fontSize: 16 }} />}
                          onClick={() => handleCompleteSprint(sprint)}
                          sx={{
                            textTransform: 'none',
                            bgcolor: '#22c55e',
                            fontWeight: 600,
                            fontSize: 12,
                            borderRadius: 1.5,
                            mr: 0.5,
                            '&:hover': { bgcolor: '#16a34a' },
                          }}
                        >
                          Complete
                        </Button>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => openEditDialog(sprint)}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#6366f1' } }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => { setDeletingSprint(sprint); setDeleteOpen(true); }}
                        sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {/* Progress */}
                  <Box sx={{ mt: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" color="#64748b" fontWeight={600}>
                        Progress
                      </Typography>
                      <Typography variant="caption" color="#64748b">
                        {progress.done} / {progress.total} issues done
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={progress.pct}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#f1f5f9',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          bgcolor: progress.pct === 100 ? '#22c55e' : '#6366f1',
                        },
                      }}
                    />
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Create / Edit Sprint Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700} color="#1e293b">
            {editingSprint ? 'Edit Sprint' : 'Create Sprint'}
          </Typography>
          <IconButton onClick={handleCloseDialog} size="small">
            <CloseIcon sx={{ color: '#94a3b8' }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Sprint Name"
              value={sprintForm.name}
              onChange={(e) => setSprintForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              required
              autoFocus
              sx={fieldSx}
            />
            <TextField
              label="Goal"
              value={sprintForm.goal}
              onChange={(e) => setSprintForm((p) => ({ ...p, goal: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
              maxRows={4}
              placeholder="What is the sprint goal?"
              sx={fieldSx}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Start Date"
                type="date"
                value={sprintForm.start_date}
                onChange={(e) => setSprintForm((p) => ({ ...p, start_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
              <TextField
                label="End Date"
                type="date"
                value={sprintForm.end_date}
                onChange={(e) => setSprintForm((p) => ({ ...p, end_date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
                sx={fieldSx}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || !sprintForm.name.trim()}
            sx={{
              textTransform: 'none',
              bgcolor: '#6366f1',
              fontWeight: 600,
              px: 4,
              borderRadius: 2,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            {submitting
              ? editingSprint ? 'Saving...' : 'Creating...'
              : editingSprint ? 'Save Changes' : 'Create Sprint'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingSprint(null); }}
        PaperProps={{ sx: { borderRadius: 3, maxWidth: 420 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#1e293b' }}>
          Delete Sprint
        </DialogTitle>
        <DialogContent>
          <DialogContentText color="#64748b">
            Are you sure you want to delete <strong>{deletingSprint?.name}</strong>? Issues in this
            sprint will be moved to the backlog.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { setDeleteOpen(false); setDeletingSprint(null); }}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSprint}
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
    </Box>
  );
}
