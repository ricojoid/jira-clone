import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Inbox,
  Calendar,
  FileSpreadsheet,
  X,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { projectApi, issueApi, sprintApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import {
  StatusBadge,
  PriorityBadge,
  TypeIcon,
  STATUS_META,
  PRIORITY_META,
  TYPE_META,
  DeadlineBadge,
} from '../components/ui/Badge';

import DateFilterInput from '../components/ui/DateFilterInput';
import { exportBoardToExcel } from '../utils/excelExport';

export default function IssuesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPM } = useAuth();

  const [issues, setIssues] = useState([]);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Selection Criteria / Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sprintFilter, setSprintFilter] = useState('');
  const [filterDueDateFrom, setFilterDueDateFrom] = useState('');
  const [filterDueDateTo, setFilterDueDateTo] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectRes, issuesRes, membersRes, sprintsRes] = await Promise.all([
        projectApi.get(projectId).catch(() => ({ data: null })),
        issueApi.listByProject(projectId).catch(() => ({ data: [] })),
        projectApi.listMembers(projectId).catch(() => ({ data: [] })),
        sprintApi.listByProject(projectId).catch(() => ({ data: [] })),
      ]);

      setProject(projectRes.data);
      setIssues(issuesRes.data?.issues ?? issuesRes.data ?? []);
      setMembers(membersRes.data || []);
      setSprints(sprintsRes.data?.sprints ?? sprintsRes.data ?? []);
    } catch (err) {
      console.error('Failed to fetch issues:', err);
      toast.error('Failed to load issues list');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setCreateOpen(true);
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setTypeFilter('');
    setAssigneeFilter('');
    setSprintFilter('');
    setFilterDueDateFrom('');
    setFilterDueDateTo('');
    setSortBy('created_at');
    setSortDir('desc');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter) count++;
    if (priorityFilter) count++;
    if (typeFilter) count++;
    if (assigneeFilter) count++;
    if (sprintFilter) count++;
    if (filterDueDateFrom) count++;
    if (filterDueDateTo) count++;
    return count;
  }, [
    search,
    statusFilter,
    priorityFilter,
    typeFilter,
    assigneeFilter,
    sprintFilter,
    filterDueDateFrom,
    filterDueDateTo,
  ]);

  const filtered = useMemo(() => {
    let result = [...issues];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.title?.toLowerCase().includes(q) ||
          (i.issue_key || i.key)?.toLowerCase().includes(q) ||
          i.description?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((i) => i.status === statusFilter);
    if (priorityFilter) result = result.filter((i) => i.priority === priorityFilter);
    if (typeFilter) result = result.filter((i) => (i.issue_type || i.type) === typeFilter);

    if (assigneeFilter) {
      result = result.filter(
        (i) =>
          (i.assignee_id || i.assignee?.id) === Number(assigneeFilter) ||
          (i.assignee_id || i.assignee?.id) === assigneeFilter
      );
    }

    if (sprintFilter) {
      if (sprintFilter === 'backlog') {
        result = result.filter((i) => !i.sprint_id && !i.sprint);
      } else {
        result = result.filter(
          (i) =>
            (i.sprint_id || i.sprint?.id) === Number(sprintFilter) ||
            (i.sprint_id || i.sprint?.id) === sprintFilter
        );
      }
    }

    if (filterDueDateFrom) {
      result = result.filter((i) => {
        const dueDateStr = i.due_date || i.dueDate;
        if (!dueDateStr) return false;
        const issueDate = new Date(dueDateStr);
        const fromDate = new Date(filterDueDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        return issueDate >= fromDate;
      });
    }

    if (filterDueDateTo) {
      result = result.filter((i) => {
        const dueDateStr = i.due_date || i.dueDate;
        if (!dueDateStr) return false;
        const issueDate = new Date(dueDateStr);
        const toDate = new Date(filterDueDateTo);
        toDate.setHours(23, 59, 59, 999);
        return issueDate <= toDate;
      });
    }

    result.sort((a, b) => {
      let aVal, bVal;
      if (sortBy === 'priority') {
        const order = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 };
        aVal = order[a.priority] ?? 5;
        bVal = order[b.priority] ?? 5;
      } else if (sortBy === 'due_date') {
        aVal = new Date(a.due_date || a.dueDate || 0).getTime();
        bVal = new Date(b.due_date || b.dueDate || 0).getTime();
      } else {
        aVal = new Date(a[sortBy] || 0).getTime();
        bVal = new Date(b[sortBy] || 0).getTime();
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [
    issues,
    search,
    statusFilter,
    priorityFilter,
    typeFilter,
    assigneeFilter,
    sprintFilter,
    filterDueDateFrom,
    filterDueDateTo,
    sortBy,
    sortDir,
  ]);

  const getSprintName = (sprintId) => {
    if (!sprintId) return 'Backlog';
    const found = sprints.find((s) => (s.id || s._id) === sprintId);
    return found ? found.name : 'Sprint';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Issues List
          </h2>
          {project && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {project.name} &middot; {issues.length} total issues
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="secondary"
            icon={FileSpreadsheet}
            onClick={() => exportBoardToExcel(filtered, project?.name || 'Issues')}
          >
            Export Excel
          </Button>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Create Issue
          </Button>
        </div>
      </div>

      {/* Refined Selection Criteria & Filter Bar Panel */}
      <div
        className="card"
        style={{
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          backgroundColor: '#ffffff',
          borderColor: '#fee2e2',
        }}
      >
        {/* Row 1: Search & Sort Bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box (Compact) */}
          <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="form-input"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 36, paddingRight: search ? 32 : 12, height: 38, fontSize: '0.85rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SlidersHorizontal size={15} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ height: 38, fontSize: '0.8rem', minWidth: 160 }}
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [s, d] = e.target.value.split('-');
                setSortBy(s);
                setSortDir(d);
              }}
            >
              <option value="created_at-desc">Sort: Newest First</option>
              <option value="created_at-asc">Sort: Oldest First</option>
              <option value="priority-asc">Sort: Highest Priority</option>
              <option value="priority-desc">Sort: Lowest Priority</option>
              <option value="due_date-asc">Sort: Due Date (Earliest)</option>
            </select>
          </div>

          {/* Reset Filters Button (Always Visible) */}
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            onClick={clearAllFilters}
            style={{ height: 38, fontSize: '0.8rem' }}
          >
            Reset Filters
          </Button>
        </div>

        {/* Row 2: Selection Criteria Dropdowns */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid var(--border-light)',
          }}
        >
          {/* Status */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 135, height: 34, fontSize: '0.8rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Priority */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 135, height: 34, fontSize: '0.8rem' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Type */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 125, height: 34, fontSize: '0.8rem' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Assignee */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 150, height: 34, fontSize: '0.8rem' }}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All Assignees</option>
            {members
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

          {/* Sprint / Phase */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 150, height: 34, fontSize: '0.8rem' }}
            value={sprintFilter}
            onChange={(e) => setSprintFilter(e.target.value)}
          >
            <option value="">All Sprints / Phases</option>
            <option value="backlog">Backlog (No Sprint)</option>
            {sprints.map((s) => (
              <option key={s.id || s._id} value={s.id || s._id}>
                {s.name} ({s.status?.toUpperCase()})
              </option>
            ))}
          </select>

          {/* Due Date Range */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: 10,
            }}
          >
            <Calendar size={14} color="var(--primary)" />
            <span>Due:</span>
            <DateFilterInput
              value={filterDueDateFrom}
              onChange={(e) => setFilterDueDateFrom(e.target.value)}
              placeholder="From date"
            />
            <span>-</span>
            <DateFilterInput
              value={filterDueDateTo}
              onChange={(e) => setFilterDueDateTo(e.target.value)}
              placeholder="To date"
            />
          </div>

          {activeFilterCount > 0 && (
            <span
              className="badge"
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''} ({filtered.length} found)
            </span>
          )}
        </div>
      </div>

      {/* Issues Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading issues...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Inbox size={48} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>No issues found</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Try adjusting your search query or filters.
          </p>
          {activeFilterCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={clearAllFilters}
              style={{ marginTop: 14 }}
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-hover)',
                  textAlign: 'left',
                  color: 'var(--text-muted)',
                }}
              >
                <th style={{ padding: '12px 16px', width: 40 }}>Type</th>
                <th style={{ padding: '12px 16px', width: 100 }}>Key</th>
                <th style={{ padding: '12px 16px' }}>Title</th>
                <th style={{ padding: '12px 16px', width: 130 }}>Status</th>
                <th style={{ padding: '12px 16px', width: 110 }}>Priority</th>
                <th style={{ padding: '12px 16px', width: 140 }}>Sprint / Phase</th>
                <th style={{ padding: '12px 16px', width: 130 }}>Deadline</th>
                <th style={{ padding: '12px 16px', width: 160 }}>Assignee</th>
                <th style={{ padding: '12px 16px', width: 120 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((issue) => (
                <tr
                  key={issue.id || issue._id}
                  onClick={() => navigate(`/issue/${issue.id || issue._id}`)}
                  style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                  className="card-hover"
                >
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <TypeIcon type={issue.issue_type || issue.type} size={16} />
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--primary)' }}>
                    {issue.issue_key || issue.key}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{issue.title}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={issue.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <PriorityBadge priority={issue.priority} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {getSprintName(issue.sprint_id || issue.sprint?.id)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <DeadlineBadge
                      dueDate={issue.due_date || issue.dueDate}
                      status={issue.status}
                      compact
                    />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {issue.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar
                          name={
                            issue.assignee.full_name ||
                            issue.assignee.name ||
                            issue.assignee.username
                          }
                          size={24}
                        />
                        <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>
                          {issue.assignee.full_name ||
                            issue.assignee.name ||
                            issue.assignee.username}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.825rem' }}>
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      color: 'var(--text-muted)',
                      fontSize: '0.825rem',
                    }}
                  >
                    {formatDate(issue.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateIssueDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        onCreated={() => {
          setCreateOpen(false);
          fetchData();
        }}
      />
    </div>
  );
}
