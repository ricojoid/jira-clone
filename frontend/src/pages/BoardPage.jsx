import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Calendar, FileSpreadsheet, Search, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { boardApi, issueApi, userApi, projectApi } from '../api';
import { useAuth } from '../context/AuthContext';
import KanbanBoard from '../components/board/KanbanBoard';
import TaskDetailModal from '../components/board/TaskDetailModal';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';
import Button from '../components/ui/Button';

import DateFilterInput from '../components/ui/DateFilterInput';
import { exportBoardToExcel } from '../utils/excelExport';

const DEFAULT_COLUMNS = [
  { id: 'todo', name: 'To Do', status: 'todo', color: '#64748b' },
  { id: 'in_progress', name: 'In Progress', status: 'in_progress', color: '#2563eb' },
  { id: 'ready_to_review_fid', name: 'Ready to Review FID', status: 'ready_to_review_fid', color: '#7c3aed' },
  { id: 'fid_review', name: 'FID Review', status: 'fid_review', color: '#9333ea' },
  { id: 'ready_to_is_review', name: 'Ready to IS Review', status: 'ready_to_is_review', color: '#d97706' },
  { id: 'is_review', name: 'IS Review', status: 'is_review', color: '#ca8a04' },
  { id: 'done', name: 'Done', status: 'done', color: '#16a34a' },
  { id: 'cancelled', name: 'Cancelled', status: 'cancelled', color: '#ef4444' },
];

export default function BoardPage() {
  const { projectId } = useParams();
  const { isPM, user } = useAuth();

  const [project, setProject] = useState(null);
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [issues, setIssues] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters (default to current user ID for regular members, empty for PMs)
  const [filterTitle, setFilterTitle] = useState('');
  const [filterRaisedBy, setFilterRaisedBy] = useState('');
  const [filterRaisedDateFrom, setFilterRaisedDateFrom] = useState('');
  const [filterRaisedDateTo, setFilterRaisedDateTo] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDueDateFrom, setFilterDueDateFrom] = useState('');
  const [filterDueDateTo, setFilterDueDateTo] = useState('');

  const defaultFilterSet = useRef(false);

  useEffect(() => {
    if (user && !defaultFilterSet.current) {
      defaultFilterSet.current = true;
      if (!isPM) {
        setFilterAssignee(String(user.id));
      }
    }
  }, [user, isPM]);

  // Modals
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchBoardData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);

      const [projRes, boardRes, issueRes, membersRes] = await Promise.all([
        projectApi.get(projectId).catch((err) => {
          console.error('Failed fetching project details:', err);
          return { data: null };
        }),
        boardApi.listByProject(projectId).catch((err) => {
          console.error('Failed fetching boards:', err);
          return { data: [] };
        }),
        issueApi
          .listByProject(projectId, {
            // Convert assignee filter to a number if present, as the backend expects an integer.
            assignee_id: filterAssignee ? Number(filterAssignee) : undefined,
            priority: filterPriority || undefined,
            issue_type: filterType || undefined,
            title: filterTitle || undefined,
            raised_by_name: filterRaisedBy || undefined,
            raised_date_from: filterRaisedDateFrom || undefined,
            raised_date_to: filterRaisedDateTo || undefined,
          })
          .catch((err) => {
            console.error('Failed fetching board issues:', err);
            return { data: [] };
          }),
        projectApi.listMembers(projectId).catch((err) => {
          console.error('Failed fetching project members:', err);
          return { data: [] };
        }),
      ]);

      if (projRes.data) {
        setProject(projRes.data);
      }

      const boardData = Array.isArray(boardRes.data) ? boardRes.data[0] : boardRes.data;

      if (boardData && boardData.columns && boardData.columns.length > 0) {
        setBoard(boardData);
        let normColumns = boardData.columns.map((col) => {
          let status = col.status;
          if (!status && col.name) {
            status = col.name.toLowerCase().replace(/\s+/g, '_');
            if (status === 'to_do') status = 'todo';
          }
          return { ...col, status: status || 'todo' };
        });

        // Ensure all default status columns exist
        DEFAULT_COLUMNS.forEach((defCol) => {
          const exists = normColumns.some(
            (c) => (c.status || '').toLowerCase() === defCol.status
          );
          if (!exists) {
            normColumns.push({
              id: defCol.id,
              name: defCol.name,
              status: defCol.status,
              color: defCol.color,
              position: normColumns.length,
            });
          }
        });

        setColumns(normColumns);
      } else {
        setBoard(boardData || { name: 'Kanban Board' });
        setColumns(DEFAULT_COLUMNS);
      }

      setIssues(issueRes.data?.issues ?? issueRes.data ?? []);
      setAssignees(membersRes.data || []);
    } catch (err) {
      console.error('Failed to fetch board data:', err);
      toast.error('Failed to load board information');
    } finally {
      setLoading(false);
    }
  }, [projectId, filterAssignee, filterPriority, filterType, filterTitle, filterRaisedBy, filterRaisedDateFrom, filterRaisedDateTo]);

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
    setIssues((prev) => {
      const cloned = [...prev];
      const targetIdx = cloned.findIndex((i) => (i.id || i._id) === issueId);
      if (targetIdx === -1) return prev;

      const [movedItem] = cloned.splice(targetIdx, 1);
      const updatedItem = {
        ...movedItem,
        status: targetStatus,
        position: newIndex,
      };

      // Items currently belonging to targetStatus in current order
      const targetStatusItems = cloned.filter(
        (i) => (i.status || 'todo').toLowerCase() === targetStatus.toLowerCase()
      );

      const safeIndex = Math.max(0, Math.min(newIndex, targetStatusItems.length));

      if (targetStatusItems.length === 0 || safeIndex >= targetStatusItems.length) {
        cloned.push(updatedItem);
      } else {
        const pivotItem = targetStatusItems[safeIndex];
        const insertIdx = cloned.indexOf(pivotItem);
        if (insertIdx !== -1) {
          cloned.splice(insertIdx, 0, updatedItem);
        } else {
          cloned.push(updatedItem);
        }
      }

      // Re-assign positions sequentially for targetStatus items
      let posCounter = 0;
      return cloned.map((item) => {
        if ((item.status || 'todo').toLowerCase() === targetStatus.toLowerCase()) {
          const newItem = { ...item, position: posCounter };
          posCounter++;
          return newItem;
        }
        return item;
      });
    });

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
    setCreateOpen(true);
  };

  const clearFilters = () => {
    setFilterTitle('');
    setFilterRaisedBy('');
    setFilterRaisedDateFrom('');
    setFilterRaisedDateTo('');
    setFilterAssignee('');
    setFilterPriority('');
    setFilterType('');
    setFilterDueDateFrom('');
    setFilterDueDateTo('');
  };

  const hasActiveFilters =
    filterTitle ||
    filterRaisedBy ||
    filterRaisedDateFrom ||
    filterRaisedDateTo ||
    filterAssignee ||
    filterPriority ||
    filterType ||
    filterDueDateFrom ||
    filterDueDateTo;

  if (loading && !project) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading board...</div>;
  }

  const isWaterfall = (project?.sdlc_type || '').toLowerCase() === 'waterfall';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0, flex: 1 }}>
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
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            icon={FileSpreadsheet}
            onClick={() => exportBoardToExcel(filteredIssues, project?.name || 'Board')}
          >
            Export Excel
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleAddIssue}>
            Create Issue
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Row 1: Search Inputs & Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, paddingRight: 4 }}>
            <Filter size={16} />
            <span>Filter</span>
          </div>

          {/* Search Title Input */}
          <div style={{ position: 'relative', width: 170 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Search title..."
              value={filterTitle}
              onChange={(e) => setFilterTitle(e.target.value)}
              style={{ paddingLeft: 30, height: 34, fontSize: '0.8rem' }}
            />
          </div>

          {/* Search Raised By Input */}
          <div style={{ position: 'relative', width: 160 }}>
            <User size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              className="form-input"
              type="text"
              placeholder="Raised by..."
              value={filterRaisedBy}
              onChange={(e) => setFilterRaisedBy(e.target.value)}
              style={{ paddingLeft: 30, height: 34, fontSize: '0.8rem' }}
            />
          </div>

          <select
            className="form-select"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            style={{ width: 'auto', minWidth: 140, height: 34, padding: '0 30px 0 10px', fontSize: '0.8rem' }}
          >
            <option value="">All Assignees</option>
            {assignees
              .filter((m) => {
                const u = m.user || m;
                return !['super_admin', 'super admin', 'superadmin', 'admin'].includes((u.role || '').toLowerCase());
              })
              .map((m) => {
                const u = m.user || m;
                return (
                  <option key={u.id || u._id} value={u.id || u._id}>
                    {u.full_name || u.name || u.username}
                  </option>
                );
              })}
          </select>

          <select
            className="form-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{ width: 'auto', minWidth: 125, height: 34, padding: '0 30px 0 10px', fontSize: '0.8rem' }}
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
            style={{ width: 'auto', minWidth: 110, height: 34, padding: '0 30px 0 10px', fontSize: '0.8rem' }}
          >
            <option value="">All Types</option>
            {['task', 'bug', 'story', 'epic'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} style={{ marginLeft: 'auto', height: 34 }}>
              Clear All Filters
            </Button>
          )}
        </div>

        {/* Row 2: Date Range Grouping */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            paddingTop: 8,
            borderTop: '1px dashed var(--border-color)',
            fontSize: '0.8rem',
          }}
        >
          {/* Raised Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            <Calendar size={14} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Raised Date:</span>
            <DateFilterInput
              value={filterRaisedDateFrom}
              onChange={(e) => setFilterRaisedDateFrom(e.target.value)}
              placeholder="From: --/--/----"
            />
            <span>to</span>
            <DateFilterInput
              value={filterRaisedDateTo}
              onChange={(e) => setFilterRaisedDateTo(e.target.value)}
              placeholder="To: --/--/----"
            />
          </div>

          <div style={{ width: 1, height: 18, backgroundColor: 'var(--border-color)' }} />

          {/* Due Date Range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
            <Calendar size={14} style={{ color: '#d97706' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Due Date:</span>
            <DateFilterInput
              value={filterDueDateFrom}
              onChange={(e) => setFilterDueDateFrom(e.target.value)}
              placeholder="From: --/--/----"
            />
            <span>to</span>
            <DateFilterInput
              value={filterDueDateTo}
              onChange={(e) => setFilterDueDateTo(e.target.value)}
              placeholder="To: --/--/----"
            />
          </div>
        </div>
      </div>

      {/* Board Columns */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
