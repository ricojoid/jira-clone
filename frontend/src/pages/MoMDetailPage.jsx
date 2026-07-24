import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { momApi, getAttachmentUrl } from '../api';
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
  Download,
  Edit2,
  Trash2,
  Building,
} from 'lucide-react';

export default function MoMDetailPage() {
  const navigate = useNavigate();
  const { momId } = useParams();

  const [mom, setMom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMom = async () => {
      try {
        setLoading(true);
        const res = await momApi.get(momId);
        setMom(res.data);
      } catch (err) {
        console.error('Failed to fetch MoM details:', err);
        toast.error('Failed to load MoM details');
      } finally {
        setLoading(false);
      }
    };

    if (momId) {
      fetchMom();
    }
  }, [momId]);

  const handleBack = () => {
    if (mom?.project_id) {
      navigate(`/mom/project/${mom.project_id}`);
    } else {
      navigate('/mom');
    }
  };

  const handleEdit = () => {
    navigate(`/mom/edit/${momId}`);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete MoM: "${mom?.title || 'Minutes of Meeting'}"?`)) {
      return;
    }

    try {
      await momApi.delete(momId);
      toast.success('MoM deleted successfully');
      handleBack();
    } catch (err) {
      console.error('Failed to delete MoM:', err);
      toast.error('Failed to delete MoM');
    }
  };

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

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading MoM details...</div>;
  }

  if (!mom) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>MoM Not Found</h3>
        <Button variant="secondary" onClick={() => navigate('/mom')} style={{ marginTop: 16 }}>
          Back to MoM List
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                className="badge"
                style={{
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                }}
              >
                {mom.project_name || 'Project'}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {formatDate(mom.meeting_date)}
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em', marginTop: 4 }}>
              {mom.title || 'Minutes of Meeting'}
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {mom.can_delete !== false && (
            <Button variant="danger" icon={Trash2} onClick={handleDelete}>
              Delete MoM
            </Button>
          )}
          {mom.can_edit !== false && (
            <Button variant="primary" icon={Edit2} onClick={handleEdit}>
              Edit MoM
            </Button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section 1: General & Meeting Metadata */}
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
            General & Meeting Information
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 18,
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Project</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: 2 }}>
                {mom.project_name || mom.project_id}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Meeting Date</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: 2 }}>
                {formatDate(mom.meeting_date)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Time</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: 2 }}>
                {mom.meeting_time_from || '--:--'} - {mom.meeting_time_to || '--:--'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Meeting Place</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: 2 }}>
                {mom.meeting_place || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Report Date</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: 2 }}>
                {formatDate(mom.report_date)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Created By</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginTop: 2 }}>
                {mom.creator_name || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Reporter & Attendance */}
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
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                Report By
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  minHeight: 60,
                }}
              >
                {mom.report_by || '-'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                Attendance
              </div>
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-hover)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.9rem',
                  color: 'var(--text-main)',
                  minHeight: 60,
                }}
              >
                {mom.attendance || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Meeting Content & Outcomes */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
              Agenda
            </div>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-hover)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                lineHeight: 1.5,
              }}
            >
              {mom.agenda || '-'}
            </div>
          </div>

          {/* Meeting Result (Spacious View) */}
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a', marginBottom: 6 }}>
              Meeting Result
            </div>
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem',
                color: '#14532d',
                lineHeight: 1.6,
                minHeight: 160,
              }}
            >
              {mom.meeting_result || '-'}
            </div>
          </div>

          {/* Next Action */}
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#b45309', marginBottom: 6 }}>
              Next Action
            </div>
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                fontSize: '0.9rem',
                color: '#78350f',
                lineHeight: 1.5,
              }}
            >
              {mom.next_action || '-'}
            </div>
          </div>
        </div>

        {/* Section 4: Attachment */}
        {mom.attachment_url && (
          <div
            className="card"
            style={{
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Paperclip size={20} style={{ color: '#2563eb' }} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>Attached File</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e3a8a', marginTop: 2 }}>
                  {mom.attachment_name || 'Attached File'}
                </div>
              </div>
            </div>

            <a
              href={getAttachmentUrl(mom.attachment_url)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
            >
              <Download size={14} /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
