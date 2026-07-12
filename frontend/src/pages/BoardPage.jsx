import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import toast from 'react-hot-toast';
import { boardApi, issueApi, projectApi } from '../api';
import KanbanBoard from '../components/board/KanbanBoard';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';

// Default column definitions matching typical Jira-like statuses
const DEFAULT_COLUMNS = [
  { id: 'todo', status: 'todo', name: 'To Do' },
  { id: 'in_progress', status: 'in_progress', name: 'In Progress' },
  { id: 'in_review', status: 'in_review', name: 'In Review' },
  { id: 'done', status: 'done', name: 'Done' },
];

const STATUS_DISPLAY_MAP = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
};

const PRIORITY_OPTIONS = ['highest', 'high', 'medium', 'low', 'lowest'];
const TYPE_OPTIONS = ['bug', 'story', 'task', 'epic', 'subtask'];

const nameToStatus = (name) => {
  const normalized = name.toLowerCase().trim();
  if (normalized === 'to do' || normalized === 'todo') return 'todo';
  if (normalized === 'in progress' || normalized === 'in_progress') return 'in_progress';
  if (normalized === 'in review' || normalized === 'in_review') return 'in_review';
  if (normalized === 'done') return 'done';
  return normalized;
};

export default function BoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projectRes, boardRes, issueRes] = await Promise.allSettled([
        projectApi.get(projectId),
        boardApi.listByProject(projectId),
        issueApi.listByProject(projectId),
      ]);

      if (projectRes.status === 'fulfilled') {
        setProject(projectRes.value?.data || projectRes.value);
      }

      if (boardRes.status === 'fulfilled') {
        const boards = boardRes.value?.data || boardRes.value || [];
        const board = Array.isArray(boards) ? boards[0] : boards;
        if (board?.columns && board.columns.length > 0) {
          setColumns(
            board.columns.map((col) => {
              const status = col.status || nameToStatus(col.name);
              return {
                id: col.id || col._id || status,
                status: status,
                name: col.name || col.title || STATUS_DISPLAY_MAP[status] || status,
              };
            }),
          );
        }
      }

      if (issueRes.status === 'fulfilled') {
        const issueData = issueRes.value?.data || issueRes.value || [];
        setIssues(Array.isArray(issueData) ? issueData : []);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
      toast.error('Failed to load board data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Fetch project, board, and issues
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Extract unique assignees for filter dropdown
  const assignees = useMemo(() => {
    const map = new Map();
    issues.forEach((issue) => {
      if (issue.assignee) {
        const id = issue.assignee.id || issue.assignee._id;
        if (id && !map.has(id)) {
          map.set(id, issue.assignee);
        }
      }
    });
    return Array.from(map.values());
  }, [issues]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (
        assigneeFilter &&
        (issue.assignee?.id || issue.assignee?._id) !== assigneeFilter
      ) {
        return false;
      }
      if (priorityFilter && issue.priority !== priorityFilter) {
        return false;
      }
      if (typeFilter && (issue.issue_type || issue.type) !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [issues, assigneeFilter, priorityFilter, typeFilter]);

  // Map issues into columns by status
  const issuesByColumn = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      map[col.id] = [];
    });
    filteredIssues.forEach((issue) => {
      const status = issue.status || 'todo';
      const col = columns.find((c) => c.status === status);
      const colId = col ? col.id : columns[0]?.id;
      if (colId && map[colId]) {
        map[colId].push(issue);
      }
    });
    // Sort by position within each column
    Object.keys(map).forEach((colId) => {
      map[colId].sort(
        (a, b) => (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0),
      );
    });
    return map;
  }, [filteredIssues, columns]);

  // Handle drag-end: update issue status and position
  const handleMoveIssue = useCallback(
    async (issueId, newStatus, newPosition) => {
      // Optimistic update
      setIssues((prev) =>
        prev.map((issue) => {
          if ((issue.id || issue._id) === issueId) {
            return { ...issue, status: newStatus, position: newPosition };
          }
          return issue;
        }),
      );

      try {
        await issueApi.update(issueId, {
          status: newStatus,
          position: newPosition,
        });
      } catch (err) {
        console.error('Failed to move issue:', err);
        toast.error(err.response?.data?.detail || 'Failed to update issue');
        // Refetch on error
        try {
          const res = await issueApi.listByProject(projectId);
          setIssues(res?.data || res || []);
        } catch {
          // silent
        }
      }
    },
    [projectId],
  );

  const handleIssueClick = useCallback(
    (issue) => {
      const issueId = issue.id || issue._id;
      navigate(`/issue/${issueId}`);
    },
    [navigate],
  );

  const handleAddIssue = useCallback(
    () => {
      setCreateOpen(true);
    },
    [],
  );

  const hasActiveFilters = assigneeFilter || priorityFilter || typeFilter;

  const clearFilters = () => {
    setAssigneeFilter('');
    setPriorityFilter('');
    setTypeFilter('');
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0.5 }}>
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          pt: 1,
          pb: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {project?.name || project?.title || 'Board'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {project?.key ? `${project.key} Board` : 'Kanban Board'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 1.5,
            px: 2.5,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          }}
        >
          Create Issue
        </Button>
      </Box>

      {/* Filter bar */}
      <Box
        sx={{
          px: 1.5,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        <FilterListIcon sx={{ color: 'text.secondary', fontSize: 20 }} />

        {/* Assignee filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Assignee</InputLabel>
          <Select
            value={assigneeFilter}
            label="Assignee"
            onChange={(e) => setAssigneeFilter(e.target.value)}
            sx={{ borderRadius: 1.5, fontSize: '0.85rem' }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {assignees.map((a) => (
              <MenuItem key={a.id || a._id} value={a.id || a._id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar
                    src={a.avatar || a.avatarUrl}
                    sx={{ width: 20, height: 20, fontSize: '0.65rem' }}
                  >
                    {(a.name || a.displayName || '?').charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="body2">
                    {a.name || a.displayName}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Priority filter */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priorityFilter}
            label="Priority"
            onChange={(e) => setPriorityFilter(e.target.value)}
            sx={{ borderRadius: 1.5, fontSize: '0.85rem' }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {PRIORITY_OPTIONS.map((p) => (
              <MenuItem key={p} value={p} sx={{ textTransform: 'capitalize' }}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Type filter */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ borderRadius: 1.5, fontSize: '0.85rem' }}
          >
            <MenuItem value="">
              <em>All</em>
            </MenuItem>
            {TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                {t}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Tooltip title="Clear all filters" arrow>
            <IconButton size="small" onClick={clearFilters} sx={{ ml: 0.5 }}>
              <ClearIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}

        {hasActiveFilters && (
          <Chip
            label={`${filteredIssues.length} of ${issues.length} issues`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: 'primary.50',
              color: 'primary.700',
            }}
          />
        )}
      </Box>

      {/* Board */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <KanbanBoard
          columns={columns}
          issuesByColumn={issuesByColumn}
          onMoveIssue={handleMoveIssue}
          onIssueClick={handleIssueClick}
          onAddIssue={handleAddIssue}
        />
      </Box>

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
