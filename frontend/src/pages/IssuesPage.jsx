import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, Inbox, Filter, Calendar, FileSpreadsheet } from 'lucide-react';
import { projectApi, issueApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { StatusBadge, PriorityBadge, TypeIcon, STATUS_META, PRIORITY_META, TYPE_META, DeadlineBadge } from '../components/ui/Badge';

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
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [filterDueDateFrom, setFilterDueDateFrom] = useState('');
  const [filterDueDateTo, setFilterDueDateTo] = useState('');

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
      toast.error('Failed to load issues list');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    if (!isPM) {
      toast.error('Only Project Managers can create issues');
      return;
    }
    setCreateOpen(true);
  };

  const filtered = useMemo(() => {
    let result = [...issues];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.title?.toLowerCase().includes(q) || (i.issue_key || i.key)?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter((i) => i.status === statusFilter);
    if (priorityFilter) result = result.filter((i) => i.priority === priorityFilter);
    if (typeFilter) result = result.filter((i) => (i.issue_type || i.type) === typeFilter);
    if (assigneeFilter) result = result.filter((i) => (i.assignee_id || i.assignee?.id) === Number(assigneeFilter) || (i.assignee_id || i.assignee?.id) === assigneeFilter);

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
      } else {
        aVal = new Date(a[sortBy] || 0).getTime();
        bVal = new Date(b[sortBy] || 0).getTime();
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [issues, search, statusFilter, priorityFilter, typeFilter, assigneeFilter, filterDueDateFrom, filterDueDateTo, sortBy, sortDir]);

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
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate} disabled={!isPM}>
            Create Issue
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
          <input
            className="form-input"
            placeholder="Search issues by key or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, height: 36 }}
          />
        </div>

        <select className="form-select" style={{ width: 'auto', minWidth: 135, height: 36, padding: '0 30px 0 10px', fontSize: '0.8rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 135, height: 36, padding: '0 30px 0 10px', fontSize: '0.8rem' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 120, height: 36, padding: '0 30px 0 10px', fontSize: '0.8rem' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="form-select" style={{ width: 'auto', minWidth: 155, height: 36, padding: '0 30px 0 10px', fontSize: '0.8rem' }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">All Assignees</option>
          {members.map((m) => {
            const u = m.user || m;
            return (
              <option key={u.id || u._id} value={u.id || u._id}>
                {u.full_name || u.username || u.name}
              </option>
            );
          })}
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
      </div>

      {/* Issues Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading issues...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Inbox size={48} style={{ color: 'var(--text-light)', marginBottom: 12 }} />
          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>No issues found</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-hover)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', width: 40 }}>Type</th>
                <th style={{ padding: '12px 16px', width: 100 }}>Key</th>
                <th style={{ padding: '12px 16px' }}>Title</th>
                <th style={{ padding: '12px 16px', width: 130 }}>Status</th>
                <th style={{ padding: '12px 16px', width: 110 }}>Priority</th>
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
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={issue.status} /></td>
                  <td style={{ padding: '12px 16px' }}><PriorityBadge priority={issue.priority} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <DeadlineBadge dueDate={issue.due_date || issue.dueDate} status={issue.status} compact />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {issue.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={issue.assignee.full_name || issue.assignee.username || issue.assignee.name} size={24} />
                        <span style={{ fontSize: '0.825rem', fontWeight: 500 }}>
                          {issue.assignee.full_name || issue.assignee.username || issue.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.825rem' }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
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
