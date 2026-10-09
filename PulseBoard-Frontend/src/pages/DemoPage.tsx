import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicNav } from '../components/PublicNav';
import { Button } from '../components/Button';
import { ReportView } from './SessionReportPage';
import { demoReport } from '../data/demoReport';
import { sessionTemplates } from '../data/sessionTemplates';

export function DemoPage() {
  const [view, setView] = useState<'participant' | 'report'>('participant');
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const question = sessionTemplates[0].questions[0];
  return <div className="min-h-screen"><PublicNav /><main className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
    <div className="print:hidden mb-8"><Link to="/" className="focus-ring text-sm text-muted">← Back to PulseBoard</Link><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6"><div><p className="eyebrow">INTERACTIVE PRODUCT TOUR</p><h1 className="text-2xl sm:text-3xl font-semibold mt-2">Try a teaching moment.</h1><p className="text-sm text-muted mt-2">Sample data only. Nothing is sent or saved.</p></div><Link to="/register" className="primary-link">Create a real session →</Link></div><div className="flex gap-2 mt-6" aria-label="Demo views">{(['participant', 'report'] as const).map(tab => <Button key={tab} variant={view === tab ? 'primary' : 'secondary'} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab === 'participant' ? '1. Answer a question' : '2. Explore host report'}</Button>)}</div></div>
    {view === 'report' ? <ReportView report={demoReport} demo /> : <section className="max-w-2xl mx-auto glass-card rounded-3xl p-6 sm:p-9"><p className="eyebrow">PARTICIPANT VIEW · SAMPLE QUESTION</p><h2 className="text-xl sm:text-2xl font-semibold mt-5 leading-snug">{question.question}</h2><fieldset disabled={submitted} className="mt-6 space-y-3"><legend className="text-sm text-muted mb-3">Choose one answer</legend>{question.options.map((option, index) => <label key={option} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer text-sm leading-relaxed ${selected === index ? 'border-pulse-violet bg-pulse-violet/10' : 'border-border-soft'}`}><input className="mt-1 accent-violet-400" type="radio" name="demo-answer" checked={selected === index} onChange={() => setSelected(index)} /><span>{option}</span></label>)}</fieldset>{!submitted ? <Button className="mt-6" fullWidth disabled={selected === null} onClick={() => setSubmitted(true)}>Submit sample answer</Button> : <div role="status" className="mt-6 rounded-xl bg-signal-mint/5 border border-signal-mint/30 p-5"><p className="font-semibold text-signal-mint">{selected === question.correctOptionIndex ? 'That’s right.' : 'A useful moment to learn.'}</p><p className="text-sm leading-relaxed text-muted mt-2">When the awaited I/O task is incomplete, await suspends the method and returns control to its caller. It does not block the thread or automatically create a new one.</p><div className="flex flex-wrap gap-3 mt-4"><Button onClick={() => setView('report')}>See the host’s next step →</Button><Button variant="ghost" onClick={() => { setSelected(null); setSubmitted(false); }}>Try again</Button></div></div>}</section>}
  </main></div>;
}
