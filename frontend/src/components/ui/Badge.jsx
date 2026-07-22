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
  todo: { label: 'To Do', className: 'badge-todo', icon: Clock },
  in_progress: { label: 'In Progress', className: 'badge-in_progress', icon: AlertCircle },
  in_review: { label: 'In Review', className: 'badge-in_review', icon: Clock },
  done: { label: 'Done', className: 'badge-done', icon: CheckCircle2 },
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
  const meta = STATUS_META[status] || STATUS_META.todo;
  const Icon = meta.icon;

  return (
    <span className={`badge ${meta.className}`}>
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
