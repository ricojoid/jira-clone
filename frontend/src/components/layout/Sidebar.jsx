import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Select,
  MenuItem,
  FormControl,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ViewKanban as BoardIcon,
  ListAlt as BacklogIcon,
  Speed as SprintIcon,
  BugReport as IssuesIcon,
  Settings as SettingsIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { projectApi } from '../../api';
import toast from 'react-hot-toast';

const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Board', icon: <BoardIcon />, path: '/board' },
  { label: 'Backlog', icon: <BacklogIcon />, path: '/backlog' },
  { label: 'Sprints', icon: <SprintIcon />, path: '/sprints' },
  { label: 'Issues', icon: <IssuesIcon />, path: '/issues' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    if (projectId) {
      setSelectedProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectApi.list();
        const list = res.data?.projects ?? res.data ?? [];
        setProjects(list);
        if (list.length > 0 && !selectedProject && !projectId) {
          setSelectedProject(list[0]._id || list[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, [projectId, selectedProject]);

  const isActive = (path) => location.pathname.startsWith(path);

  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderRight: 'none',
          boxShadow: '1px 0 6px rgba(0, 0, 0, 0.04)',
          transition: 'width 0.2s ease-in-out',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Logo / Title */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          px: collapsed ? 1 : 2.5,
          py: 2.5,
          minHeight: 64,
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}
              >
                PJ
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '1.15rem',
                letterSpacing: '-0.01em',
              }}
            >
              ProJira
            </Typography>
          </Box>
        )}

        {collapsed && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
              PJ
            </Typography>
          </Box>
        )}

        {!collapsed && (
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{ color: '#64748b' }}
          >
            <CollapseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Project Selector */}
      {!collapsed && (
        <Box sx={{ px: 2, mb: 1 }}>
          <FormControl fullWidth size="small">
            <Select
              value={selectedProject}
              onChange={(e) => {
                const projId = e.target.value;
                setSelectedProject(projId);
                const currentView = navItems.find((item) => location.pathname.startsWith(item.path));
                if (currentView && ['/board', '/backlog', '/sprints', '/issues'].includes(currentView.path)) {
                  navigate(`${currentView.path}/${projId}`);
                }
              }}
              displayEmpty
              sx={{
                fontSize: '0.85rem',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e2e8f0',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#c7d2fe',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#6366f1',
                },
              }}
            >
              {projects.length === 0 && (
                <MenuItem value="" disabled>
                  No projects
                </MenuItem>
              )}
              {projects.map((project) => (
                <MenuItem
                  key={project._id || project.id}
                  value={project._id || project.id}
                >
                  {project.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <Divider sx={{ borderColor: '#f1f5f9', mx: 2, my: 1 }} />

      {/* Navigation */}
      <List sx={{ flex: 1, px: 1.5, py: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const button = (
            <ListItemButton
              key={item.label}
              onClick={() => {
                if (['/board', '/backlog', '/sprints', '/issues'].includes(item.path)) {
                  if (selectedProject) {
                    navigate(`${item.path}/${selectedProject}`);
                  } else {
                    toast.error('Please select or create a project first');
                  }
                } else {
                  navigate(item.path);
                }
              }}
              sx={{
                borderRadius: '8px',
                mb: 0.5,
                px: collapsed ? 1.5 : 2,
                py: 1,
                justifyContent: collapsed ? 'center' : 'flex-start',
                backgroundColor: active ? '#eef2ff' : 'transparent',
                color: active ? '#6366f1' : '#1e293b',
                '&:hover': {
                  backgroundColor: active ? '#eef2ff' : '#f8fafc',
                },
                '& .MuiListItemIcon-root': {
                  color: active ? '#6366f1' : '#64748b',
                  minWidth: collapsed ? 0 : 40,
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 600 : 500,
                  }}
                />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.label} title={item.label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>

      {/* Collapse toggle when collapsed */}
      {collapsed && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{ color: '#64748b' }}
          >
            <ExpandIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Divider sx={{ borderColor: '#f1f5f9', mx: 2 }} />

      {/* User Info */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 1.5,
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 2.5,
          py: 2,
        }}
      >
        <Avatar
          sx={{
            width: 34,
            height: 34,
            bgcolor: '#6366f1',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
          src={user?.avatar}
        >
          {user?.full_name || user?.username || user?.name
            ? (user.full_name || user.username || user.name)
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
            : 'U'}
        </Avatar>
        {!collapsed && (
          <Box sx={{ overflow: 'hidden' }}>
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#1e293b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.full_name || user?.username || user?.name || 'User'}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email || ''}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
