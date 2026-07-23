import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { boardApi, issueApi, userApi, projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/board/KanbanBoard';
import TaskDetailModal from '../components/board/TaskDetailModal';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';
import Button from '../components/ui/Button';

import DateFilterInput from '../components/ui/DateFilterInput';

const DEFAULT_COLUMNS = [
  { id: 'todo', name: 'To Do', status: 'todo', color: '#94a3b8' },
  { id: 'in_progress', name: 'In Progress', status: 'in_progress', color: '#3b82f6' },
  { id: 'in_review', name: 'In Review', status: 'in_review', color: '#f59e0b' },
  { id: 'done', name: 'Done', status: 'done', color: '#22c55e' },
];

export default function BoardPage() {
  const { projectId } = useParams();
  const { isPM } = useAuth();

  const [project, setProject] = useState(null);
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [issues, setIssues] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (default to empty string so all tasks show by default)
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDueDateFrom, setFilterDueDateFrom] = useState('');
  const [filterDueDateTo, setFilterDueDateTo] = useState('');

  // Modals
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBoardData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      const projRes = await projectApi.get(projectId);
      const projData = projRes.data;
      setProject(projData);

      const boardRes = await boardApi.listByProject(projectId);
      const boardData = Array.isArray(boardRes.data) ? boardRes.data[0] : boardRes.data;

      if (boardData && boardData.columns && boardData.columns.length > 0) {
        setBoard(boardData);
        const normColumns = boardData.columns.map((col) => {
          let status = col.status;
          if (!status && col.name) {
            status = col.name.toLowerCase().replace(/\s+/g, '_');
            if (status === 'to_do') status = 'todo';
          }
          return { ...col, status: status || 'todo' };
        });
        setColumns(normColumns);
      } else {
        setBoard(boardData || { name: 'Kanban Board' });
        setColumns(DEFAULT_COLUMNS);
      }

      const issueRes = await issueApi.listByProject(projectId, {
        assignee_id: filterAssignee || undefined,
        priority: filterPriority || undefined,
        issue_type: filterType || undefined,
      });
      setIssues(issueRes.data?.issues ?? issueRes.data ?? []);

      const userRes = await userApi.list();
      setAssignees(userRes.data || []);
    } catch (err) {
      console.error('Failed to fetch board data:', err);
      toast.error('Failed to load board information');
    } finally {
      setLoading(false);
    }
  }, [projectId, filterAssignee, filterPriority, filterType]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Filter issues by Due Date Range (From - To)
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const dueDateStr = issue.due_date || issue.dueDate;
      if (filterDueDateFrom) {
        if (!dueDateStr) return false;
        const issueDate = new Date(dueDateStr);
        const fromDate = new Date(filterDueDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (issueDate < fromDate) return false;
      }
      if (filterDueDateTo) {
        if (!dueDateStr) return false;
        const issueDate = new Date(dueDateStr);
        const toDate = new Date(filterDueDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (issueDate > toDate) return false;
      }
      return true;
    });
  }, [issues, filterDueDateFrom, filterDueDateTo]);

  const handleIssueMove = async (issueId, targetStatus, newIndex) => {
    setIssues((prev) =>
      prev.map((iss) => {
        if (iss._id === issueId || iss.id === issueId) {
          return { ...iss, status: targetStatus };
        }
        return iss;
      })
    );

    try {
      await issueApi.move(issueId, {
        status: targetStatus,
        position: newIndex,
      });
    } catch (err) {
      console.error('Failed to move issue:', err);
      toast.error('Failed to save issue movement');
      fetchBoardData();
    }
  };

  const handleIssueClick = (issue) => {
    setSelectedIssueId(issue.id || issue._id);
  };

  const handleAddIssue = () => {
    if (!isPM) {
      toast.error('Only Project Managers can create issues');
      return;
    }
    setCreateOpen(true);
  };

  const clearFilters = () => {
    setFilterAssignee('');
    setFilterPriority('');
    setFilterType('');
    setFilterDueDateFrom('');
    setFilterDueDateTo('');
  };

  const hasActiveFilters = filterAssignee || filterPriority || filterType || filterDueDateFrom || filterDueDateTo;

  if (loading && !project) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading board...</div>;
  }

  const isWaterfall = (project?.sdlc_type || '').toLowerCase() === 'waterfall';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {project?.name || 'Board'}
            </h2>
            <span
              className="badge"
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                backgroundColor: isWaterfall ? '#fef3c7' : '#e0e7ff',
                color: isWaterfall ? '#b45309' : '#4338ca',
                border: `1px solid ${isWaterfall ? '#fcd34d' : '#c7d2fe'}`,
              }}
            >
              {(project?.sdlc_type || 'scrum').toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {isWaterfall ? 'Waterfall Phase Board (UR ➔ DR ➔ PU ➔ ST ➔ UT ➔ TR ➔ IP ➔ MA)' : 'Kanban Board'}
          </div>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleAddIssue} disabled={!isPM}>
          Create Issue
        </Button>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.825rem' }}>
          <Filter size={15} />
          <span style={{ fontWeight: 600 }}>Filter:</span>
        </div>

        <select
          className="form-select"
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          style={{ width: 'auto', minWidth: 155, height: 34, padding: '0 30px 0 10px', fontSize: '0.8rem' }}
        >
          <option value="">All Assignees</option>
          {assignees.map((a) => (
            <option key={a.id || a._id} value={a.id || a._id}>
              {a.full_name || a.username}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ width: 'auto', minWidth: 135, height: 34, padding: '0 30px 0 10px', fontSize: '0.8rem' }}
        >
          <option value="">All Priorities</option>
          {['lowest', 'low', 'medium', 'high', 'highest'].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          className="form-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ width: 'auto', minWidth: 115, height: 34, padding: '0 30px 0 10px', fontSize: '0.8rem' }}
        >
          <option value="">All Types</option>
          {['task', 'bug', 'story', 'epic'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Due Date Range Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: 10 }}>
          <Calendar size={14} />
          <span>Due From:</span>
          <DateFilterInput
            value={filterDueDateFrom}
            onChange={(e) => setFilterDueDateFrom(e.target.value)}
            placeholder="--/--/----"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>To:</span>
          <DateFilterInput
            value={filterDueDateTo}
            onChange={(e) => setFilterDueDateTo(e.target.value)}
            placeholder="--/--/----"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Board Columns */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <KanbanBoard
          columns={columns}
          issues={filteredIssues}
          onIssueMove={handleIssueMove}
          onIssueClick={handleIssueClick}
        />
      </div>

      {/* Issue Detail Drawer */}
      <TaskDetailModal
        issueId={selectedIssueId}
        open={Boolean(selectedIssueId)}
        onClose={() => setSelectedIssueId(null)}
        onUpdated={fetchBoardData}
      />

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        onCreated={() => {
          setCreateOpen(false);
          fetchBoardData();
        }}
      />
    </div>
  );
}
