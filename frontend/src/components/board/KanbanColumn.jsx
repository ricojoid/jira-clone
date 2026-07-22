import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import IssueCard from './IssueCard';

const COLUMN_ACCENTS = {
  'To Do': { border: 'var(--text-muted)', badgeBg: 'var(--bg-subtle)', badgeText: 'var(--text-body)' },
  'In Progress': { border: '#2563eb', badgeBg: '#eff6ff', badgeText: '#2563eb' },
  'In Review': { border: '#d97706', badgeBg: '#fffbeb', badgeText: '#d97706' },
  Done: { border: '#16a34a', badgeBg: '#f0fdf4', badgeText: '#16a34a' },
};

function getColKey(col) {
  if (!col) return 'todo';
  let s = col.status;
  if (!s && col.name) {
    s = col.name.toLowerCase().replace(/\s+/g, '_');
    if (s === 'to_do') s = 'todo';
  }
  return s || col.id || col._id || 'todo';
}

export default function KanbanColumn({ column, issues, onIssueClick, onAddIssue }) {
  const columnId = getColKey(column);
  const columnName = column.name || column.title;
  const accent = COLUMN_ACCENTS[columnName] || { border: 'var(--primary)', badgeBg: 'var(--primary-light)', badgeText: 'var(--primary)' };

  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: 'column', column },
  });

  const issueIds = issues.map((issue) => issue.id || issue._id);

  return (
    <div
      className="card"
      style={{
        width: 320,
        minWidth: 300,
        maxWidth: 340,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: `1px solid ${isOver ? 'var(--primary)' : 'var(--border-color)'}`,
        boxShadow: isOver ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      {/* Top Accent Line */}
      <div style={{ height: 4, backgroundColor: accent.border, flexShrink: 0 }} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-hover)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-main)',
            }}
          >
            {columnName}
          </span>
          <span
            className="badge"
            style={{
              backgroundColor: accent.badgeBg,
              color: accent.badgeText,
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.725rem',
              padding: '2px 6px',
            }}
          >
            {issues.length}
          </span>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onAddIssue?.(column)}
          title={`Add issue to ${columnName}`}
          style={{ padding: 4 }}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Droppable Issue List */}
      <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          style={{
            flex: 1,
            padding: 12,
            minHeight: 200,
            overflowY: 'auto',
            backgroundColor: isOver ? 'var(--primary-light)' : 'var(--bg-app)',
            transition: 'background-color 0.15s ease',
          }}
        >
          {issues.map((issue) => (
            <IssueCard key={issue.id || issue._id} issue={issue} onIssueClick={onIssueClick} />
          ))}

          {issues.length === 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 16px',
                color: 'var(--text-light)',
                fontSize: '0.8rem',
                fontWeight: 500,
                border: '1.5px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              No issues in this column
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
