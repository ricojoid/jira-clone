import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { momApi, projectApi, getAttachmentUrl } from '../api';
import { exportMomToExcel } from '../utils/excelExport';
import Button from '../components/ui/Button';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  Paperclip,
  Eye,
  Edit2,
  Trash2,
  Filter,
  Building,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export default function MoMPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [moms, setMoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [createEditOpen, setCreateEditOpen] = useState(false);
  const [editingMom, setEditingMom] = useState(null);
  const [selectedMom, setSelectedMom] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Sync route projectId
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  // Load project list
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await projectApi.list();
        const list = res.data?.projects ?? res.data ?? [];
        setProjects(list);
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, []);

  // Fetch MoMs
  const fetchMoms = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedProjectId) {
        params.project_id = selectedProjectId;
      }
      const res = await momApi.list(params);
      setMoms(res.data || []);
    } catch (err) {
      console.error('Failed to fetch MoMs:', err);
      toast.error('Failed to load Minutes of Meeting list');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchMoms();
  }, [fetchMoms]);

  const handleProjectFilterChange = (e) => {
    const pId = e.target.value;
    setSelectedProjectId(pId);
    if (pId) {
      navigate(`/mom/project/${pId}`);
    } else {
      navigate('/mom');
    }
  };

  const handleOpenCreate = () => {
    if (selectedProjectId) {
      navigate(`/mom/new/${selectedProjectId}`);
    } else {
      navigate('/mom/new');
    }
  };

  const handleOpenEdit = (mom) => {
    navigate(`/mom/edit/${mom.id}`);
  };

  const handleOpenDetail = (mom) => {
    navigate(`/mom/view/${mom.id}`);
  };

  const handleDelete = async (mom) => {
    if (!window.confirm(`Are you sure you want to delete MoM: "${mom.title || 'Minutes of Meeting'}"?`)) {
      return;
    }

    try {
      await momApi.delete(mom.id);
      toast.success('MoM deleted successfully');
      setDetailOpen(false);
      fetchMoms();
    } catch (err) {
      console.error('Failed to delete MoM:', err);
      toast.error('Failed to delete MoM');
    }
  };

  // Filter MoMs by search query
  const filteredMoms = moms.filter((mom) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (mom.title || '').toLowerCase().includes(q) ||
      (mom.agenda || '').toLowerCase().includes(q) ||
      (mom.meeting_place || '').toLowerCase().includes(q) ||
      (mom.report_by || '').toLowerCase().includes(q) ||
      (mom.attendance || '').toLowerCase().includes(q) ||
      (mom.project_name || '').toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Minutes of Meeting
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Record, track, and manage official meeting notes and action items per project.
          </p>
        </div>

        <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
          Create MoM
        </Button>
      </div>

      {/* Filter & Search Controls */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, height: 38, fontSize: '0.875rem' }}
              placeholder="Search MoMs by title, agenda, reporter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Project Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ height: 38, fontSize: '0.85rem', width: 'auto', minWidth: 180 }}
              value={selectedProjectId}
              onChange={handleProjectFilterChange}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name} ({p.key})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Total MoM: <strong style={{ color: 'var(--text-main)' }}>{filteredMoms.length}</strong>
        </div>
      </div>

      {/* MoM Content List / Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Minutes of Meeting records...
        </div>
      ) : filteredMoms.length === 0 ? (
        <div
          className="card"
          style={{
            padding: 48,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <FileText size={48} style={{ color: 'var(--text-light)' }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              No Minutes of Meeting Found
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {searchQuery
                ? 'No MoM records match your search criteria.'
                : 'Get started by creating your first MoM record for this project.'}
            </p>
          </div>
          <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Create First MoM
          </Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filteredMoms.map((mom) => (
            <div
              key={mom.id}
              className="card"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: 16,
                transition: 'all 0.15s ease',
                borderLeft: '4px solid var(--primary)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Header: Project Badge & Date */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Building size={12} /> {mom.project_name || 'Project'}
                  </span>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Calendar size={13} /> {formatDate(mom.meeting_date)}
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => handleOpenDetail(mom)}
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: 'var(--text-main)',
                    lineHeight: 1.3,
                    cursor: 'pointer',
                  }}
                >
                  {mom.title || 'Minutes of Meeting'}
                </h3>

                {/* Meta details: Time & Place */}
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
                  {(mom.meeting_time_from || mom.meeting_time_to) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      <span>
                        {mom.meeting_time_from || '--:--'} - {mom.meeting_time_to || '--:--'}
                      </span>
                    </div>
                  )}

                  {mom.meeting_place && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={13} />
                      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {mom.meeting_place}
                      </span>
                    </div>
                  )}
                </div>

                {/* Agenda snippet */}
                {mom.agenda && (
                  <div
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-body)',
                      backgroundColor: 'var(--bg-hover)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4,
                    }}
                  >
                    <strong style={{ color: 'var(--text-main)' }}>Agenda:</strong> {mom.agenda}
                  </div>
                )}
              </div>

              {/* Footer Actions & Attachment Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-light)',
                  marginTop: 4,
                }}
              >
                <div>
                  {mom.attachment_url ? (
                    <a
                      href={getAttachmentUrl(mom.attachment_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="badge"
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        fontSize: '0.725rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        textDecoration: 'none',
                      }}
                    >
                      <Paperclip size={12} /> {mom.attachment_name || 'Attachment'}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>No attachment</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleOpenDetail(mom)}
                    title="View Details"
                    style={{ padding: 6 }}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => exportMomToExcel(mom)}
                    title="Export Excel"
                    style={{ padding: 6, color: '#16a34a' }}
                  >
                    <FileSpreadsheet size={16} />
                  </button>
                  {mom.can_edit !== false && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleOpenEdit(mom)}
                      title="Edit MoM"
                      style={{ padding: 6 }}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  {mom.can_delete !== false && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(mom)}
                      title="Delete MoM"
                      style={{ padding: 6, color: '#ef4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
