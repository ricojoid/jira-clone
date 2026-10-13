import { useState, useEffect } from 'react';
import { ListChecks, Plus, Trash2, Check, Pencil, Circle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { todoApi } from '../api';
import Button from '../components/ui/Button';

const EMPTY_FORM = { title: '', description: '' };

export default function TodoPage() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  useEffect(() => {
    todoApi
      .list()
      .then((res) => setTodos(res.data))
      .catch(() => toast.error('Failed to load to do list'))
      .finally(() => setLoading(false));
  }, []);

  const replaceTodo = (updated) => setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

  const handleAdd = async (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    setAdding(true);
    try {
      const res = await todoApi.create({ title, description: form.description });
      setTodos((prev) => [res.data, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (todo) => {
    // Optimistic update, rolled back on failure
    replaceTodo({ ...todo, is_done: !todo.is_done });
    try {
      const res = await todoApi.update(todo.id, { is_done: !todo.is_done });
      replaceTodo(res.data);
    } catch {
      replaceTodo(todo);
      toast.error('Failed to update task');
    }
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditForm({ title: todo.title, description: todo.description || '' });
  };

  const saveEdit = async (e, todo) => {
    e.preventDefault();
    const title = editForm.title.trim();
    if (!title) {
      toast.error('Title cannot be empty');
      return;
    }
    try {
      const res = await todoApi.update(todo.id, { title, description: editForm.description });
      replaceTodo(res.data);
      setEditingId(null);
    } catch {
      toast.error('Failed to save task');
    }
  };

  const handleDelete = async (todo) => {
    try {
      await todoApi.delete(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const pending = todos.filter((t) => !t.is_done);
  const done = todos.filter((t) => t.is_done);

  const renderItem = (todo) => (
    <li
      key={todo.id}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        backgroundColor: 'var(--bg-app)',
      }}
    >
      <button
        type="button"
        onClick={() => handleToggle(todo)}
        title={todo.is_done ? 'Mark as to do' : 'Mark as done'}
        style={{
          width: 22,
          height: 22,
          marginTop: 1,
          flexShrink: 0,
          borderRadius: 6,
          border: `2px solid ${todo.is_done ? '#22c55e' : 'var(--border-color)'}`,
          backgroundColor: todo.is_done ? '#22c55e' : 'transparent',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {todo.is_done && <Check size={14} strokeWidth={3} />}
      </button>

      {editingId === todo.id ? (
        <form onSubmit={(e) => saveEdit(e, todo)} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="form-input"
            autoFocus
            value={editForm.title}
            maxLength={255}
            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
          />
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Description (optional)"
            value={editForm.description}
            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
            onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: todo.is_done ? 'var(--text-muted)' : 'var(--text-main)',
              textDecoration: todo.is_done ? 'line-through' : 'none',
              wordBreak: 'break-word',
            }}
          >
            {todo.title}
          </div>
          {todo.description && (
            <div
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: 4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {todo.description}
            </div>
          )}
        </div>
      )}

      {editingId !== todo.id && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => startEdit(todo)}
            title="Edit"
            style={{ padding: 4, color: 'var(--text-muted)' }}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => handleDelete(todo)}
            title="Delete"
            style={{ padding: 4, color: 'var(--text-muted)' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </li>
  );

  const renderColumn = (title, Icon, color, items, emptyText) => (
    <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-main)' }}>
        <Icon size={18} color={color} />
        {title}
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>({items.length})</span>
      </h3>
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '24px 0' }}>{emptyText}</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(renderItem)}
        </ul>
      )}
    </div>
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ListChecks size={24} color="var(--primary)" />
          To Do List
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Your personal checklist. Only you can see these tasks.
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          className="form-input"
          placeholder="What do you need to do?"
          value={form.title}
          maxLength={255}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="form-textarea"
          rows={2}
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" icon={Plus} disabled={adding || !form.title.trim()}>
            Add Task
          </Button>
        </div>
      </form>

      {/* To Do and Done side by side; stacks on narrow screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
        {renderColumn('To Do', Circle, 'var(--primary)', pending, 'All clear! Nothing to do.')}
        {renderColumn('Done', CheckCircle2, '#22c55e', done, 'Nothing completed yet.')}
      </div>
    </div>
  );
}
