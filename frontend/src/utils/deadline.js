/**
 * Deadline Helper Utility
 * Calculates status (overdue, due today, due soon, upcoming, done) and formats dates.
 */

export function getDeadlineStatus(dueDateStr, issueStatus) {
  if (!dueDateStr) return null;

  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return null;

  const now = new Date();
  
  // Normalize dates to start of day for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  
  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  const isDone = (issueStatus || '').toLowerCase() === 'done';

  // Formatting date string (e.g., "25 Jul" or "25 Jul 2026")
  const day = due.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[due.getMonth()];
  const formattedDate = `${day} ${month}`;

  if (isDone) {
    return {
      state: 'done',
      text: formattedDate,
      diffDays,
      formattedDate,
      label: formattedDate,
    };
  }

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    const dayLabel = overdueDays === 1 ? 'day' : 'days';
    return {
      state: 'overdue',
      text: `Delayed ${overdueDays} ${dayLabel}`,
      diffDays,
      formattedDate,
      label: `Delayed ${overdueDays} ${dayLabel} (${formattedDate})`,
    };
  }

  if (diffDays === 0) {
    return {
      state: 'today',
      text: 'Today',
      diffDays,
      formattedDate,
      label: 'Today',
    };
  }

  if (diffDays === 1) {
    return {
      state: 'soon',
      text: 'Tomorrow',
      diffDays,
      formattedDate,
      label: 'Tomorrow',
    };
  }

  if (diffDays <= 3) {
    return {
      state: 'soon',
      text: `In ${diffDays} days`,
      diffDays,
      formattedDate,
      label: `In ${diffDays} days (${formattedDate})`,
    };
  }

  return {
    state: 'upcoming',
    text: formattedDate,
    diffDays,
    formattedDate,
    label: formattedDate,
  };
}

export function formatDateForInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateForDateInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
