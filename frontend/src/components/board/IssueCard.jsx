import React, { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Tooltip,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import BoltIcon from '@mui/icons-material/Bolt';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RemoveIcon from '@mui/icons-material/Remove';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';

const PRIORITY_CONFIG = {
  highest: { color: '#ef4444', icon: KeyboardDoubleArrowUpIcon, label: 'Highest' },
  high: { color: '#f97316', icon: KeyboardArrowUpIcon, label: 'High' },
  medium: { color: '#f59e0b', icon: RemoveIcon, label: 'Medium' },
  low: { color: '#3b82f6', icon: KeyboardArrowDownIcon, label: 'Low' },
  lowest: { color: '#22c55e', icon: KeyboardDoubleArrowDownIcon, label: 'Lowest' },
};

const ISSUE_TYPE_CONFIG = {
  bug: { icon: BugReportIcon, color: '#ef4444', label: 'Bug' },
  story: { icon: MenuBookIcon, color: '#22c55e', label: 'Story' },
  task: { icon: CheckBoxIcon, color: '#3b82f6', label: 'Task' },
  epic: { icon: BoltIcon, color: '#7c3aed', label: 'Epic' },
  subtask: { icon: CallSplitIcon, color: '#64748b', label: 'Subtask' },
};

// Inner card content, exported for use in DragOverlay
export const IssueCardContent = forwardRef(function IssueCardContent(
  { issue, onIssueClick, isDragging, style, listeners, attributes, setNodeRef },
  ref,
) {
  const priority = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.medium;
  const issueType = ISSUE_TYPE_CONFIG[issue.issue_type || issue.type] || ISSUE_TYPE_CONFIG.task;
  const PriorityIcon = priority.icon;
  const TypeIcon = issueType.icon;

  const combinedRef = (node) => {
    if (setNodeRef) setNodeRef(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <Card
      ref={combinedRef}
      onClick={() => onIssueClick?.(issue)}
      sx={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.5 : 1,
        bgcolor: '#ffffff',
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 1.5,
        boxShadow: 'none',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
          borderColor: 'grey.300',
        },
        ...style,
      }}
      {...attributes}
      {...listeners}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        {/* Labels */}
        {issue.labels && issue.labels.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {issue.labels.map((label) => (
              <Chip
                key={typeof label === 'string' ? label : label.id || label.name}
                label={typeof label === 'string' ? label : label.name}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor:
                    typeof label === 'string'
                      ? 'primary.50'
                      : label.color || 'primary.50',
                  color:
                    typeof label === 'string'
                      ? 'primary.700'
                      : label.textColor || 'primary.700',
                  borderRadius: 0.5,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: 'text.primary',
            lineHeight: 1.4,
            mb: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            wordBreak: 'break-word',
          }}
        >
          {issue.title || issue.summary}
        </Typography>

        {/* Bottom row: type, key, priority, story points, assignee */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {/* Issue type */}
            <Tooltip title={issueType.label} arrow>
              <TypeIcon sx={{ fontSize: 16, color: issueType.color }} />
            </Tooltip>

            {/* Issue key */}
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem' }}
            >
              {issue.issue_key || issue.key || issue.issueKey}
            </Typography>

            {/* Priority */}
            <Tooltip title={priority.label} arrow>
              <PriorityIcon sx={{ fontSize: 16, color: priority.color }} />
            </Tooltip>

            {/* Story points */}
            {(issue.story_points != null || issue.storyPoints != null) && (
              <Chip
                label={issue.story_points ?? issue.storyPoints}
                size="small"
                sx={{
                  height: 20,
                  minWidth: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: 'grey.100',
                  color: 'text.secondary',
                  borderRadius: '50%',
                  '& .MuiChip-label': { px: 0.5 },
                }}
              />
            )}

            {/* Drag handle */}
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                color: 'grey.400',
                ml: 0.25,
              }}
            >
              <DragIndicatorIcon sx={{ fontSize: 16 }} />
            </Box>
          </Box>

          {/* Assignee avatar */}
          {issue.assignee && (
            <Tooltip
              title={issue.assignee.full_name || issue.assignee.username || issue.assignee.name || issue.assignee.displayName || ''}
              arrow
            >
              <Avatar
                src={issue.assignee.avatar || issue.assignee.avatarUrl}
                alt={issue.assignee.full_name || issue.assignee.username || issue.assignee.name || issue.assignee.displayName}
                sx={{
                  width: 24,
                  height: 24,
                  fontSize: '0.7rem',
                  bgcolor: 'primary.main',
                }}
              >
                {(issue.assignee.full_name || issue.assignee.username || issue.assignee.name || issue.assignee.displayName || '?')
                  .charAt(0)
                  .toUpperCase()}
              </Avatar>
            </Tooltip>
          )}
        </Box>
      </CardContent>
    </Card>
  );
});

export default function IssueCard({ issue, onIssueClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id || issue._id,
    data: { type: 'issue', issue },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box sx={{ mb: 1 }}>
      <IssueCardContent
        ref={setNodeRef}
        issue={issue}
        onIssueClick={onIssueClick}
        isDragging={isDragging}
        style={style}
        listeners={listeners}
        attributes={attributes}
      />
    </Box>
  );
}
