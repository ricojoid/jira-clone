import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { momApi, projectApi, uploadApi, getAttachmentUrl } from '../api';
import Button from '../components/ui/Button';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  Paperclip,
  Upload,
  Trash2,
  Building,
  Save,
} from 'lucide-react';

const getInitialForm = () => ({
  project_id: '',
  title: '',
  meeting_date: new Date().toISOString().split('T')[0],
  meeting_time_from: '09:00',
  meeting_time_to: '10:00',
  meeting_place: '',
  report_date: new Date().toISOString().split('T')[0],
  report_by: '',
  attendance: '',
  agenda: '',
  meeting_result: '',
  next_action: '',
  attachment_url: '',
  attachment_name: '',
});

export default function CreateEditMoMPage() {
  const navigate = useNavigate();
  const { projectId: routeProjectId, momId } = useParams();
  const isEditing = Boolean(momId);

  const [form, setForm] = useState(getInitialForm);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const projRes = await projectApi.list();
        const list = projRes.data?.projects ?? projRes.data ?? [];
        setProjects(list);

        if (isEditing) {
          const momRes = await momApi.get(momId);
          const m = momRes.data;
          setForm({
            project_id: m.project_id || '',
            title: m.title || '',
            meeting_date: m.meeting_date || new Date().toISOString().split('T')[0],
            meeting_time_from: m.meeting_time_from || '09:00',
            meeting_time_to: m.meeting_time_to || '10:00',
            meeting_place: m.meeting_place || '',
            report_date: m.report_date || new Date().toISOString().split('T')[0],
            report_by: m.report_by || '',
            attendance: m.attendance || '',
            agenda: m.agenda || '',
            meeting_result: m.meeting_result || '',
            next_action: m.next_action || '',
            attachment_url: m.attachment_url || '',
            attachment_name: m.attachment_name || '',
          });
        } else {
          const init = getInitialForm();
          if (list.length === 1) {
            init.project_id = list[0].id || list[0]._id;
          } else if (routeProjectId) {
            init.project_id = routeProjectId;
          } else if (list.length > 0) {
            init.project_id = list[0].id || list[0]._id;
          }
          setForm(init);
        }
      } catch (err) {
        console.error('Failed to load data for MoM page:', err);
        toast.error('Failed to load page data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [momId, routeProjectId, isEditing]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await uploadApi.uploadFile(file);
      const url = res.data?.url || '';
      const filename = res.data?.filename || file.name;

      setForm((prev) => ({
        ...prev,
        attachment_url: url,
        attachment_name: filename,
      }));
      toast.success('File attached successfully');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error(err.response?.data?.detail || 'Failed to upload attachment');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = () => {
    setForm((prev) => ({
      ...prev,
      attachment_url: '',
      attachment_name: '',
    }));
  };

  const handleBack = () => {
    if (form.project_id) {
      navigate(`/mom/project/${form.project_id}`);
    } else {
      navigate('/mom');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_id) {
      toast.error('Please select a project');
      return;
    }
    if (!form.meeting_date) {
      toast.error('Please enter a meeting date');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...form,
        project_id: Number(form.project_id),
      };

      if (isEditing) {
        await momApi.update(momId, payload);
        toast.success('MoM updated successfully!');
      } else {
        await momApi.create(payload);
        toast.success('MoM created successfully!');
      }

      handleBack();
    } catch (err) {
      console.error('Failed to save MoM:', err);
      toast.error(err.response?.data?.detail || 'Failed to save MoM');
    } finally {
      setSubmitting(false);
    }
  };

  const isSingleProject = projects.length === 1;

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading form...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleBack}
            style={{ padding: '8px 12px' }}
            title="Back to MoM List"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {isEditing ? 'Edit Minutes of Meeting' : 'Create Minutes of Meeting'}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Fill in the meeting notes, attendance, results, and attach supporting files.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={handleBack} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" icon={Save} onClick={handleSubmit} loading={submitting}>
            {isEditing ? 'Save Changes' : 'Save MoM'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section 1: Project & Title */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: 10,
            }}
          >
            General Information
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Project <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {isSingleProject ? (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-hover)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                  }}
                >
                  {projects[0].name} ({projects[0].key})
                </div>
              ) : (
                <select
                  className="form-select"
                  value={form.project_id}
                  onChange={handleChange('project_id')}
                  required
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id || p._id} value={p.id || p._id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Subject / Title
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Sprint Kickoff & Requirement Alignment"
                value={form.title}
                onChange={handleChange('title')}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Date, Time & Venue */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: 10,
            }}
          >
            Meeting & Report Details
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Meeting Date <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={form.meeting_date}
                onChange={handleChange('meeting_date')}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Time From
              </label>
              <input
                type="time"
                className="form-input"
                value={form.meeting_time_from}
                onChange={handleChange('meeting_time_from')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Time To
              </label>
              <input
                type="time"
                className="form-input"
                value={form.meeting_time_to}
                onChange={handleChange('meeting_time_to')}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Meeting Place
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Meeting Room 3 / MS Teams Link"
                value={form.meeting_place}
                onChange={handleChange('meeting_place')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Report Date
              </label>
              <input
                type="date"
                className="form-input"
                value={form.report_date}
                onChange={handleChange('report_date')}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Personnel & Attendance */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: 10,
            }}
          >
            Reporter & Attendance
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Report By
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Reporter name, position, or details..."
                value={form.report_by}
                onChange={handleChange('report_by')}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                Attendance
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="List of attendees (e.g. John Doe, Sarah Smith, David)..."
                value={form.attendance}
                onChange={handleChange('attendance')}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Agenda, Results & Actions */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: 10,
            }}
          >
            Meeting Content & Outcomes
          </h3>

          {/* Agenda */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Agenda
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Main agenda items and topics discussed..."
              value={form.agenda}
              onChange={handleChange('agenda')}
            />
          </div>

          {/* Meeting Result */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Meeting Result
            </label>
            <textarea
              className="form-input"
              rows={10}
              style={{ fontSize: '0.95rem', lineHeight: 1.6, minHeight: 200 }}
              placeholder="Detailed decisions, consensus, notes, discussion summary, and technical agreements..."
              value={form.meeting_result}
              onChange={handleChange('meeting_result')}
            />
          </div>

          {/* Next Action */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
              Next Action
            </label>
            <textarea
              className="form-input"
              rows={4}
              placeholder="Action items, assignees, and target completion dates..."
              value={form.next_action}
              onChange={handleChange('next_action')}
            />
          </div>
        </div>

        {/* Section 5: Attachment */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--text-main)',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: 10,
            }}
          >
            Attachment
          </h3>

          {form.attachment_url ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <Paperclip size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <a
                  href={getAttachmentUrl(form.attachment_url)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 700,
                    color: 'var(--primary)',
                    textDecoration: 'underline',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {form.attachment_name || 'Attached File'}
                </a>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleRemoveAttachment}
                title="Remove attachment"
                style={{ color: '#ef4444' }}
              >
                <Trash2 size={16} /> Remove Attachment
              </button>
            </div>
          ) : (
            <div>
              <label
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: uploading ? 'wait' : 'pointer',
                  padding: '10px 16px',
                }}
              >
                <Upload size={16} />
                {uploading ? 'Uploading File...' : 'Upload Attachment (PDF, DOCX, XLSX, Image, Max 15MB)'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 24 }}>
          <Button variant="secondary" type="button" onClick={handleBack} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" icon={Save} loading={submitting}>
            {isEditing ? 'Save Changes' : 'Save MoM'}
          </Button>
        </div>
      </form>
    </div>
  );
}
