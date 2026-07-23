import { useState, useEffect, useRef } from 'react';
import { Send, AtSign, Paperclip, X, Image as ImageIcon, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { userApi, uploadApi } from '../../api';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

export default function CommentInputWithMention({
  onSubmit,
  submitting = false,
  placeholder = 'Add a comment... (Type @ to mention, click 📎 to attach photo/file)',
}) {
  const [content, setContent] = useState('');
  const [users, setUsers] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Attachment state
  const [attachment, setAttachment] = useState(null); // { url, filename, isImage }
  const [uploadingFile, setUploadingFile] = useState(false);

  const textareaRef = useRef(null);
  const popoverRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userApi.list();
        setUsers(res.data || []);
      } catch (err) {
        console.error('Failed to load users for mentions:', err);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!mentionQuery) return true;
    const q = mentionQuery.toLowerCase();
    const uname = (u.username || '').toLowerCase();
    const fname = (u.full_name || u.name || '').toLowerCase();
    return uname.includes(q) || fname.includes(q);
  });

  const handleTextChange = (e) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const queryText = textBeforeCursor.slice(lastAtIndex + 1);
      if (!/\s/.test(queryText)) {
        setMentionOpen(true);
        setMentionQuery(queryText);
        setMentionIndex(lastAtIndex);
        setSelectedIndex(0);
        return;
      }
    }
    setMentionOpen(false);
  };

  const insertMention = (u) => {
    if (mentionIndex === -1) return;
    const handle = u.username ? `@${u.username}` : `@[${u.full_name || u.name}]`;
    const before = content.slice(0, mentionIndex);
    const cursorPos = textareaRef.current ? textareaRef.current.selectionStart : content.length;
    const after = content.slice(cursorPos);

    const newContent = `${before}${handle} ${after}`;
    setContent(newContent);
    setMentionOpen(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = before.length + handle.length + 1;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 50);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size cannot exceed 15MB');
      return;
    }

    try {
      setUploadingFile(true);
      const res = await uploadApi.uploadFile(file);
      const url = res.data.url;
      const isImg = /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
      setAttachment({
        url,
        filename: file.filename || file.name,
        isImage: isImg,
      });
      toast.success('Attachment uploaded!');
    } catch (err) {
      console.error('Failed to upload file:', err);
      toast.error(err.response?.data?.detail || 'Failed to upload attachment');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!content.trim() && !attachment) || submitting || uploadingFile) return;
    onSubmit({
      content: content.trim(),
      attachment_url: attachment?.url || null,
    });
    setContent('');
    setAttachment(null);
    setMentionOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <textarea
        ref={textareaRef}
        className="form-textarea"
        rows={3}
        placeholder={placeholder}
        value={content}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        style={{ width: '100%', fontSize: '0.875rem' }}
      />

      {/* Attachment Preview Box */}
      {attachment && (
        <div
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 12px',
            backgroundColor: 'var(--bg-hover)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            maxWidth: '100%',
          }}
        >
          {attachment.isImage ? (
            <img
              src={getAttachmentUrl(attachment.url)}
              alt="Attachment Preview"
              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
            />
          ) : (
            <FileText size={20} color="var(--primary)" />
          )}
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
            {attachment.filename}
          </span>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2, display: 'flex', alignItems: 'center' }}
            title="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mention Suggestion Popover */}
      {mentionOpen && filteredUsers.length > 0 && (
        <div
          ref={popoverRef}
          className="card"
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            width: 280,
            maxHeight: 220,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: 'var(--shadow-xl)',
            padding: 4,
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--text-muted)',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <AtSign size={12} color="var(--primary)" /> Tag Team Member
          </div>
          {filteredUsers.map((u, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={u.id || u._id}
                onClick={() => insertMention(u)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.825rem',
                }}
              >
                <Avatar name={u.full_name || u.username || u.name} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.full_name || u.name || u.username}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
      />

      {/* Submit & Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 6,
              transition: 'background-color 0.15s, color 0.15s',
            }}
            className="card-hover"
            title="Attach photo or file"
          >
            <Paperclip size={16} color="var(--primary)" />
            <span>{uploadingFile ? 'Uploading...' : 'Attach File'}</span>
          </button>

          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Type <strong style={{ color: 'var(--primary)' }}>@username</strong> to tag
          </span>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Send}
          onClick={handleSubmit}
          disabled={(!content.trim() && !attachment) || submitting || uploadingFile}
        >
          {submitting ? 'Posting...' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
