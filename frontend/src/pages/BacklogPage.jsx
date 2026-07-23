import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, GripVertical, Play, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { issueApi, sprintApi } from '../api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import { StatusBadge, PriorityBadge, TypeIcon, DeadlineBadge } from '../components/ui/Badge';
import CreateIssueDialog from '../components/issues/CreateIssueDialog';

export default function BacklogPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { isPM } = useAuth();

  const [sprints, setSprints] = useState([]);
  const [backlogIssues, setBacklogIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedSprints, setExpandedSprints] = useState({});
  const [backlogExpanded, setBacklogExpanded] = useState(true);

  const [draggedIssue, setDraggedIssue] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sprintsRes, issuesRes] = await Promise.all([
        sprintApi.listByProject(projectId),
        issueApi.listByProject(projectId),
      ]);

      const sprintsData = sprintsRes.data || [];
      const issuesData = issuesRes.data || [];

      const sprintIds = new Set(sprintsData.map((s) => s.id || s._id));
      const sprintsWithIssues = sprintsData.map((sprint) => ({
        ...sprint,
        issues: issuesData.filter((i) => i.sprint_id === (sprint.id || sprint._id)),
      }));

      const unassigned = issuesData.filter((i) => !i.sprint_id || !sprintIds.has(i.sprint_id));

      setSprints(sprintsWithIssues);
      setBacklogIssues(unassigned);

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
    if (!isPM) {
      toast.error('Only Project Managers can create sprints');
      return;
    }
    try {
      await sprintApi.create({
        project_id: projectId,
        name: `Sprint ${sprints.length + 1}`,
      });
      toast.success('Sprint created successfully');
      fetchData();
    } catch (err) {
      console.error('Failed to create sprint:', err);
      toast.error('Failed to create sprint');
    }
  };

  const handleDragStart = (issue) => {
    setDraggedIssue(issue);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnSprint = async (sprintId) => {
    if (!draggedIssue) return;
    const issueId = draggedIssue.id || draggedIssue._id;
    try {
      await issueApi.update(issueId, { sprint_id: sprintId });
      toast.success('Issue moved to sprint');
      fetchData();
    } catch {
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
    } catch {
      toast.error('Failed to move issue');
    }
    setDraggedIssue(null);
  };

  const renderIssueRow = (issue) => {
    const issueId = issue.id || issue._id;
    const dueDate = issue.due_date || issue.dueDate;
    return (
      <div
        key={issueId}
        draggable
        onDragStart={() => handleDragStart(issue)}
        onClick={() => navigate(`/issue/${issueId}`)}
        className="card-hover"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-light)',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        <GripVertical size={16} color="var(--text-light)" style={{ cursor: 'grab' }} />
        <TypeIcon type={issue.issue_type || issue.type} size={16} />
        <span style={{ fontWeight: 700, color: 'var(--primary)', minWidth: 80 }}>{issue.issue_key}</span>
        <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-main)' }}>{issue.title}</span>
        {dueDate && <DeadlineBadge dueDate={dueDate} status={issue.status} compact />}
        <StatusBadge status={issue.status} />
        <PriorityBadge priority={issue.priority} />
        <Avatar name={issue.assignee?.full_name || issue.assignee?.username || issue.assignee?.name} size={24} />
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading backlog...</div>;
  }

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
          Backlog & Sprints
        </h2>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" icon={Plus} onClick={handleCreateSprint} disabled={!isPM}>
            Create Sprint
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
            Create Issue
          </Button>
        </div>
      </div>

      {/* Sprints Sections */}
      {sprints.map((sprint) => {
        const sprintId = sprint.id || sprint._id;
        const isExpanded = expandedSprints[sprintId] !== false;
        return (
          <div
            key={sprintId}
            className="card"
            onDragOver={handleDragOver}
            onDrop={() => handleDropOnSprint(sprintId)}
            style={{ padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-hover)',
                borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => toggleSprint(sprintId)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>{sprint.name}</span>
                <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', textTransform: 'capitalize' }}>
                  {sprint.status || 'planned'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ({sprint.issues?.length || 0} issues)
                </span>
              </div>

              {sprint.status === 'planned' && sprint.issues?.length > 0 && (
                <Button variant="primary" size="sm" icon={Play} onClick={() => handleStartSprint(sprint)}>
                  Start Sprint
                </Button>
              )}
            </div>

            {isExpanded && (
              <div>
                {sprint.issues?.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Drag issues here to include in sprint
                  </div>
                ) : (
                  sprint.issues.map(renderIssueRow)
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Backlog Section */}
      <div
        className="card"
        onDragOver={handleDragOver}
        onDrop={handleDropOnBacklog}
        style={{ padding: 0, overflow: 'hidden' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-hover)',
            borderBottom: backlogExpanded ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setBacklogExpanded(!backlogExpanded)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}
            >
              {backlogExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            <span style={{ fontWeight: 800, fontSize: '1rem' }}>Backlog</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({backlogIssues.length} issues)
            </span>
          </div>
        </div>

        {backlogExpanded && (
          <div>
            {backlogIssues.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Inbox size={36} style={{ color: 'var(--text-light)', marginBottom: 8 }} />
                <div style={{ fontSize: '0.85rem' }}>No issues in backlog</div>
              </div>
            ) : (
              backlogIssues.map(renderIssueRow)
            )}
          </div>
        )}
      </div>

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
