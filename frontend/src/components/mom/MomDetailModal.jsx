import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { getAttachmentUrl } from '../../api';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
  CheckCircle2,
  Paperclip,
  Download,
  Edit2,
  Trash2,
  Building,
} from 'lucide-react';

export default function MomDetailModal({ open, onClose, mom, onEdit, onDelete }) {
  if (!mom) return null;

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
    <Modal
      open={open}
      onClose={onClose}
      title={mom.title || 'Minutes of Meeting (MoM)'}
      maxWidth="720px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header Metadata Grid */}
        <div
          className="card"
          style={{
            padding: 16,
            backgroundColor: 'var(--bg-hover)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Project</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{mom.project_name || mom.project_id}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meeting Date</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatDate(mom.meeting_date)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                {mom.meeting_time_from || '--:--'} - {mom.meeting_time_to || '--:--'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Meeting Place</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{mom.meeting_place || '-'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Report Date</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatDate(mom.report_date)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created By</div>
              <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{mom.creator_name || '-'}</div>
            </div>
          </div>
        </div>

        {/* Report By & Attendance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <User size={14} /> Report By
            </h4>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {mom.report_by || '-'}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <User size={14} /> Attendance
            </h4>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {mom.attendance || '-'}
            </div>
          </div>
        </div>

        {/* Agenda */}
        <div className="card" style={{ padding: 16 }}>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileText size={14} /> Agenda
          </h4>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {mom.agenda || '-'}
          </div>
        </div>

        {/* Meeting Result */}
        <div className="card" style={{ padding: 16 }}>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#16a34a',
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle2 size={14} /> Meeting Result
          </h4>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {mom.meeting_result || '-'}
          </div>
        </div>

        {/* Next Action */}
        <div className="card" style={{ padding: 16 }}>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              color: '#d97706',
              textTransform: 'uppercase',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Clock size={14} /> Next Action
          </h4>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)', fontSize: '0.925rem', lineHeight: 1.5 }}>
            {mom.next_action || '-'}
          </div>
        </div>

        {/* Attachment Section */}
        {mom.attachment_url && (
          <div
            className="card"
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Paperclip size={18} style={{ color: '#2563eb' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>Attachment</div>
                <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                  {mom.attachment_name || 'Attached File'}
                </div>
              </div>
            </div>

            <a
              href={getAttachmentUrl(mom.attachment_url)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Download size={14} /> Download File
            </a>
          </div>
        )}

        {/* Actions Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button variant="danger" icon={Trash2} onClick={() => onDelete?.(mom)}>
            Delete MoM
          </Button>

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" icon={Edit2} onClick={() => onEdit?.(mom)}>
              Edit MoM
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
