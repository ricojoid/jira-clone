import { useState, useEffect, useRef } from 'react';
import { Send, AtSign } from 'lucide-react';
import { userApi } from '../../api';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

export default function CommentInputWithMention({
  onSubmit,
  submitting = false,
  placeholder = 'Add a comment... (Type @ to mention team members)',
}) {
  const [content, setContent] = useState('');
  const [users, setUsers] = useState([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const textareaRef = useRef(null);
  const popoverRef = useRef(null);

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

    // Check if cursor is right after an '@' or typing a mention
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const queryText = textBeforeCursor.slice(lastAtIndex + 1);
      // Ensure no spaces before cursor in the query
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
    if (!content.trim() || submitting) return;
    onSubmit(content.trim());
    setContent('');
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

      {/* Submit Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          Tip: Type <strong style={{ color: 'var(--primary)' }}>@username</strong> to tag members (Ctrl+Enter to post)
        </span>
        <Button
          variant="primary"
          size="sm"
          icon={Send}
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? 'Posting...' : 'Comment'}
        </Button>
      </div>
    </div>
  );
}
