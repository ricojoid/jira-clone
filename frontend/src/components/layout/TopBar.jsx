import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CreateIssueDialog from '../issues/CreateIssueDialog';
import {
  AppBar,
  Toolbar,
  Box,
  Breadcrumbs,
  Link,
  Typography,
  TextField,
  InputAdornment,
  Button,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  NotificationsOutlined as NotificationIcon,
  NavigateNext as BreadcrumbSeparator,
  Logout as LogoutIcon,
  PersonOutlined as ProfileIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

function buildBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Home', path: '/' }];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    crumbs.push({ label, path: currentPath });
  }

  return crumbs;
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user, logout } = useAuth();

  const [searchValue, setSearchValue] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const breadcrumbs = buildBreadcrumbs(location.pathname);

  const handleAvatarClick = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    if (logout) logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchValue.trim() && projectId) {
      navigate(`/issues/${projectId}?search=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        color: '#1e293b',
      }}
    >
      <Toolbar
        sx={{
          minHeight: '56px !important',
          px: { xs: 2, md: 3 },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Left: Breadcrumbs */}
        <Breadcrumbs
          separator={
            <BreadcrumbSeparator
              fontSize="small"
              sx={{ color: '#94a3b8' }}
            />
          }
          sx={{ flexShrink: 0 }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return isLast ? (
              <Typography
                key={crumb.path}
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                underline="hover"
                onClick={() => navigate(crumb.path)}
                sx={{
                  fontSize: '0.85rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontWeight: 500,
                  '&:hover': { color: '#6366f1' },
                }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>

        {/* Right: Search + Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Search */}
          <TextField
            size="small"
            placeholder="Search issues..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: 240,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                fontSize: '0.85rem',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#c7d2fe' },
                '&.Mui-focused fieldset': { borderColor: '#6366f1' },
              },
            }}
          />

          {/* Create Issue Button */}
          {projectId && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
              sx={{
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.825rem',
                px: 2,
                py: 0.8,
                backgroundColor: '#6366f1',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#4f46e5',
                  boxShadow: 'none',
                },
              }}
            >
              Create Issue
            </Button>
          )}

          {/* Notifications */}
          <IconButton
            size="small"
            sx={{
              color: '#64748b',
              '&:hover': { backgroundColor: '#f1f5f9' },
            }}
          >
            <Badge
              variant="dot"
              invisible
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  fontSize: '0.7rem',
                  minWidth: 18,
                  height: 18,
                },
              }}
            >
              <NotificationIcon fontSize="small" />
            </Badge>
          </IconButton>

          {/* User Avatar / Dropdown */}
          <IconButton
            onClick={handleAvatarClick}
            size="small"
            sx={{ ml: 0.5 }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: '#6366f1',
                fontSize: '0.8rem',
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
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                mt: 1,
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid #f1f5f9',
                minWidth: 180,
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography
                sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}
              >
                {user?.full_name || user?.username || user?.name || 'User'}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b' }}>
                {user?.email || ''}
              </Typography>
            </Box>
            <Divider sx={{ borderColor: '#f1f5f9' }} />
            <MenuItem
              onClick={handleProfile}
              sx={{ fontSize: '0.85rem', gap: 1.5, py: 1 }}
            >
              <ProfileIcon fontSize="small" sx={{ color: '#64748b' }} />
              Profile
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{ fontSize: '0.85rem', gap: 1.5, py: 1, color: '#ef4444' }}
            >
              <LogoutIcon fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      {projectId && (
        <CreateIssueDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          projectId={projectId}
          onCreated={() => {
            setCreateOpen(false);
            window.location.reload();
          }}
        />
      )}
    </AppBar>
  );
}
