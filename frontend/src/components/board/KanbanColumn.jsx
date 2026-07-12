import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Typography, IconButton, Paper, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import IssueCard from './IssueCard';

const COLUMN_COLORS = {
  'To Do': '#94a3b8',
  'In Progress': '#3b82f6',
  'In Review': '#f59e0b',
  Done: '#22c55e',
};

export default function KanbanColumn({
  column,
  issues,
  onIssueClick,
  onAddIssue,
}) {
  const columnId = column.id || column._id || column.status;
  const columnName = column.name || column.title;
  const topColor = COLUMN_COLORS[columnName] || '#94a3b8';

  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: { type: 'column', column },
  });

  const issueIds = issues.map((issue) => issue.id || issue._id);

  return (
    <Paper
      elevation={0}
      sx={{
        width: 280,
        minWidth: 280,
        maxWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#f4f5f7',
        borderRadius: 2,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: isOver ? 'primary.300' : 'grey.200',
        transition: 'border-color 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Colored top border */}
      <Box sx={{ height: 3, bgcolor: topColor, flexShrink: 0 }} />

      {/* Column header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1.25,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'text.secondary',
            }}
          >
            {columnName}
          </Typography>
          <Box
            sx={{
              bgcolor: 'grey.300',
              color: 'text.secondary',
              borderRadius: '50%',
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            {issues.length}
          </Box>
        </Box>

        <Tooltip title={`Create issue in ${columnName}`} arrow>
          <IconButton
            size="small"
            onClick={() => onAddIssue?.(column)}
            sx={{
              width: 26,
              height: 26,
              color: 'text.secondary',
              '&:hover': { bgcolor: 'grey.300', color: 'text.primary' },
            }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Droppable area with issue cards */}
      <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
        <Box
          ref={setNodeRef}
          sx={{
            flex: 1,
            px: 1,
            pb: 1,
            minHeight: 120,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': {
              bgcolor: 'grey.300',
              borderRadius: 2,
            },
            transition: 'background-color 0.2s ease',
            bgcolor: isOver ? 'rgba(59,130,246,0.04)' : 'transparent',
          }}
        >
          {issues.map((issue) => (
            <IssueCard
              key={issue.id || issue._id}
              issue={issue}
              onIssueClick={onIssueClick}
            />
          ))}

          {issues.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                color: 'text.disabled',
                fontSize: '0.8rem',
                fontStyle: 'italic',
                userSelect: 'none',
              }}
            >
              No issues
            </Box>
          )}
        </Box>
      </SortableContext>
    </Paper>
  );
}
