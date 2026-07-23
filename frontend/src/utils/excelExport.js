import * as XLSX from 'xlsx';

/**
 * Exports tasks/issues to an Excel (.xlsx) file with styled column widths.
 * 
 * @param {Array} issues - Array of issue objects
 * @param {string} projectName - Name of the current project
 */
export function exportBoardToExcel(issues = [], projectName = 'Project') {
  if (!issues || issues.length === 0) {
    alert('No tasks available to export.');
    return;
  }

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
  };

  const priorityLabels = {
    highest: 'Highest',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    lowest: 'Lowest',
  };

  const data = issues.map((issue, index) => {
    const dueDateStr = issue.due_date || issue.dueDate;
    let formattedDueDate = '-';

    if (dueDateStr) {
      const d = new Date(dueDateStr);
      if (!isNaN(d.getTime())) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        formattedDueDate = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      }
    }

    const statusStr = statusLabels[(issue.status || '').toLowerCase()] || issue.status || 'To Do';
    const priorityStr = priorityLabels[(issue.priority || '').toLowerCase()] || issue.priority || 'Medium';

    const assigneeObj = issue.assignee;
    const picName = assigneeObj
      ? (assigneeObj.full_name || assigneeObj.username || assigneeObj.name || assigneeObj.email)
      : 'Unassigned';

    return {
      'No': index + 1,
      'Key': issue.issue_key || issue.key || `TASK-${issue.id || index + 1}`,
      'Task Name': issue.title || issue.summary || 'Untitled Task',
      'Status': statusStr,
      'Priority': priorityStr,
      'Due Date': formattedDueDate,
      'PIC': picName,
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Custom column widths so text is spacious and readable
  worksheet['!cols'] = [
    { wch: 6 },   // No
    { wch: 14 },  // Key
    { wch: 45 },  // Task Name
    { wch: 18 },  // Status
    { wch: 15 },  // Priority
    { wch: 18 },  // Due Date
    { wch: 25 },  // PIC
  ];

  // Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Task Board');

  // Format filename safely
  const cleanName = (projectName || 'Project').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${cleanName}_Tasks_${dateStr}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
}
