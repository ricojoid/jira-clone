import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Skeleton,
  Tooltip,
} from '@mui/material';
import {
  FolderOpen,
  Assignment,
  Autorenew,
  CheckCircle,
  Add,
  CalendarToday,
  BugReport,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { projectApi, issueApi } from '../api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const todayString = () =>
  new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const generateKey = (name) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 5);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, bgColor, loading }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 3,
        height: '100%',
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: bgColor,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 26, color: '#6366f1' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={48} height={36} />
          ) : (
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project, issueCount, onClick }) {
  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 3,
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 4px 24px rgba(99,102,241,0.10)',
          borderColor: '#c7d2fe',
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: '#6366f1',
                width: 40,
                height: 40,
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {project.key?.slice(0, 2) ?? 'P'}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                noWrap
                sx={{ lineHeight: 1.3 }}
              >
                {project.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {project.key}
              </Typography>
            </Box>
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              flexGrow: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {project.description || 'No description provided.'}
          </Typography>

          {/* Footer */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 'auto',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Tooltip title="Owner" arrow>
                <Avatar
                  src={project.owner?.avatar}
                  sx={{ width: 24, height: 24, fontSize: 11 }}
                >
                  {project.owner?.full_name?.[0] ?? 'U'}
                </Avatar>
              </Tooltip>
              <Chip
                icon={<BugReport sx={{ fontSize: 14 }} />}
                label={`${issueCount ?? 0} issues`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: 12,
                  bgcolor: '#eef2ff',
                  color: '#6366f1',
                  '& .MuiChip-icon': { color: '#6366f1' },
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarToday sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled">
                {formatDate(project.created_at)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [issueCounts, setIssueCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Stats derived from data
  const [stats, setStats] = useState({
    totalProjects: 0,
    myIssues: 0,
    inProgress: 0,
    completed: 0,
  });

  // Create project dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', key: '', description: '' });

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await projectApi.list();
      const projectList = res.data || [];
      setProjects(projectList);

      // Fetch issue counts per project in parallel
      const counts = {};
      let totalIssues = 0;
      let inProgress = 0;
      let completed = 0;

      await Promise.all(
        projectList.map(async (p) => {
          try {
            const issuesRes = await issueApi.listByProject(p.id);
            const issueArr = Array.isArray(issuesRes.data) ? issuesRes.data : [];
            counts[p.id] = issueArr.length;
            totalIssues += issueArr.length;

            issueArr.forEach((issue) => {
              const s = (issue.status ?? '').toLowerCase();
              if (s === 'in_progress' || s === 'in progress') inProgress += 1;
              if (s === 'done' || s === 'completed' || s === 'closed') completed += 1;
            });
          } catch {
            counts[p.id] = 0;
          }
        }),
      );

      setIssueCounts(counts);
      setStats({
        totalProjects: projectList.length,
        myIssues: totalIssues,
        inProgress,
        completed,
      });
    } catch (err) {
      toast.error('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Create project
  // -----------------------------------------------------------------------

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, name, key: generateKey(name) }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    try {
      setCreating(true);
      await projectApi.create({
        name: form.name.trim(),
        key: form.key || generateKey(form.name),
        description: form.description.trim(),
      });
      toast.success('Project created successfully');
      setDialogOpen(false);
      setForm({ name: '', key: '', description: '' });
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: FolderOpen, bg: '#eef2ff' },
    { label: 'My Issues', value: stats.myIssues, icon: Assignment, bg: '#dbeafe' },
    { label: 'In Progress', value: stats.inProgress, icon: Autorenew, bg: '#fef3c7' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, bg: '#dcfce7' },
  ];

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
        {/* ---- Welcome header ---- */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#1e293b' }}>
            Welcome back, {user?.full_name ?? 'User'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            {todayString()}
          </Typography>
        </Box>

        {/* ---- Stats cards ---- */}
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {statCards.map((s) => (
            <Grid item xs={6} md={3} key={s.label}>
              <StatCard
                icon={s.icon}
                label={s.label}
                value={s.value}
                bgColor={s.bg}
                loading={loading}
              />
            </Grid>
          ))}
        </Grid>

        {/* ---- Quick Actions ---- */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setDialogOpen(true)}
            sx={{
              bgcolor: '#6366f1',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Create Project
          </Button>
        </Box>

        {/* ---- Projects list ---- */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1e293b' }}>
            Your Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        {loading ? (
          <Grid container spacing={2.5}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
          </Grid>
        ) : projects.length === 0 ? (
          <Card
            elevation={0}
            sx={{
              border: '1px solid #e2e8f0',
              borderRadius: 3,
              textAlign: 'center',
              py: 6,
              px: 3,
            }}
          >
            <FolderOpen sx={{ fontSize: 48, color: '#cbd5e1', mb: 1.5 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
              No projects yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              Create your first project to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setDialogOpen(true)}
              sx={{
                bgcolor: '#6366f1',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&:hover': { bgcolor: '#4f46e5' },
              }}
            >
              Create Project
            </Button>
          </Card>
        ) : (
          <Grid container spacing={2.5}>
            {projects.map((project) => (
              <Grid item xs={12} sm={6} md={4} key={project.id}>
                <ProjectCard
                  project={project}
                  issueCount={issueCounts[project.id]}
                  onClick={() => navigate(`/board/${project.id}`)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* ---- Create Project Dialog ---- */}
      <Dialog
        open={dialogOpen}
        onClose={() => !creating && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Create New Project</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '12px !important' }}>
          <TextField
            label="Project Name"
            placeholder="e.g. Marketing Website"
            value={form.name}
            onChange={handleNameChange}
            fullWidth
            autoFocus
            required
            size="small"
          />
          <TextField
            label="Key"
            placeholder="e.g. MW"
            value={form.key}
            onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value.toUpperCase() }))}
            fullWidth
            size="small"
            helperText="Auto-generated from name. Used as issue prefix."
            inputProps={{ maxLength: 5 }}
          />
          <TextField
            label="Description"
            placeholder="Brief description of the project"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={creating}
            sx={{ textTransform: 'none', color: '#64748b' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !form.name.trim()}
            sx={{
              bgcolor: '#6366f1',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              px: 3,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
