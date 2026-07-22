import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
} from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import { IssueCardContent } from './IssueCard';

const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
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

export default function KanbanBoard({
  columns = [],
  issues = [],
  issuesByColumn: propsIssuesByColumn,
  onMoveIssue,
  onIssueMove,
  onIssueClick,
  onAddIssue,
}) {
  const [activeIssue, setActiveIssue] = useState(null);
  const handleMove = onMoveIssue || onIssueMove;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  const issuesByColumn = useMemo(() => {
    if (propsIssuesByColumn) return propsIssuesByColumn;
    const map = {};

    (columns || []).forEach((col) => {
      const colKey = getColKey(col);
      if (colKey) map[colKey] = [];
    });

    (issues || []).forEach((issue) => {
      const rawStatus = (issue.status || 'todo').toLowerCase();

      let targetKey = Object.keys(map).find((key) => {
        const strKey = String(key).toLowerCase();
        return (
          strKey === rawStatus ||
          strKey === (issue.status || '').toLowerCase()
        );
      });

      if (!targetKey && (columns || []).length > 0) {
        const found = columns.find(
          (c) =>
            getColKey(c) === rawStatus ||
            (c.name || '').toLowerCase() === rawStatus ||
            (c.name || '').toLowerCase().replace(/\s+/g, '_') === rawStatus ||
            ((c.name || '').toLowerCase().replace(/\s+/g, '_') === 'to_do' && rawStatus === 'todo')
        );
        targetKey = found
          ? getColKey(found)
          : getColKey(columns[0]);
      }

      if (targetKey && map[targetKey]) {
        map[targetKey].push(issue);
      } else if (Object.keys(map).length > 0) {
        const firstKey = Object.keys(map)[0];
        map[firstKey].push(issue);
      }
    });

    return map;
  }, [propsIssuesByColumn, columns, issues]);

  const issueColumnMap = useMemo(() => {
    const map = {};
    Object.entries(issuesByColumn || {}).forEach(([colId, colIssues]) => {
      (colIssues || []).forEach((issue) => {
        const issId = issue.id || issue._id;
        if (issId != null) map[issId] = colId;
      });
    });
    return map;
  }, [issuesByColumn]);

  const findColumnForItem = useCallback(
    (id) => {
      if (id == null) return null;
      if (issueColumnMap[id] !== undefined) {
        return issueColumnMap[id];
      }
      if (issuesByColumn && issuesByColumn[id] !== undefined) {
        return id;
      }
      return null;
    },
    [issuesByColumn, issueColumnMap]
  );

  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      const colId = findColumnForItem(active.id);
      if (!colId) return;
      const issue = issuesByColumn[colId]?.find(
        (i) => (i.id || i._id) === active.id
      );
      setActiveIssue(issue || null);
    },
    [findColumnForItem, issuesByColumn]
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveIssue(null);

      if (!over) return;

      const activeId = active.id;
      const overId = over.id;

      const activeColumnId = findColumnForItem(activeId);
      let overColumnId = findColumnForItem(overId);

      if (issuesByColumn[overId] !== undefined) {
        overColumnId = overId;
      }

      if (!activeColumnId || !overColumnId) return;

      const overColumnIssues = issuesByColumn[overColumnId] || [];
      let newPosition = overColumnIssues.length;

      if (activeColumnId === overColumnId) {
        const oldIndex = overColumnIssues.findIndex(
          (i) => (i.id || i._id) === activeId
        );
        const overIndex = overColumnIssues.findIndex(
          (i) => (i.id || i._id) === overId
        );
        if (oldIndex === overIndex) return;
        newPosition = overIndex >= 0 ? overIndex : overColumnIssues.length;
      } else {
        const overIndex = overColumnIssues.findIndex(
          (i) => (i.id || i._id) === overId
        );
        newPosition = overIndex >= 0 ? overIndex : overColumnIssues.length;
      }

      const targetColumn = (columns || []).find(
        (col) => getColKey(col) === overColumnId
      );
      let newStatus = targetColumn ? getColKey(targetColumn) : overColumnId;

      handleMove?.(activeId, newStatus, newPosition);
    },
    [findColumnForItem, issuesByColumn, columns, handleMove]
  );

  const handleDragCancel = useCallback(() => {
    setActiveIssue(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={measuringConfig}
    >
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          minHeight: 'calc(100vh - 180px)',
          alignItems: 'flex-start',
          paddingBottom: 16,
        }}
      >
        {(columns || []).map((column) => {
          const colId = getColKey(column);
          return (
            <KanbanColumn
              key={colId}
              column={column}
              issues={issuesByColumn[colId] || []}
              onIssueClick={onIssueClick}
              onAddIssue={onAddIssue}
            />
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <div style={{ width: 280, opacity: 0.9 }}>
            <IssueCardContent
              issue={activeIssue}
              isDragging
              style={{ boxShadow: 'var(--shadow-xl)', cursor: 'grabbing' }}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
