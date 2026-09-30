import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { agendaApi, projectApi } from '../api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Check,
  Building,
  List,
  Grid,
  Sparkles,
  UserCheck,
  Users,
  FileText,
} from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All Categories', color: '#71717a' },
  { key: 'meeting', label: 'Meeting / Sync', color: '#2563eb' },
  { key: 'sprint_event', label: 'Sprint Event / Scrum', color: '#7c3aed' },
  { key: 'deadline', label: 'Deadline / Milestone', color: '#dc2626' },
  { key: 'release', label: 'Release / Deployment', color: '#059669' },
  { key: 'workshop', label: 'Workshop / Demo', color: '#ea580c' },
  { key: 'reminder', label: 'Reminder / Task', color: '#d97706' },
  { key: 'general', label: 'General Event', color: '#475569' },
];

const PRESET_COLORS = [
  '#dc2626', // Red
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#059669', // Emerald
  '#ea580c', // Orange
  '#d97706', // Amber
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#475569', // Slate
];

export default function AgendaPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [agendas, setAgendas] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Filter States
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'schedule'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [editingAgenda, setEditingAgenda] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State (without location & meeting_link)
  const initialForm = {
    project_id: '',
    pic_ids: [],
    title: '',
    description: '',
    event_date: dayjs().format('YYYY-MM-DD'),
    start_time: '09:00',
    end_time: '10:00',
    category: 'meeting',
    color: '#dc2626',
  };
  const [formData, setFormData] = useState(initialForm);

  // Sync route projectId
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  // Load Projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectApi.list();
        const list = res.data?.projects ?? res.data ?? [];
        setProjects(list);
        if (list.length > 0 && !selectedProjectId && !projectId) {
          setSelectedProjectId(String(list[0].id || list[0]._id));
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
  }, [projectId, selectedProjectId]);

  // Fetch Project Members when project changes in Form
  useEffect(() => {
    const activeFormProjectId = formData.project_id || selectedProjectId;
    if (activeFormProjectId) {
      projectApi
        .listMembers(activeFormProjectId)
        .then((res) => {
          setProjectMembers(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to fetch project members:', err);
          setProjectMembers([]);
        });
    } else {
      setProjectMembers([]);
    }
  }, [formData.project_id, selectedProjectId]);

  // Fetch Agendas
  const fetchAgendas = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedProjectId) {
        params.project_id = selectedProjectId;
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const res = await agendaApi.list(params);
      setAgendas(res.data || []);
    } catch (err) {
      console.error('Failed to load agendas:', err);
      toast.error('Failed to load agenda list');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, selectedCategory]);

  useEffect(() => {
    fetchAgendas();
  }, [fetchAgendas]);

  // Project Switch handler
  const handleProjectChange = (e) => {
    const pId = e.target.value;
    setSelectedProjectId(pId);
    if (pId) {
      navigate(`/agenda/${pId}`);
    } else {
      navigate('/agenda');
    }
  };

  // Open Create Modal
  const handleOpenCreate = (prefillDate = null) => {
    setEditingAgenda(null);
    const todayStr = dayjs().format('YYYY-MM-DD');
    const validDate = prefillDate && prefillDate >= todayStr ? prefillDate : todayStr;

    setFormData({
      ...initialForm,
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ''),
      pic_ids: [],
      event_date: validDate,
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (agenda) => {
    setEditingAgenda(agenda);
    const existingPicIds = (agenda.pic_ids && agenda.pic_ids.length > 0)
      ? agenda.pic_ids
      : (agenda.pics && agenda.pics.length > 0)
      ? agenda.pics.map((p) => p.id)
      : agenda.pic_id
      ? [agenda.pic_id]
      : [];

    setFormData({
      project_id: String(agenda.project_id),
      pic_ids: existingPicIds,
      title: agenda.title || '',
      description: agenda.description || '',
      event_date: agenda.event_date ? dayjs(agenda.event_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      start_time: agenda.start_time || '09:00',
      end_time: agenda.end_time || '10:00',
      category: agenda.category || 'meeting',
      color: agenda.color || '#dc2626',
    });
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  // Open Detail Modal
  const handleOpenDetail = (agenda) => {
    setSelectedAgenda(agenda);
    setIsDetailModalOpen(true);
  };

  // Toggle PIC selection in form
  const handleTogglePic = (userId) => {
    setFormData((prev) => {
      const exists = prev.pic_ids.includes(userId);
      const newPicIds = exists
        ? prev.pic_ids.filter((id) => id !== userId)
        : [...prev.pic_ids, userId];
      return { ...prev, pic_ids: newPicIds };
    });
  };

  // Handle Form Submit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please provide an agenda title');
      return;
    }
    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }
    if (!formData.event_date) {
      toast.error('Please select a date');
      return;
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    if (formData.event_date < todayStr) {
      toast.error('Cannot schedule an agenda for a past date. Please select today or a future date.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        project_id: parseInt(formData.project_id, 10),
        pic_ids: formData.pic_ids.map((id) => parseInt(id, 10)),
        pic_id: formData.pic_ids.length > 0 ? parseInt(formData.pic_ids[0], 10) : null,
      };

      if (editingAgenda) {
        await agendaApi.update(editingAgenda.id, payload);
        toast.success('Agenda updated successfully');
      } else {
        await agendaApi.create(payload);
        toast.success('Agenda created successfully');
      }

      setIsFormModalOpen(false);
      fetchAgendas();
    } catch (err) {
      console.error('Failed to save agenda:', err);
      const msg = err.response?.data?.detail || 'Failed to save agenda';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteAgenda = async (agenda) => {
    if (!window.confirm(`Are you sure you want to delete agenda: "${agenda.title}"?`)) {
      return;
    }

    try {
      await agendaApi.delete(agenda.id);
      toast.success('Agenda deleted successfully');
      setIsDetailModalOpen(false);
      fetchAgendas();
    } catch (err) {
      console.error('Failed to delete agenda:', err);
      toast.error(err.response?.data?.detail || 'Failed to delete agenda');
    }
  };

  // Filtered Agendas by search query
  const filteredAgendas = useMemo(() => {
    return agendas.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const picsText = (item.pics || []).map((p) => p.full_name || p.username).join(' ').toLowerCase();
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.creator_name || '').toLowerCase().includes(q) ||
        (item.pic_names || '').toLowerCase().includes(q) ||
        picsText.includes(q) ||
        (item.project_name || '').toLowerCase().includes(q)
      );
    });
  }, [agendas, searchQuery]);

  // Calendar Calculation for Month Grid
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDay = startOfMonth.startOf('week'); // Sunday
    const endDay = endOfMonth.endOf('week'); // Saturday
    const todayStr = dayjs().format('YYYY-MM-DD');

    const days = [];
    let curr = startDay;

    while (curr.isBefore(endDay) || curr.isSame(endDay, 'day')) {
      const dateStr = curr.format('YYYY-MM-DD');
      const isCurrentMonth = curr.month() === currentDate.month();
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const dayAgendas = filteredAgendas.filter(
        (a) => dayjs(a.event_date).format('YYYY-MM-DD') === dateStr
      );

      days.push({
        date: curr,
        dateStr,
        isCurrentMonth,
        isToday,
        isPast,
        agendas: dayAgendas,
      });

      curr = curr.add(1, 'day');
    }

    return days;
  }, [currentDate, filteredAgendas]);

  // Today's Agendas
  const todayAgendas = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    return filteredAgendas.filter((a) => {
      if (!a.event_date) return false;
      const itemDateStr = dayjs(a.event_date).format('YYYY-MM-DD');
      return itemDateStr === todayStr;
    });
  }, [filteredAgendas]);

  // Upcoming in next 7 days (today up to 7 days ahead)
  const upcomingWeekAgendas = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const next7DaysStr = dayjs().add(7, 'day').format('YYYY-MM-DD');

    return filteredAgendas
      .filter((a) => {
        if (!a.event_date) return false;
        const itemDateStr = dayjs(a.event_date).format('YYYY-MM-DD');
        return itemDateStr >= todayStr && itemDateStr <= next7DaysStr;
      })
      .sort((a, b) => {
        const itemDateA = dayjs(a.event_date).format('YYYY-MM-DD');
        const itemDateB = dayjs(b.event_date).format('YYYY-MM-DD');
        if (itemDateA !== itemDateB) {
          return itemDateA.localeCompare(itemDateB);
        }
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
  }, [filteredAgendas]);

  const getCategoryMeta = (catKey) => {
    return CATEGORIES.find((c) => c.key === catKey) || { label: catKey, color: '#475569' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
      {/* Header Banner */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Project Agenda & Calendar
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Button variant="primary" icon={Plus} onClick={() => handleOpenCreate()}>
            Add Agenda
          </Button>
        </div>
      </div>

      {/* Control / Toolbar Card */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        {/* Left: Navigation Month / Year */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDate((prev) => prev.subtract(1, 'month'))}
              title="Previous Month"
              style={{ padding: '6px 8px' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setCurrentDate((prev) => prev.add(1, 'month'))}
              title="Next Month"
              style={{ padding: '6px 8px' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', minWidth: 160 }}>
            {currentDate.format('MMMM YYYY')}
          </div>
        </div>

        {/* Center/Right: Project selector, Category Filter, Search, View switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Project Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ height: 36, fontSize: '0.85rem', width: 'auto', minWidth: 160, fontWeight: 700 }}
              value={selectedProjectId}
              onChange={handleProjectChange}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ height: 36, fontSize: '0.85rem', width: 'auto' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 32, height: 36, fontSize: '0.825rem' }}
              placeholder="Search agenda or PICs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* View Mode Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 3,
              border: '1px solid var(--border-color)',
            }}
          >
            <button
              onClick={() => setViewMode('month')}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'month' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'month' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'month' ? 800 : 500,
                boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              title="Month Calendar View"
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('schedule')}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewMode === 'schedule' ? 'var(--bg-surface)' : 'transparent',
                color: viewMode === 'schedule' ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: viewMode === 'schedule' ? 800 : 500,
                boxShadow: viewMode === 'schedule' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              title="Schedule / List View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Calendar + Side Widgets */}
      <div className="m-stack-lg" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Left Column: Calendar Grid or Schedule View */}
        <div style={{ minWidth: 0 }}>
          {viewMode === 'month' ? (
            /* Month Calendar Grid */
            <div
              className="card"
              style={{
                padding: 0,
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
              }}
            >
              {/* Day Name Header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  backgroundColor: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-color)',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '10px 0',
                }}
              >
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Day Cells Grid */}
              <div
                className="agenda-calendar-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  backgroundColor: 'var(--border-color)',
                  gap: '1px',
                }}
              >
                {calendarDays.map((cell) => {
                  return (
                    <div
                      key={cell.dateStr}
                      onClick={(e) => {
                        if (e.target === e.currentTarget || e.target.classList.contains('cell-date-num')) {
                          if (cell.isPast) {
                            toast.error('Cannot schedule an agenda on a past date');
                            return;
                          }
                          handleOpenCreate(cell.dateStr);
                        }
                      }}
                      style={{
                        minHeight: 110,
                        minWidth: 0,
                        overflow: 'hidden',
                        backgroundColor: cell.isPast
                          ? 'var(--bg-app)'
                          : cell.isCurrentMonth
                          ? 'var(--bg-surface)'
                          : 'var(--bg-app)',
                        opacity: cell.isPast ? 0.65 : cell.isCurrentMonth ? 1 : 0.55,
                        padding: '8px 6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        position: 'relative',
                        cursor: cell.isPast ? 'default' : 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = cell.isCurrentMonth
                          ? 'var(--bg-hover)'
                          : 'var(--bg-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = cell.isCurrentMonth
                          ? 'var(--bg-surface)'
                          : 'var(--bg-app)';
                      }}
                    >
                      {/* Date Number & Today Indicator */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                          minWidth: 0,
                        }}
                      >
                        <span
                          className="cell-date-num"
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: cell.isToday ? 900 : 700,
                            width: 24,
                            height: 24,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backgroundColor: cell.isToday ? 'var(--primary)' : 'transparent',
                            color: cell.isToday ? '#ffffff' : cell.isCurrentMonth ? 'var(--text-main)' : 'var(--text-muted)',
                            boxShadow: cell.isToday ? '0 2px 6px rgba(220, 38, 38, 0.4)' : 'none',
                            flexShrink: 0,
                          }}
                        >
                          {cell.date.date()}
                        </span>

                        {cell.agendas.length > 0 && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              minWidth: 0,
                            }}
                          >
                            {cell.agendas.length} event{cell.agendas.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Agendas List in Day Cell */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflow: 'hidden', minWidth: 0, width: '100%' }}>
                        {cell.agendas.slice(0, 3).map((agenda) => {
                          const catMeta = getCategoryMeta(agenda.category);
                          const badgeColor = agenda.color || catMeta.color;

                          return (
                            <div
                              key={agenda.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDetail(agenda);
                              }}
                              title={`${agenda.start_time ? agenda.start_time + ' ' : ''}${agenda.title} (${agenda.project_name || 'Project'})${agenda.pic_names ? ' | PICs: ' + agenda.pic_names : ''}`}
                              style={{
                                fontSize: '0.72rem',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: `${badgeColor}18`,
                                color: badgeColor,
                                borderLeft: `3px solid ${badgeColor}`,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer',
                                transition: 'transform 0.1s ease',
                                minWidth: 0,
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                              }}
                            >
                              {agenda.start_time && (
                                <span style={{ opacity: 0.85, fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                                  {agenda.start_time}
                                </span>
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                                {agenda.title}
                              </span>
                            </div>
                          );
                        })}

                        {cell.agendas.length > 3 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(cell.agendas[3]);
                            }}
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: 'var(--text-muted)',
                              textAlign: 'center',
                              padding: '2px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-subtle)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}
                          >
                            +{cell.agendas.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Schedule / List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {loading ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading agenda items...
                </div>
              ) : filteredAgendas.length === 0 ? (
                <div
                  className="card"
                  style={{
                    padding: 48,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <CalendarDays size={48} style={{ color: 'var(--text-light)' }} />
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      No Agendas Found
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {searchQuery
                        ? 'No agenda items match your search filter.'
                        : 'No upcoming agendas in this project yet. Start by adding one!'}
                    </p>
                  </div>
                  <Button variant="primary" icon={Plus} onClick={() => handleOpenCreate()}>
                    Create Agenda
                  </Button>
                </div>
              ) : (
                filteredAgendas.map((agenda) => {
                  const catMeta = getCategoryMeta(agenda.category);
                  const badgeColor = agenda.color || catMeta.color;
                  const itemDate = dayjs(agenda.event_date);
                  const isToday = itemDate.isSame(dayjs(), 'day');
                  const assignedPics = (agenda.pics && agenda.pics.length > 0)
                    ? agenda.pics
                    : agenda.pic_name
                    ? [{ id: agenda.pic_id, full_name: agenda.pic_name, username: agenda.pic_name, avatar_url: agenda.pic_avatar }]
                    : [];

                  return (
                    <div
                      key={agenda.id}
                      className="card"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 16,
                        borderLeft: `4px solid ${badgeColor}`,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Left: Date badge + Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
                        {/* Date badge */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 60,
                            height: 60,
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isToday ? 'var(--primary)' : 'var(--bg-subtle)',
                            color: isToday ? '#ffffff' : 'var(--text-main)',
                            flexShrink: 0,
                            boxShadow: isToday ? '0 3px 8px rgba(220, 38, 38, 0.3)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                            {itemDate.format('MMM')}
                          </span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 900, lineHeight: 1 }}>
                            {itemDate.format('DD')}
                          </span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, opacity: 0.8 }}>
                            {itemDate.format('ddd')}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: `${badgeColor}18`,
                                color: badgeColor,
                                fontSize: '0.72rem',
                                fontWeight: 800,
                              }}
                            >
                              {catMeta.label}
                            </span>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: 'var(--bg-subtle)',
                                color: 'var(--text-muted)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                              }}
                            >
                              <Building size={11} /> {agenda.project_name || 'Project'}
                            </span>
                            {assignedPics.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <UserCheck size={12} /> PIC ({assignedPics.length}): {assignedPics.map((p) => p.full_name || p.username).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          <h3
                            onClick={() => handleOpenDetail(agenda)}
                            style={{
                              fontSize: '1.05rem',
                              fontWeight: 800,
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {agenda.title}
                          </h3>

                          {/* Time & Creator details */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 14,
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              flexWrap: 'wrap',
                            }}
                          >
                            {(agenda.start_time || agenda.end_time) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={13} />
                                <span>
                                  {agenda.start_time || '--:--'} - {agenda.end_time || '--:--'}
                                </span>
                              </div>
                            )}
                            {agenda.creator_name && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Avatar name={agenda.creator_name} src={agenda.creator_avatar} size={18} />
                                <span style={{ fontSize: '0.75rem' }}>By {agenda.creator_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenDetail(agenda)}
                          title="View Detail"
                          style={{ padding: 6 }}
                        >
                          <CalendarIcon size={16} />
                        </button>

                        {agenda.can_edit && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenEdit(agenda)}
                            title="Edit Agenda"
                            style={{ padding: 6 }}
                          >
                            <Edit2 size={16} />
                          </button>
                        )}

                        {agenda.can_delete && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteAgenda(agenda)}
                            title="Delete Agenda"
                            style={{ padding: 6, color: '#ef4444' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Column: Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Quick Add Promo Card */}
          <div
            className="card"
            style={{
              padding: '18px',
              backgroundColor: 'var(--primary-light)',
              border: '1px solid var(--primary-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="var(--primary)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                New Team Agenda
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-body)', lineHeight: 1.4 }}>
              Schedule events and assign multiple PICs. Every assigned member receives a real-time notification.
            </p>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenCreate()}>
              Schedule Now
            </Button>
          </div>

          {/* Today's Agenda Widget */}
          <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} color="var(--primary)" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Today's Events
                </h4>
              </div>
              <span
                className="badge"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                }}
              >
                {todayAgendas.length}
              </span>
            </div>

            {todayAgendas.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No events scheduled for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {todayAgendas.map((item) => {
                  const catMeta = getCategoryMeta(item.category);
                  const badgeColor = item.color || catMeta.color;
                  const itemPics = item.pics || [];

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-subtle)',
                        borderLeft: `3px solid ${badgeColor}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: badgeColor }}>
                          {item.start_time || 'All Day'}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </div>
                      {itemPics.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserCheck size={11} color="var(--primary)" />
                          <span>PIC: {itemPics.map((p) => p.full_name || p.username).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming (Next 7 Days) Widget */}
          <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarIcon size={16} color="var(--text-muted)" />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Upcoming (7 Days)
                </h4>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {upcomingWeekAgendas.length}
              </span>
            </div>

            {upcomingWeekAgendas.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                No upcoming events in next 7 days.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {upcomingWeekAgendas.map((item) => {
                  const catMeta = getCategoryMeta(item.category);
                  const badgeColor = item.color || catMeta.color;
                  const itemDate = dayjs(item.event_date);

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-subtle)',
                        borderLeft: `3px solid ${badgeColor}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {itemDate.format('ddd, D MMM')} &bull; {item.start_time || 'All Day'}
                          {item.pic_names && ` \u2022 PIC: ${item.pic_names}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create / Edit Agenda */}
      <Modal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingAgenda ? 'Edit Agenda' : 'Add New Agenda'}
        maxWidth="620px"
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Project & PIC Selection */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              Project <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="form-select"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value, pic_ids: [] })}
              required
            >
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Multiple PIC Selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>
                Persons In Charge (PIC)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {formData.pic_ids.length} selected
              </span>
            </div>

            {/* Member Multi-Select List */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                maxHeight: 140,
                overflowY: 'auto',
                padding: '4px',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {projectMembers.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 12px', textAlign: 'center' }}>
                  No members found for this project.
                </div>
              ) : (
                projectMembers.map((m) => {
                  const u = m.user;
                  if (!u) return null;
                  const isSelected = formData.pic_ids.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      type="button"
                      onClick={() => handleTogglePic(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? 'var(--primary-light)' : 'var(--bg-surface)',
                        border: isSelected ? '1px solid var(--primary-border)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={u.full_name || u.username} src={u.avatar_url} size={24} />
                        <span style={{ fontSize: '0.825rem', fontWeight: isSelected ? 800 : 600, color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                          {u.full_name || u.username}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          ({m.role || 'Member'})
                        </span>
                      </div>

                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? 'var(--primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <Check size={12} color="#ffffff" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Agenda Title */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              Agenda Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Sprint Planning, Client Demo, Release v2.0"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Date & Time Range */}
          <div className="m-stack" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                min={dayjs().format('YYYY-MM-DD')}
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                Start Time
              </label>
              <input
                type="time"
                className="form-input"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                End Time
              </label>
              <input
                type="time"
                className="form-input"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Category & Color Tag */}
          <div className="m-stack" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                Category
              </label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  const catColor = CATEGORIES.find((c) => c.key === cat)?.color || '#dc2626';
                  setFormData({ ...formData, category: cat, color: catColor });
                }}
              >
                {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                Tag Color
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      backgroundColor: c,
                      border: formData.color === c ? '2px solid var(--text-main)' : '2px solid transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      transform: formData.color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.1s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Description & Agenda Notes */}
          <div>
            <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
              Description / Agenda Notes
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Outline meeting points, preparation, or discussion topics..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingAgenda ? 'Update Agenda' : 'Create Agenda'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Agenda Detail */}
      {selectedAgenda && (
        <Modal
          open={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title="Agenda Detail"
          maxWidth="1100px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header badges & metadata */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  className="badge"
                  style={{
                    backgroundColor: `${selectedAgenda.color || '#dc2626'}20`,
                    color: selectedAgenda.color || '#dc2626',
                    fontSize: '0.825rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                  }}
                >
                  {getCategoryMeta(selectedAgenda.category).label}
                </span>

                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                  }}
                >
                  <Building size={13} /> {selectedAgenda.project_name || 'Project'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-subtle)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <CalendarIcon size={14} color="var(--primary)" />
                {dayjs(selectedAgenda.event_date).format('dddd, D MMMM YYYY')}
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                {selectedAgenda.title}
              </h2>
            </div>

            {/* Timing & Schedule Info Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    flexShrink: 0,
                  }}
                >
                  <Clock size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Schedule Time
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                    {selectedAgenda.start_time || '--:--'} &ndash; {selectedAgenda.end_time || '--:--'}
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedAgenda.color || '#dc2626',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    flexShrink: 0,
                  }}
                >
                  <CalendarDays size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Event Date
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                    {dayjs(selectedAgenda.event_date).format('D MMMM YYYY')}
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned PICs Section */}
            <div
              style={{
                backgroundColor: (selectedAgenda.pics && selectedAgenda.pics.length > 0) || selectedAgenda.pic_name ? '#f0fdf4' : 'var(--bg-subtle)',
                border: (selectedAgenda.pics && selectedAgenda.pics.length > 0) || selectedAgenda.pic_name ? '1px solid #bbf7d0' : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                  <Users size={15} color="#16a34a" /> Persons In Charge (PIC)
                </div>
                {((selectedAgenda.pics && selectedAgenda.pics.length > 0) || selectedAgenda.pic_name) && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                    }}
                  >
                    {(selectedAgenda.pics && selectedAgenda.pics.length) || 1} Assigned
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 10,
                }}
              >
                {selectedAgenda.pics && selectedAgenda.pics.length > 0 ? (
                  selectedAgenda.pics.map((pic) => (
                    <div
                      key={pic.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: '#ffffff',
                        border: '1px solid #bbf7d0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                        minWidth: 0,
                      }}
                    >
                      <Avatar name={pic.full_name || pic.username} src={pic.avatar_url} size={28} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pic.full_name || pic.username}
                        </div>
                        {pic.username && pic.full_name && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            @{pic.username}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : selectedAgenda.pic_name ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: '#ffffff',
                      border: '1px solid #bbf7d0',
                      minWidth: 0,
                    }}
                  >
                    <Avatar name={selectedAgenda.pic_name} src={selectedAgenda.pic_avatar} size={28} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedAgenda.pic_name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    No PICs assigned to this agenda.
                  </span>
                )}
              </div>
            </div>

            {/* Description / Notes Section */}
            {selectedAgenda.description && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  <FileText size={14} color="var(--primary)" /> Agenda Notes & Details
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-body)',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    backgroundColor: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                >
                  {selectedAgenda.description}
                </div>
              </div>
            )}

            {/* Creator Info & Action Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 14,
                borderTop: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={selectedAgenda.creator_name} src={selectedAgenda.creator_avatar} size={32} />
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>Created by <strong style={{ color: 'var(--text-main)' }}>{selectedAgenda.creator_name || 'User'}</strong></div>
                  {selectedAgenda.created_at && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 1 }}>
                      {dayjs(selectedAgenda.created_at).format('D MMM YYYY, HH:mm')}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedAgenda.can_edit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Edit2}
                    onClick={() => handleOpenEdit(selectedAgenda)}
                  >
                    Edit Agenda
                  </Button>
                )}

                {selectedAgenda.can_delete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    onClick={() => handleDeleteAgenda(selectedAgenda)}
                    style={{ color: '#ef4444' }}
                  >
                    Delete
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
