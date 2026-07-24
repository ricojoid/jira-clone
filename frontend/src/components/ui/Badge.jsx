import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Bug,
  Bookmark,
  Zap,
  GitBranch,
} from 'lucide-react';

export const STATUS_META = {
  todo: { label: 'To Do', className: 'badge-todo', color: '#64748b', bg: '#f1f5f9', icon: Clock },
  in_progress: { label: 'In Progress', className: 'badge-in_progress', color: '#2563eb', bg: '#eff6ff', icon: AlertCircle },
  ready_to_review_fid: { label: 'Ready to Review FID', className: 'badge-ready_fid', color: '#7c3aed', bg: '#f5f3ff', icon: Clock },
  fid_review: { label: 'FID Review', className: 'badge-fid_review', color: '#9333ea', bg: '#faf5ff', icon: AlertCircle },
  ready_to_is_review: { label: 'Ready to IS Review', className: 'badge-ready_is', color: '#d97706', bg: '#fffbeb', icon: Clock },
  is_review: { label: 'IS Review', className: 'badge-is_review', color: '#ca8a04', bg: '#fefce8', icon: AlertCircle },
  done: { label: 'Done', className: 'badge-done', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
};

export const TYPE_META = {
  task: { label: 'Task', color: '#3b82f6', icon: FileText },
  bug: { label: 'Bug', color: '#ef4444', icon: Bug },
  story: { label: 'Story', color: '#22c55e', icon: Bookmark },
  epic: { label: 'Epic', color: '#a855f7', icon: Zap },
  subtask: { label: 'Subtask', color: '#64748b', icon: GitBranch },
};

export const PRIORITY_META = {
  highest: { label: 'Highest', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#3b82f6' },
  lowest: { label: 'Lowest', color: '#22c55e' },
};

export function StatusBadge({ status }) {
  const normKey = (status || 'todo').toLowerCase().replace(/\s+/g, '_');
  const meta = STATUS_META[normKey] || STATUS_META[status] || { label: status || 'To Do', color: '#64748b', bg: '#f1f5f9', icon: Clock };
  const Icon = meta.icon || Clock;

  return (
    <span
      className="badge"
      style={{
        backgroundColor: meta.bg || '#f1f5f9',
        color: meta.color || '#64748b',
        border: `1px solid ${meta.color || '#64748b'}30`,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={12} />
      {meta.label}
    </span>
  );
}

export function TypeIcon({ type, size = 16 }) {
  const meta = TYPE_META[type] || TYPE_META.task;
  const Icon = meta.icon;
  return <Icon size={size} style={{ color: meta.color }} />;
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;

  return (
    <span className="badge" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: meta.color,
          display: 'inline-block',
        }}
      />
      {meta.label}
    </span>
  );
}

import { Calendar, CalendarX, AlertTriangle } from 'lucide-react';
import { getDeadlineStatus } from '../../utils/deadline';

export function DeadlineBadge({ dueDate, status, compact = false }) {
  const info = getDeadlineStatus(dueDate, status);
  if (!info) return null;

  let bg = 'var(--bg-subtle, #f1f5f9)';
  let color = 'var(--text-muted, #64748b)';
  let border = '1px solid var(--border-color, #e2e8f0)';
  let Icon = Calendar;
  let fontWeight = 500;

  if (info.state === 'overdue') {
    bg = 'rgba(239, 68, 68, 0.12)';
    color = '#ef4444';
    border = '1px solid rgba(239, 68, 68, 0.35)';
    Icon = CalendarX;
    fontWeight = 700;
  } else if (info.state === 'today') {
    bg = 'rgba(245, 158, 11, 0.16)';
    color = '#d97706';
    border = '1px solid rgba(245, 158, 11, 0.4)';
    Icon = AlertTriangle;
    fontWeight = 700;
  } else if (info.state === 'soon') {
    bg = 'rgba(234, 179, 8, 0.12)';
    color = '#ca8a04';
    border = '1px solid rgba(234, 179, 8, 0.3)';
    Icon = Clock;
    fontWeight = 600;
  } else if (info.state === 'done') {
    bg = 'rgba(34, 197, 94, 0.1)';
    color = '#16a34a';
    border = '1px solid rgba(34, 197, 94, 0.25)';
    Icon = CheckCircle2;
  }

  return (
    <span
      className="badge"
      title={`Deadline: ${info.formattedDate}`}
      style={{
        backgroundColor: bg,
        color: color,
        border: border,
        fontWeight: fontWeight,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: compact ? '0.675rem' : '0.75rem',
        padding: compact ? '2px 6px' : '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={compact ? 11 : 13} />
      {compact ? info.text : info.label}
    </span>
  );
}

