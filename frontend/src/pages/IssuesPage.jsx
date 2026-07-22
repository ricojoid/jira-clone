import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  InputAdornment,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  BugReport as BugIcon,
  TaskAlt as TaskIcon,
  AutoStories as StoryIcon,
  Bolt as EpicIcon,
  AccountTree as SubtaskIcon,
  InboxOutlined as EmptyIcon,
} from '@mui/icons-material';
import { projectApi, issueApi } from '../api';
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

const PRIORITY_LABELS = {
  highest: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  lowest: 'Lowest',
};

const TYPE_ICONS = {
  bug: <BugIcon sx={{ color: '#ef4444', fontSize: 20 }} />,
  task: <TaskIcon sx={{ color: '#3b82f6', fontSize: 20 }} />,
  story: <StoryIcon sx={{ color: '#22c55e', fontSize: 20 }} />,
  epic: <EpicIcon sx={{ color: '#a855f7', fontSize: 20 }} />,
  subtask: <SubtaskIcon sx={{ color: '#64748b', fontSize: 20 }} />,
};

const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES = ['highest', 'high', 'medium', 'low', 'lowest'];
const TYPES = ['bug', 'task', 'story', 'epic', 'subtask'];

export default function IssuesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [issues, setIssues] = useState([]);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectRes, issuesRes, membersRes] = await Promise.all([
        projectApi.get(projectId),
        issueApi.listByProject(projectId),
        projectApi.listMembers(projectId).catch(() => ({ data: [] })),
      ]);
      setProject(projectRes.data);
      setIssues(issuesRes.data);
      setMembers(membersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...issues];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          (i.issue_key || i.key)?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((i) => i.status === statusFilter);
    if (priorityFilter) result = result.filter((i) => i.priority === priorityFilter);
    if (typeFilter) result = result.filter((i) => (i.issue_type || i.type) === typeFilter);
    if (assigneeFilter) result = result.filter((i) => i.assignee_id === assigneeFilter);

    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'priority') {
        const order = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 };
        aVal = order[a.priority] ?? 5;
        bVal = order[b.priority] ?? 5;
      } else {
        aVal = new Date(a[sortBy] || 0).getTime();
        bVal = new Date(b[sortBy] || 0).getTime();
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [issues, search, statusFilter, priorityFilter, typeFilter, assigneeFilter, sortBy, sortDir]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getAssigneeName = (issue) => {
    if (issue.assignee) return issue.assignee.full_name || issue.assignee.username || issue.assignee.name || issue.assignee.email;
    return 'Unassigned';
  };

  const getAssigneeAvatar = (issue) => {
    if (issue.assignee) return (issue.assignee.full_name || issue.assignee.username || issue.assignee.name)?.[0]?.toUpperCase() || '?';
    return '?';
  };

  return (
    <Box sx={{ p: 1, maxWidth: '100%', mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1e293b">
            Issues
          </Typography>
          {project && (
            <Typography variant="body2" color="#64748b" mt={0.5}>
              {project.name} &middot; {issues.length} issue{issues.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{
            bgcolor: '#6366f1',
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 3,
            '&:hover': { bgcolor: '#4f46e5' },
          }}
        >
          Create Issue
        </Button>
      </Stack>

      {/* Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: '1px solid #e2e8f0',
          borderRadius: 2,
          bgcolor: '#ffffff',
        }}
      >
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 220, flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {PRIORITIES.map((p) => (
                <MenuItem key={p} value={p}>{PRIORITY_LABELS[p]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Assignee</InputLabel>
            <Select
              value={assigneeFilter}
              label="Assignee"
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {members.map((m) => {
                const u = m.user || m;
                return (
                  <MenuItem key={u.id || u._id} value={u.id || u._id}>
                    {u.full_name || u.username || u.name || u.email}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Issues Table */}
      {loading ? (
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={52} sx={{ mx: 2, my: 1, borderRadius: 1 }} />
          ))}
        </Paper>
      ) : filtered.length === 0 ? (
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
          <EmptyIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
          <Typography variant="h6" color="#64748b" fontWeight={600}>
            No issues found
          </Typography>
          <Typography variant="body2" color="#94a3b8" mt={1}>
            {issues.length === 0
              ? 'Create your first issue to get started'
              : 'Try adjusting your filters'}
          </Typography>
          {issues.length === 0 && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
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
              Create Issue
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#ffffff' }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ width: 44, py: 1.5 }} />
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, width: 100 }}>
                  Key
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5 }}>
                  Title
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, width: 120 }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, width: 110 }}>
                  Priority
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, width: 140 }}>
                  Assignee
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', py: 1.5, width: 120 }}>
                  <TableSortLabel
                    active={sortBy === 'created_at'}
                    direction={sortBy === 'created_at' ? sortDir : 'desc'}
                    onClick={() => handleSort('created_at')}
                  >
                    Created
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((issue) => (
                <TableRow
                  key={issue.id || issue._id}
                  hover
                  onClick={() => navigate(`/issue/${issue.id || issue._id}`)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#f8fafc' },
                    '&:last-child td': { borderBottom: 0 },
                  }}
                >
                  <TableCell sx={{ py: 1.5, textAlign: 'center' }}>
                    {TYPE_ICONS[issue.issue_type || issue.type] || TYPE_ICONS.task}
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} color="#64748b" fontSize={13}>
                      {issue.issue_key || issue.key}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight={500} color="#1e293b" noWrap sx={{ maxWidth: 400 }}>
                      {issue.title}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip
                      label={STATUS_LABELS[issue.status] || issue.status}
                      size="small"
                      sx={{
                        bgcolor: `${STATUS_COLORS[issue.status] || '#94a3b8'}18`,
                        color: STATUS_COLORS[issue.status] || '#94a3b8',
                        fontWeight: 600,
                        fontSize: 12,
                        border: `1px solid ${STATUS_COLORS[issue.status] || '#94a3b8'}40`,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip
                      label={PRIORITY_LABELS[issue.priority] || issue.priority}
                      size="small"
                      sx={{
                        bgcolor: `${PRIORITY_COLORS[issue.priority] || '#94a3b8'}18`,
                        color: PRIORITY_COLORS[issue.priority] || '#94a3b8',
                        fontWeight: 600,
                        fontSize: 12,
                        border: `1px solid ${PRIORITY_COLORS[issue.priority] || '#94a3b8'}40`,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        sx={{
                          width: 26,
                          height: 26,
                          fontSize: 12,
                          bgcolor: issue.assignee ? '#6366f1' : '#cbd5e1',
                        }}
                      >
                        {getAssigneeAvatar(issue)}
                      </Avatar>
                      <Typography variant="body2" color="#475569" fontSize={13} noWrap>
                        {getAssigneeName(issue)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" color="#64748b" fontSize={13}>
                      {formatDate(issue.created_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
