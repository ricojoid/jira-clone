import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  ListTodo,
  Zap,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  User as UserIcon,
  Users,
  FileText,
  CalendarDays,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { projectApi } from '../../api';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

export default function Sidebar({ collapsed, onToggleCollapse, onCloseMobile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  const { user, isPM, isSuperAdmin } = useAuth();

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  const baseNavItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Board', icon: Kanban, path: '/board' },
    { label: 'Backlog', icon: ListTodo, path: '/backlog' },
    { label: 'Phases / Sprints', icon: Zap, path: '/sprints' },
    { label: 'Issues', icon: CheckSquare, path: '/issues' },
    { label: 'Agenda', icon: CalendarDays, path: '/agenda' },
    { label: 'Minutes of Meeting', icon: FileText, path: '/mom' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const navItems = isSuperAdmin
    ? [...baseNavItems, { label: 'User Admin', icon: Users, path: '/admin/users' }]
    : baseNavItems;

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

  const handleNavClick = (path) => {
    let target = path;
    if (['/board', '/backlog', '/sprints', '/issues', '/agenda'].includes(path) && selectedProject) {
      target = `${path}/${selectedProject}`;
    } else if (path === '/mom' && selectedProject) {
      target = `/mom/project/${selectedProject}`;
    }
    navigate(target);
    if (onCloseMobile) onCloseMobile();
  };

  const isActive = (path) => location.pathname.startsWith(path);
  const width = collapsed ? 72 : 260;

  return (
    <aside
      className="sidebar-container"
      style={{
        width,
        minWidth: width,
        height: '100vh',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.32s cubic-bezier(0.22, 1, 0.36, 1), min-width 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden',
        zIndex: 100,
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: '16px 20px',
          height: 64,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.span
            className="auth-logo-tile"
            whileHover={{ rotate: -8, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, cursor: collapsed ? 'pointer' : 'default' }}
            onClick={collapsed ? onToggleCollapse : undefined}
          >
            <img src="/Logo.png" alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          </motion.span>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                Jired
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={onToggleCollapse}
            style={{ padding: 4 }}
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Project Selector */}
      {!collapsed && (
        <div style={{ padding: '16px 16px 8px 16px' }}>
          <label className="form-label sidebar-section-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.75rem' }}>
            ACTIVE PROJECT
          </label>
          <select
            className="form-select"
            value={selectedProject}
            onChange={(e) => {
              const projId = e.target.value;
              setSelectedProject(projId);
              const currentView = navItems.find((item) => location.pathname.startsWith(item.path));
              if (currentView && ['/board', '/backlog', '/sprints', '/issues', '/agenda'].includes(currentView.path)) {
                navigate(`${currentView.path}/${projId}`);
              }
            }}
            style={{ fontWeight: 700, fontSize: '0.85rem' }}
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              onClick={() => {
                if (['/board', '/backlog', '/sprints', '/issues'].includes(item.path)) {
                  if (selectedProject) {
                    navigate(`${item.path}/${selectedProject}`);
                  } else {
                    toast.error('Please select a project first');
                  }
                } else if (item.path === '/agenda') {
                  if (selectedProject) {
                    navigate(`/agenda/${selectedProject}`);
                  } else {
                    navigate('/agenda');
                  }
                } else {
                  navigate(item.path);
                }
              }}
              className={`btn nav-item${active ? ' nav-item-active' : ''}`}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 4,
                backgroundColor: 'transparent',
                color: active ? '#ffffff' : 'var(--text-body)',
                fontWeight: active ? 700 : 600,
                border: '1px solid transparent',
                padding: '9px 12px',
              }}
            >
              <Icon size={18} style={{ color: active ? '#ffffff' : 'var(--text-muted)' }} />
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Expand Button if collapsed */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={onToggleCollapse}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* User Footer */}
      <div
        style={{
          padding: '16px',
          margin: collapsed ? 0 : '0 10px 10px',
          borderRadius: collapsed ? 0 : 'var(--radius-md)',
          backgroundColor: collapsed ? 'transparent' : 'var(--bg-app)',
          border: collapsed ? 'none' : '1px solid var(--border-color)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Avatar name={user?.full_name || user?.username || user?.name} src={user?.avatar_url || user?.avatar} size={36} />
        {!collapsed && (
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.full_name || user?.username || user?.name || 'User'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              {isSuperAdmin ? (
                <Shield size={12} color="#dc2626" />
              ) : isPM ? (
                <Shield size={12} color="#ea580c" />
              ) : (
                <UserIcon size={12} color="var(--text-muted)" />
              )}
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {isSuperAdmin ? 'Super Admin' : isPM ? 'Project Manager' : 'Member'}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
