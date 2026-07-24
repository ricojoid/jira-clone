import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { momApi, projectApi, uploadApi, getAttachmentUrl } from '../../api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Paperclip, Trash2, Upload, Calendar, Clock, MapPin, User, FileText, CheckCircle2 } from 'lucide-react';

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

export default function CreateEditMomModal({ open, onClose, momData = null, defaultProjectId = '', onSaved }) {
  const isEditing = Boolean(momData?.id);
  const [form, setForm] = useState(getInitialForm);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await projectApi.list();
        const list = res.data?.projects ?? res.data ?? [];
        setProjects(list);

        if (momData) {
          setForm({
            project_id: momData.project_id || '',
            title: momData.title || '',
            meeting_date: momData.meeting_date || new Date().toISOString().split('T')[0],
            meeting_time_from: momData.meeting_time_from || '09:00',
            meeting_time_to: momData.meeting_time_to || '10:00',
            meeting_place: momData.meeting_place || '',
            report_date: momData.report_date || new Date().toISOString().split('T')[0],
            report_by: momData.report_by || '',
            attendance: momData.attendance || '',
            agenda: momData.agenda || '',
            meeting_result: momData.meeting_result || '',
            next_action: momData.next_action || '',
            attachment_url: momData.attachment_url || '',
            attachment_name: momData.attachment_name || '',
          });
        } else {
          const init = getInitialForm();
          if (list.length === 1) {
            init.project_id = list[0].id || list[0]._id;
          } else if (defaultProjectId) {
            init.project_id = defaultProjectId;
          } else if (list.length > 0) {
            init.project_id = list[0].id || list[0]._id;
          }
          setForm(init);
        }
      } catch (err) {
        console.error('Failed to load projects for MoM:', err);
        toast.error('Failed to load project list');
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [open, momData, defaultProjectId]);

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
        await momApi.update(momData.id, payload);
        toast.success('MoM updated successfully!');
      } else {
        await momApi.create(payload);
        toast.success('MoM created successfully!');
      }

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save MoM:', err);
      toast.error(err.response?.data?.detail || 'Failed to save MoM');
    } finally {
      setSubmitting(false);
    }
  };

  const isSingleProject = projects.length === 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Minutes of Meeting (MoM)' : 'Create Minutes of Meeting (MoM)'}
      maxWidth="760px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Project Selection */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
            Project <span style={{ color: '#ef4444' }}>*</span>
          </label>
          {isSingleProject ? (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                color: 'var(--text-main)',
              }}
            >
              {projects[0].name} ({projects[0].key || 'Project'})
            </div>
          ) : (
            <select
              className="form-select"
              value={form.project_id}
              onChange={handleChange('project_id')}
              disabled={loadingProjects}
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

        {/* Title / Subject */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700 }}>
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

        {/* Meeting Date & Time Range */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Meeting Date <span style={{ color: '#ef4444' }}>*</span>
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
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Time From
            </label>
            <input
              type="time"
              className="form-input"
              value={form.meeting_time_from}
              onChange={handleChange('meeting_time_from')}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> Time To
            </label>
            <input
              type="time"
              className="form-input"
              value={form.meeting_time_to}
              onChange={handleChange('meeting_time_to')}
            />
          </div>
        </div>

        {/* Meeting Place & Report Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> Meeting Place
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
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Report Date
            </label>
            <input
              type="date"
              className="form-input"
              value={form.report_date}
              onChange={handleChange('report_date')}
            />
          </div>
        </div>

        {/* Report By & Attendance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} /> Report By
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Reporter name or details..."
              value={form.report_by}
              onChange={handleChange('report_by')}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={14} /> Attendance
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Attendees list (e.g. John, Sarah, David)..."
              value={form.attendance}
              onChange={handleChange('attendance')}
            />
          </div>
        </div>

        {/* Agenda */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Agenda
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Main topics or agenda items discussed..."
            value={form.agenda}
            onChange={handleChange('agenda')}
          />
        </div>

        {/* Meeting Result */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} /> Meeting Result
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Decisions, notes, and discussion summary..."
            value={form.meeting_result}
            onChange={handleChange('meeting_result')}
          />
        </div>

        {/* Next Action */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} /> Next Action
          </label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Action items, assignees, and target completion dates..."
            value={form.next_action}
            onChange={handleChange('next_action')}
          />
        </div>

        {/* File Attachment */}
        <div className="form-group">
          <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Paperclip size={14} /> Attachment
          </label>

          {form.attachment_url ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <Paperclip size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                <a
                  href={getAttachmentUrl(form.attachment_url)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 600,
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
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div>
              <label
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: uploading ? 'wait' : 'pointer',
                }}
              >
                <Upload size={14} />
                {uploading ? 'Uploading...' : 'Attach File (Max 15MB)'}
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

        {/* Form Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 8,
            paddingTop: 16,
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting}>
            {isEditing ? 'Update MoM' : 'Create MoM'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
