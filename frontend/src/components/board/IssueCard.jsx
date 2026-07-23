import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { TypeIcon, PriorityBadge, DeadlineBadge } from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { getDeadlineStatus } from '../../utils/deadline';

export const IssueCardContent = forwardRef(function IssueCardContent(
  { issue, onIssueClick, isDragging, style, listeners, attributes, setNodeRef },
  ref
) {
  if (!issue) return null;

  const combinedRef = (node) => {
    if (setNodeRef) setNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const title = issue.title || issue.summary;
  const issueKey = issue.issue_key || issue.key || issue.issueKey;
  const storyPoints = issue.story_points ?? issue.storyPoints;
  const dueDate = issue.due_date || issue.dueDate;

  const deadlineInfo = getDeadlineStatus(dueDate, issue.status);

  let borderStyle = '1px solid var(--border-color)';
  if (deadlineInfo?.state === 'overdue') {
    borderStyle = '1px solid rgba(239, 68, 68, 0.4)';
  } else if (deadlineInfo?.state === 'today') {
    borderStyle = '1px solid rgba(245, 158, 11, 0.5)';
  }

  const rawSprintName = issue.sprint?.name || issue.sprint_name || issue.phase_name || '';
  const phaseCode = rawSprintName
    ? (rawSprintName.includes(' - ') ? rawSprintName.split(' - ')[0].trim() : rawSprintName)
    : null;

  return (
    <div
      ref={combinedRef}
      className="card card-hover"
      onClick={() => onIssueClick?.(issue)}
      style={{
        padding: '14px 16px',
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.4 : 1,
        marginBottom: 10,
        backgroundColor: 'var(--bg-card)',
        border: borderStyle,
        borderLeft: deadlineInfo?.state === 'overdue' 
          ? '4px solid #ef4444' 
          : deadlineInfo?.state === 'today' 
          ? '4px solid #f59e0b' 
          : borderStyle,
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
      {...attributes}
      {...listeners}
    >
      {/* Badges: Phase, Deadline & Labels */}
      {((issue.labels && issue.labels.length > 0) || dueDate || phaseCode) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, alignItems: 'center' }}>
          {phaseCode && (
            <span
              className="badge"
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fcd34d',
                letterSpacing: '0.04em',
              }}
            >
              {phaseCode}
            </span>
          )}
          {dueDate && (
            <DeadlineBadge dueDate={dueDate} status={issue.status} compact />
          )}
          {issue.labels && issue.labels.map((label) => {
            const labelName = typeof label === 'string' ? label : label.name;
            return (
              <span
                key={labelName}
                className="badge"
                style={{
                  fontSize: '0.675rem',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary-border)',
                }}
              >
                {labelName}
              </span>
            );
          })}
        </div>
      )}

      {/* Issue Title */}
      <div
        style={{
          fontWeight: 600,
          fontSize: '0.875rem',
          color: 'var(--text-main)',
          lineHeight: 1.4,
          marginBottom: 12,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </div>

      {/* Footer Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <TypeIcon type={issue.issue_type || issue.type} size={15} />

          <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)' }}>
            {issueKey}
          </span>

          <PriorityBadge priority={issue.priority} />

          {storyPoints != null && (
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.675rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {storyPoints}
            </span>
          )}

          <GripVertical size={14} style={{ color: 'var(--text-light)', cursor: 'grab' }} />
        </div>

        {issue.assignee && (
          <Avatar
            name={issue.assignee.full_name || issue.assignee.username || issue.assignee.name}
            src={issue.assignee.avatar_url || issue.assignee.avatar || issue.assignee.avatarUrl}
            size={24}
          />
        )}
      </div>
    </div>
  );
});

export default function IssueCard({ issue, onIssueClick }) {
  if (!issue) return null;
  const issueId = issue.id || issue._id;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issueId,
    data: { type: 'issue', issue },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <IssueCardContent
      ref={setNodeRef}
      issue={issue}
      onIssueClick={onIssueClick}
      isDragging={isDragging}
      style={style}
      listeners={listeners}
      attributes={attributes}
    />
  );
}
