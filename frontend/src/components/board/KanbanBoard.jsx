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
import { Box } from '@mui/material';
import KanbanColumn from './KanbanColumn';
import { IssueCardContent } from './IssueCard';

const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export default function KanbanBoard({
  columns,
  issuesByColumn,
  onMoveIssue,
  onIssueClick,
  onAddIssue,
}) {
  const [activeIssue, setActiveIssue] = useState(null);

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
    }),
  );

  // Build a flat lookup of issue id -> column id
  const issueColumnMap = useMemo(() => {
    const map = {};
    Object.entries(issuesByColumn).forEach(([colId, issues]) => {
      issues.forEach((issue) => {
        map[issue.id || issue._id] = colId;
      });
    });
    return map;
  }, [issuesByColumn]);

  const findColumnForItem = useCallback(
    (id) => {
      // If the id directly matches a column
      if (issuesByColumn[id]) return id;
      // Otherwise look up which column the issue belongs to
      return issueColumnMap[id] || null;
    },
    [issuesByColumn, issueColumnMap],
  );

  const handleDragStart = useCallback(
    (event) => {
      const { active } = event;
      const colId = findColumnForItem(active.id);
      if (!colId) return;
      const issue = issuesByColumn[colId]?.find(
        (i) => (i.id || i._id) === active.id,
      );
      setActiveIssue(issue || null);
    },
    [findColumnForItem, issuesByColumn],
  );

  const handleDragOver = useCallback(() => {
    // Visual feedback is handled by useDroppable isOver in KanbanColumn.
    // Actual reorder is committed on drag end.
  }, []);

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveIssue(null);

      if (!over) return;

      const activeId = active.id;
      const overId = over.id;

      const activeColumnId = findColumnForItem(activeId);
      let overColumnId = findColumnForItem(overId);

      // If we dropped directly on a column container
      if (issuesByColumn[overId]) {
        overColumnId = overId;
      }

      if (!activeColumnId || !overColumnId) return;

      // Determine the new position within the target column
      const overColumnIssues = issuesByColumn[overColumnId] || [];
      let newPosition = overColumnIssues.length; // default: append at end

      if (activeColumnId === overColumnId) {
        // Reorder within the same column
        const oldIndex = overColumnIssues.findIndex(
          (i) => (i.id || i._id) === activeId,
        );
        const overIndex = overColumnIssues.findIndex(
          (i) => (i.id || i._id) === overId,
        );
        if (oldIndex === overIndex) return; // no movement
        newPosition = overIndex >= 0 ? overIndex : overColumnIssues.length;
      } else {
        // Moving between columns
        const overIndex = overColumnIssues.findIndex(
          (i) => (i.id || i._id) === overId,
        );
        newPosition = overIndex >= 0 ? overIndex : overColumnIssues.length;
      }

      // Find the target column's status
      const targetColumn = columns.find(
        (col) => (col.id || col._id || col.status) === overColumnId,
      );
      const newStatus = targetColumn?.status || overColumnId;

      onMoveIssue?.(activeId, newStatus, newPosition);
    },
    [findColumnForItem, issuesByColumn, columns, onMoveIssue],
  );

  const handleDragCancel = useCallback(() => {
    setActiveIssue(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={measuringConfig}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          p: 1,
          overflowX: 'auto',
          minHeight: 'calc(100vh - 200px)',
          alignItems: 'flex-start',
          '&::-webkit-scrollbar': { height: 8 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'grey.300',
            borderRadius: 4,
          },
        }}
      >
        {columns.map((column) => {
          const colId = column.id || column._id || column.status;
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
      </Box>

      {/* Drag overlay - rendered at root portal level for smooth dragging */}
      <DragOverlay dropAnimation={null}>
        {activeIssue ? (
          <Box sx={{ width: 264, opacity: 0.92 }}>
            <IssueCardContent
              issue={activeIssue}
              isDragging
              style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.15)', cursor: 'grabbing' }}
            />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
