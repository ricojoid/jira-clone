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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { projectApi } from '../../api';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

export default function Sidebar({ collapsed, onToggleCollapse }) {
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

  const isActive = (path) => location.pathname.startsWith(path);
  const width = collapsed ? 72 : 260;

  return (
    <aside
      style={{
        width,
        minWidth: width,
        height: '100vh',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 900,
              fontSize: 16,
              boxShadow: '0 4px 10px rgba(220, 38, 38, 0.3)',
            }}
          >
            JC
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-main)', lineHeight: 1.1 }}>
                Jired
              </div>
              <div style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 800 }}>
                Enterprise Platform
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
          <label className="form-label" style={{ marginBottom: 6, display: 'block', fontSize: '0.75rem' }}>
            ACTIVE PROJECT
          </label>
          <select
            className="form-select"
            value={selectedProject}
            onChange={(e) => {
              const projId = e.target.value;
              setSelectedProject(projId);
              const currentView = navItems.find((item) => location.pathname.startsWith(item.path));
              if (currentView && ['/board', '/backlog', '/sprints', '/issues'].includes(currentView.path)) {
                navigate(`${currentView.path}/${projId}`);
              }
            }}
            style={{ fontWeight: 700, fontSize: '0.85rem' }}
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name} [{(p.sdlc_type || 'scrum').toUpperCase()}]
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
                } else {
                  navigate(item.path);
                }
              }}
              className="btn"
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 4,
                backgroundColor: active ? '#dc2626' : 'transparent',
                color: active ? '#ffffff' : 'var(--text-body)',
                fontWeight: active ? 800 : 600,
                border: active ? '1px solid #b91c1c' : '1px solid transparent',
                boxShadow: active ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} style={{ color: active ? '#ffffff' : 'var(--text-muted)' }} />
              {!collapsed && <span>{item.label}</span>}
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
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <Avatar name={user?.full_name || user?.username || user?.name} src={user?.avatar} size={36} />
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
