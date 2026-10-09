import type { ReportQuestion, SessionReport } from '../types';

export function followUpQuestions(
  questions: ReportQuestion[],
  threshold: number
) {
  return questions
    .filter(
      (q) =>
        q.status === 'Closed' && q.accuracy !== null && q.accuracy < threshold
    )
    .sort((a, b) => a.accuracy! - b.accuracy!);
}

// Quote every cell, escape quotes, and neutralize spreadsheet formula prefixes.
export function csvCell(value: string | number | null): string {
  let text = value === null ? '' : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function reportCsv(report: SessionReport): string {
  const rows: (string | number | null)[][] = [
    [
      'Session',
      'Topic',
      'Session status',
      'Snapshot UTC',
      'Responding browsers',
      'Question',
      'Question status',
      'Type',
      'Responses',
      'Correct responses',
      'Correct %',
      'Option',
      'Option responses',
      'Correct option',
    ],
  ];
  report.questions.forEach((q) =>
    q.options.forEach((o) =>
      rows.push([
        report.session.title,
        report.session.topic,
        report.session.status,
        report.generatedAt,
        report.respondents,
        q.question,
        q.status,
        q.correctResponses === null ? 'Opinion' : 'Knowledge check',
        q.responses,
        q.correctResponses,
        q.accuracy,
        o.text,
        o.responses,
        q.correctResponses === null ? '' : o.isCorrect ? 'Yes' : 'No',
      ])
    )
  );
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadReport(report: SessionReport) {
  const url = URL.createObjectURL(
    new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8;' })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `pulseboard-report-${report.session.id}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
