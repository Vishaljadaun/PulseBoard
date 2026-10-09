import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '../api/sessionApi';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { downloadReport, followUpQuestions } from '../utils/report';
import type { SessionReport } from '../types';

export function ReportView({ report, demo = false }: { report: SessionReport; demo?: boolean }) {
  const [threshold, setThreshold] = useState(70);
  const followUps = followUpQuestions(report.questions, threshold);
  const closedQuizzes = report.questions.filter(q => q.status === 'Closed' && q.accuracy !== null);
  return <div className="report-page space-y-7">
    <header>
      <div className="flex flex-wrap items-center gap-3"><span className="eyebrow">{demo ? 'SAMPLE REPORT · DEMONSTRATION DATA' : 'SESSION REPORT'}</span><StatusBadge status={report.session.status} /></div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-4 break-words">{report.session.title}</h1>
      <p className="text-muted mt-2 break-words">{report.session.topic}</p>
      <div className="flex flex-wrap items-center gap-3 mt-5 print:hidden"><Button variant="secondary" onClick={() => downloadReport(report)}>↓ Export CSV</Button><Button variant="ghost" onClick={() => window.print()}>Print / save PDF</Button></div>
      <p className="text-xs text-muted mt-3">Snapshot: {new Date(report.generatedAt).toLocaleString()}{report.session.status === 'Live' ? ' · Session still live; results can change.' : ''}</p>
    </header>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[[report.respondents, 'Responding browsers'], [report.totalResponses, 'Total answers'], [report.questions.filter(q => q.status === 'Closed').length, 'Questions closed'], [report.accuracy === null ? '—' : `${report.accuracy}%`, 'Correct quiz answers']].map(([value, label]) => <div key={label} className="glass-card rounded-2xl p-5"><p className="text-3xl font-display font-semibold">{value}</p><p className="text-xs text-muted mt-2">{label}</p></div>)}
    </div>
    <p className="text-xs text-muted leading-relaxed">Respondents are anonymous browser identities that submitted an answer, not verified people or attendance. Quiz accuracy is weighted by answers and excludes opinion questions. Unanswered questions are not scored.</p>
    <section className="rounded-2xl border border-pulse-violet/30 bg-pulse-violet/5 p-5 sm:p-7" aria-labelledby="follow-up-title">
      <div className="flex flex-col sm:flex-row justify-between gap-4"><div><p className="eyebrow">FROM RESPONSES TO ACTION</p><h2 id="follow-up-title" className="text-xl font-semibold mt-2">What should you revisit?</h2></div><label className="text-xs text-muted shrink-0">Flag closed questions below<select value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="focus-ring block w-full bg-surface border border-border-soft rounded-xl p-2.5 mt-1 text-paper"><option value={50}>50% correct</option><option value={70}>70% correct</option><option value={80}>80% correct</option></select></label></div>
      {followUps.length > 0 ? <ol className="mt-5 space-y-4">{followUps.map(q => <li key={q.id} className="bg-ink/40 rounded-xl p-4"><div className="flex flex-col sm:flex-row justify-between gap-2"><p className="font-medium text-sm break-words">{q.question}</p><span className="text-pulse-magenta text-sm shrink-0">{q.accuracy}% correct · {q.responses} answers</span></div><p className="text-sm text-muted mt-2">Explain the correct answer, work through an example, then use a fresh question to check understanding.</p></li>)}</ol> : <p className="text-sm text-muted mt-4">{closedQuizzes.length ? 'No answered, closed quiz questions fall below this threshold. Review response counts and ask where people still need support.' : 'Close a knowledge-check question with responses to see follow-up suggestions. For opinion polls, use the response breakdown to guide your discussion.'}</p>}
      <p className="text-xs text-muted mt-4">This threshold is a discussion aid, not a pass/fail decision. Small samples and question quality affect interpretation.</p>
    </section>
    <section aria-labelledby="breakdown-title"><h2 id="breakdown-title" className="text-xl font-semibold mb-4">Question breakdown</h2>
      {report.questions.length === 0 && <p className="glass-card p-6 rounded-2xl text-muted">No questions yet. Add questions in the session workspace to get started.</p>}
      <div className="space-y-4">{report.questions.map((q, index) => <article key={q.id} className="glass-card rounded-2xl p-5 sm:p-6 break-inside-avoid"><div className="flex flex-wrap items-center gap-3 text-xs mb-3"><span className="font-mono text-pulse-violet">QUESTION {String(index + 1).padStart(2, '0')}</span><StatusBadge status={q.status} /><span className="text-muted">{q.correctResponses === null ? 'Opinion poll' : 'Knowledge check'}</span></div><h3 className="font-semibold break-words">{q.question}</h3><p className="text-xs text-muted mt-2 mb-5">{q.responses} answers{q.accuracy !== null ? ` · ${q.accuracy}% correct` : q.responses === 0 ? ' · No responses yet' : ' · No correct answer assigned'}</p><div className="space-y-4">{q.options.map(o => <div key={o.id}><div className="flex justify-between items-start gap-3 text-sm mb-2"><span className="break-words min-w-0">{o.text}{o.isCorrect && <span className="text-signal-mint"> · Correct answer</span>}</span><span className="text-muted shrink-0">{o.responses} · {q.responses ? Math.round(100 * o.responses / q.responses) : 0}%</span></div><div className="h-2 rounded-full bg-surface-raised overflow-hidden"><div className={`h-full rounded-full ${o.isCorrect ? 'bg-signal-mint' : 'bg-pulse-violet'}`} style={{ width: `${q.responses ? 100 * o.responses / q.responses : 0}%` }} /></div></div>)}</div></article>)}</div>
    </section>
  </div>;
}

export function SessionReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ['report', id], queryFn: () => sessionApi.getReport(id!), enabled: !!id });
  return <div><div className="flex items-center justify-between gap-4 mb-6 print:hidden"><Link to={`/sessions/${id}`} className="focus-ring text-sm text-muted py-2">← Session workspace</Link><Button variant="ghost" disabled={isFetching} onClick={() => refetch()}>{isFetching ? 'Refreshing…' : 'Refresh results'}</Button></div>{isLoading && <p role="status" className="text-muted">Preparing your report…</p>}{isError && <p role="alert" className="text-pulse-magenta mb-4">We couldn’t load the report. Try refreshing the results.</p>}{data && <ReportView report={data} />}</div>;
}
