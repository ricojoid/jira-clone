import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { boardApi, issueApi, userApi, projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/board/KanbanBoard';
import TaskDetailModal from '../components/board/TaskDetailModal';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';
import Button from '../components/ui/Button';

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

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBoardData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      const projRes = await projectApi.get(projectId);
      setProject(projRes.data);

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
  };

  const hasActiveFilters = filterAssignee || filterPriority || filterType;

  if (loading && !project) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading board...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {project?.name || 'Board'}
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Kanban Board
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
          style={{ width: 'auto', minWidth: 140, height: 32, fontSize: '0.8rem' }}
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
          style={{ width: 'auto', minWidth: 120, height: 32, fontSize: '0.8rem' }}
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
          style={{ width: 'auto', minWidth: 110, height: 32, fontSize: '0.8rem' }}
        >
          <option value="">All Types</option>
          {['task', 'bug', 'story', 'epic'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

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
          issues={issues}
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
