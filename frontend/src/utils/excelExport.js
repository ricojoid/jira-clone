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
    ready_to_review_fid: 'Ready to Review FID',
    fid_review: 'FID Review',
    ready_to_is_review: 'Ready to IS Review',
    is_review: 'IS Review',
    done: 'Done',
    in_review: 'In Review',
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

/**
 * Exports a single Minutes of Meeting (MoM) record to an Excel (.xls / .xlsx) file
 * with proper cell borders, bold headers, and styled column layout.
 * 
 * @param {Object} mom - MoM object data
 */
export function exportMomToExcel(mom) {
  if (!mom) {
    alert('No MoM data available to export.');
    return;
  }

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

  const escapeHtml = (str) => {
    if (!str) return '-';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br/>');
  };

  const meetingDateTimeStr = `${formatDate(mom.meeting_date)} From: ${mom.meeting_time_from || '--:--'} To: ${mom.meeting_time_to || '--:--'}`;
  const projectName = mom.project_name || mom.project_id || '-';
  const reportDateStr = formatDate(mom.report_date);
  const reportByStr = mom.report_by || '-';
  const attendanceStr = mom.attendance || '-';
  const agendaStr = mom.agenda || '-';
  const resultStr = mom.meeting_result || '-';
  const nextActionStr = mom.next_action || '-';

  const htmlTable = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Minutes of Meeting</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #475569; padding: 10px 14px; vertical-align: top; font-size: 10.5pt; }
    .title-cell { font-size: 16pt; font-weight: bold; text-align: center; background-color: #1e293b; color: #ffffff; padding: 14px; border: 1px solid #1e293b; }
    .label-cell { font-weight: bold; background-color: #f1f5f9; color: #0f172a; width: 150px; }
    .value-cell { color: #1e293b; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td colspan="4" class="title-cell">Minutes of Meeting</td>
    </tr>
    <tr>
      <td class="label-cell">Project</td>
      <td colspan="3" class="value-cell">${escapeHtml(projectName)}</td>
    </tr>
    <tr>
      <td class="label-cell">Meeting Date</td>
      <td class="value-cell">${escapeHtml(meetingDateTimeStr)}</td>
      <td class="label-cell">Report Date</td>
      <td class="value-cell">${escapeHtml(reportDateStr)}</td>
    </tr>
    <tr>
      <td class="label-cell">Attendance</td>
      <td class="value-cell">${escapeHtml(attendanceStr)}</td>
      <td class="label-cell">Report By</td>
      <td class="value-cell">${escapeHtml(reportByStr)}</td>
    </tr>
    <tr>
      <td class="label-cell">Agenda</td>
      <td colspan="3" class="value-cell">${escapeHtml(agendaStr)}</td>
    </tr>
    <tr>
      <td class="label-cell">Meeting Result</td>
      <td colspan="3" class="value-cell">${escapeHtml(resultStr)}</td>
    </tr>
    <tr>
      <td class="label-cell">Next Action</td>
      <td colspan="3" class="value-cell">${escapeHtml(nextActionStr)}</td>
    </tr>
  </table>
</body>
</html>
  `;

  const cleanTitle = (mom.title || 'MoM').replace(/[^a-zA-Z0-9_\-]/g, '_');
  const dateTag = mom.meeting_date || 'date';
  const filename = `MoM_${cleanTitle}_${dateTag}.xls`;

  const blob = new Blob(['\ufeff' + htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

