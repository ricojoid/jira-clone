import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  Avatar,
  IconButton,
  Collapse,
  Divider,
  Skeleton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  DragIndicator as DragIcon,
  PlayArrow as StartIcon,
  BugReport as BugIcon,
  TaskAlt as TaskIcon,
  AutoStories as StoryIcon,
  Bolt as EpicIcon,
  InboxOutlined as EmptyIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { issueApi, sprintApi } from '../api';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';

const STATUS_COLORS = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  in_review: '#f59e0b',
  done: '#22c55e',
};

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const PRIORITY_COLORS = {
  highest: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
  lowest: '#22c55e',
};

const TYPE_ICONS = {
  bug: <BugIcon sx={{ color: '#ef4444', fontSize: 18 }} />,
  task: <TaskIcon sx={{ color: '#3b82f6', fontSize: 18 }} />,
  story: <StoryIcon sx={{ color: '#22c55e', fontSize: 18 }} />,
  epic: <EpicIcon sx={{ color: '#a855f7', fontSize: 18 }} />,
};

const SPRINT_STATUS_COLORS = {
  planned: '#94a3b8',
  active: '#3b82f6',
  completed: '#22c55e',
};

export default function BacklogPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [sprints, setSprints] = useState([]);
  const [backlogIssues, setBacklogIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState({});
  const [backlogExpanded, setBacklogExpanded] = useState(true);

  // Drag state
  const [draggedIssue, setDraggedIssue] = useState(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [contextIssue, setContextIssue] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sprintsRes, issuesRes] = await Promise.all([
        sprintApi.listByProject(projectId),
        issueApi.listByProject(projectId),
      ]);

      const sprintsData = sprintsRes.data || [];
      const issuesData = issuesRes.data || [];

      // Map issues to their sprints
      const sprintIds = new Set(sprintsData.map((s) => s.id || s._id));
      const sprintsWithIssues = sprintsData.map((sprint) => ({
        ...sprint,
        issues: issuesData.filter((i) => {
          const sid = i.sprint_id;
          return sid === (sprint.id || sprint._id);
        }),
      }));

      const unassigned = issuesData.filter((i) => !i.sprint_id || !sprintIds.has(i.sprint_id));

      setSprints(sprintsWithIssues);
      setBacklogIssues(unassigned);

      // Expand all sprints by default
      const expanded = {};
      sprintsData.forEach((s) => {
        expanded[s.id || s._id] = true;
      });
      setExpandedSprints(expanded);
    } catch (err) {
      console.error('Failed to fetch backlog data:', err);
      toast.error('Failed to load backlog');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleSprint = (sprintId) => {
    setExpandedSprints((prev) => ({ ...prev, [sprintId]: !prev[sprintId] }));
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

  const handleCreateSprint = async () => {
    try {
      await sprintApi.create({
        project_id: projectId,
        name: `Sprint ${sprints.length + 1}`,
      });
      toast.success('Sprint created');
      fetchData();
    } catch (err) {
      console.error('Failed to create sprint:', err);
      toast.error('Failed to create sprint');
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (issue) => {
    setDraggedIssue(issue);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSprint = async (sprintId) => {
    if (!draggedIssue) return;
    const issueId = draggedIssue.id || draggedIssue._id;
    try {
      await issueApi.update(issueId, { sprint_id: sprintId });
      toast.success('Issue moved');
      fetchData();
    } catch (err) {
      console.error('Failed to move issue:', err);
      toast.error('Failed to move issue');
    }
    setDraggedIssue(null);
  };

  const handleDropOnBacklog = async () => {
    if (!draggedIssue) return;
    const issueId = draggedIssue.id || draggedIssue._id;
    try {
      await issueApi.update(issueId, { sprint_id: null });
      toast.success('Issue moved to backlog');
      fetchData();
    } catch (err) {
      console.error('Failed to move issue:', err);
      toast.error('Failed to move issue');
    }
    setDraggedIssue(null);
  };

  const handleIssueContextMenu = (e, issue) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY });
    setContextIssue(issue);
  };

  const handleMoveToSprint = async (sprintId) => {
    if (!contextIssue) return;
    try {
      await issueApi.update(contextIssue.id || contextIssue._id, { sprint_id: sprintId || null });
      toast.success('Issue moved');
      fetchData();
    } catch {
      toast.error('Failed to move issue');
    }
    setContextMenu(null);
    setContextIssue(null);
  };

  const formatDateRange = (start, end) => {
    const fmt = (d) => {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    return `${fmt(start)} – ${fmt(end)}`;
  };

  const renderIssueRow = (issue) => {
    const issueId = issue.id || issue._id;
    return (
      <Box
        key={issueId}
        draggable
        onDragStart={() => handleDragStart(issue)}
        onContextMenu={(e) => handleIssueContextMenu(e, issue)}
        onClick={() => navigate(`/issue/${issueId}`)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          cursor: 'pointer',
          borderBottom: '1px solid #f1f5f9',
          '&:hover': { bgcolor: '#f8fafc' },
          '&:last-child': { borderBottom: 0 },
          opacity: draggedIssue && (draggedIssue.id || draggedIssue._id) === issueId ? 0.4 : 1,
        }}
      >
        <DragIcon sx={{ color: '#cbd5e1', fontSize: 18, mr: 1, cursor: 'grab' }} />
        <Box sx={{ mr: 1.5 }}>
          {TYPE_ICONS[issue.issue_type || issue.type] || TYPE_ICONS.task}
        </Box>
        <Typography variant="body2" fontWeight={600} color="#64748b" fontSize={12} sx={{ mr: 2, minWidth: 70 }}>
          {issue.issue_key || issue.key}
        </Typography>
        <Typography variant="body2" color="#1e293b" fontWeight={500} sx={{ flex: 1 }} noWrap>
          {issue.title}
        </Typography>
        <Chip
          label={STATUS_LABELS[issue.status] || issue.status}
          size="small"
          sx={{
            mx: 1,
            bgcolor: `${STATUS_COLORS[issue.status] || '#94a3b8'}18`,
            color: STATUS_COLORS[issue.status] || '#94a3b8',
            fontWeight: 600,
            fontSize: 11,
            height: 22,
            border: `1px solid ${STATUS_COLORS[issue.status] || '#94a3b8'}40`,
          }}
        />
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: PRIORITY_COLORS[issue.priority] || '#94a3b8',
            mx: 1,
          }}
          title={issue.priority}
        />
        <Avatar
          sx={{
            width: 24,
            height: 24,
            fontSize: 10,
            bgcolor: issue.assignee ? '#6366f1' : '#e2e8f0',
            color: issue.assignee ? '#fff' : '#94a3b8',
            ml: 1,
          }}
        >
          {(issue.assignee?.full_name || issue.assignee?.username || issue.assignee?.name)?.[0]?.toUpperCase() || '?'}
        </Avatar>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={36} />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={120} sx={{ mt: 2, borderRadius: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, maxWidth: '100%', mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700} color="#1e293b">
          Backlog
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateSprint}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              borderColor: '#e2e8f0',
              color: '#475569',
              '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
            }}
          >
            Create Sprint
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: '#6366f1',
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Create Issue
          </Button>
        </Stack>
      </Stack>

      {/* Sprint Sections */}
      {sprints.map((sprint) => {
        const sprintId = sprint.id || sprint._id;
        const isExpanded = expandedSprints[sprintId] !== false;
        return (
          <Paper
            key={sprintId}
            elevation={0}
            onDragOver={handleDragOver}
            onDrop={() => handleDropOnSprint(sprintId)}
            sx={{
              mb: 2,
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              bgcolor: '#ffffff',
              overflow: 'hidden',
            }}
          >
            {/* Sprint Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                px: 2,
                py: 1.5,
                bgcolor: '#f8fafc',
                borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none',
              }}
            >
              <IconButton size="small" onClick={() => toggleSprint(sprintId)} sx={{ mr: 1 }}>
                {isExpanded ? (
                  <CollapseIcon sx={{ fontSize: 20, color: '#64748b' }} />
                ) : (
                  <ExpandIcon sx={{ fontSize: 20, color: '#64748b' }} />
                )}
              </IconButton>
              <Box sx={{ flex: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="subtitle2" fontWeight={700} color="#1e293b">
                    {sprint.name}
                  </Typography>
                  <Chip
                    label={sprint.status || 'planned'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 11,
                      fontWeight: 600,
                      bgcolor: `${SPRINT_STATUS_COLORS[sprint.status] || '#94a3b8'}18`,
                      color: SPRINT_STATUS_COLORS[sprint.status] || '#94a3b8',
                      textTransform: 'capitalize',
                    }}
                  />
                  <Typography variant="caption" color="#94a3b8">
                    {formatDateRange(sprint.start_date, sprint.end_date)}
                  </Typography>
                  <Typography variant="caption" color="#64748b" fontWeight={600}>
                    {sprint.issues?.length || 0} issue{(sprint.issues?.length || 0) !== 1 ? 's' : ''}
                  </Typography>
                </Stack>
                {sprint.goal && (
                  <Typography variant="caption" color="#94a3b8" mt={0.25} display="block">
                    Goal: {sprint.goal}
                  </Typography>
                )}
              </Box>
              {sprint.status === 'planned' && sprint.issues?.length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<StartIcon sx={{ fontSize: 16 }} />}
                  onClick={() => handleStartSprint(sprint)}
                  sx={{
                    textTransform: 'none',
                    bgcolor: '#6366f1',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 1.5,
                    '&:hover': { bgcolor: '#4f46e5' },
                  }}
                >
                  Start Sprint
                </Button>
              )}
            </Box>

            {/* Sprint Issues */}
            <Collapse in={isExpanded}>
              {sprint.issues?.length === 0 ? (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="#94a3b8">
                    Drag issues here or create new ones
                  </Typography>
                </Box>
              ) : (
                sprint.issues.map(renderIssueRow)
              )}
            </Collapse>
          </Paper>
        );
      })}

      {/* Backlog Section */}
      <Paper
        elevation={0}
        onDragOver={handleDragOver}
        onDrop={handleDropOnBacklog}
        sx={{
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          bgcolor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Backlog Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 1.5,
            bgcolor: '#f8fafc',
            borderBottom: backlogExpanded ? '1px solid #e2e8f0' : 'none',
          }}
        >
          <IconButton size="small" onClick={() => setBacklogExpanded(!backlogExpanded)} sx={{ mr: 1 }}>
            {backlogExpanded ? (
              <CollapseIcon sx={{ fontSize: 20, color: '#64748b' }} />
            ) : (
              <ExpandIcon sx={{ fontSize: 20, color: '#64748b' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" fontWeight={700} color="#1e293b" sx={{ flex: 1 }}>
            Backlog
          </Typography>
          <Typography variant="caption" color="#64748b" fontWeight={600}>
            {backlogIssues.length} issue{backlogIssues.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Collapse in={backlogExpanded}>
          {backlogIssues.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <EmptyIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
              <Typography variant="body2" color="#94a3b8">
                No issues in the backlog
              </Typography>
            </Box>
          ) : (
            backlogIssues.map(renderIssueRow)
          )}
        </Collapse>
      </Paper>

      {/* Context Menu for moving issues between sprints */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={() => { setContextMenu(null); setContextIssue(null); }}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' },
        }}
      >
        <Typography variant="caption" color="#94a3b8" sx={{ px: 2, py: 0.5, display: 'block' }}>
          Move to
        </Typography>
        {sprints.map((sprint) => (
          <MenuItem
            key={sprint.id || sprint._id}
            onClick={() => handleMoveToSprint(sprint.id || sprint._id)}
            sx={{ fontSize: 13 }}
          >
            {sprint.name}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => handleMoveToSprint(null)} sx={{ fontSize: 13 }}>
          Backlog
        </MenuItem>
      </Menu>

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        onCreated={() => {
          setCreateOpen(false);
          fetchData();
        }}
      />
    </Box>
  );
}
