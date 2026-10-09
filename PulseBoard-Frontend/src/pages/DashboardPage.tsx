import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionApi } from '../api/sessionApi';
import { getApiErrorMessage } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';
import { sessionTemplates, type SessionTemplate } from '../data/sessionTemplates';
import type { SessionStatus } from '../types';

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sessions, isLoading, isError, refetch } = useQuery({ queryKey: ['sessions'], queryFn: sessionApi.getMySessions });
  const [isCreating, setIsCreating] = useState(false);
  const [template, setTemplate] = useState<SessionTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SessionStatus | 'All'>('All');
  const formRef = useRef<HTMLFormElement>(null);
  const createMutation = useMutation({
    mutationFn: sessionApi.create,
    onSuccess: (session) => { queryClient.invalidateQueries({ queryKey: ['sessions'] }); navigate(`/sessions/${session.id}`); },
    onError: (err) => setError(getApiErrorMessage(err)),
  });
  function begin(starter: SessionTemplate | null) {
    setTemplate(starter); setTitle(starter?.title ?? ''); setTopic(starter?.topic ?? ''); setError(null); setIsCreating(true);
    requestAnimationFrame(() => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); formRef.current?.querySelector('input')?.focus({ preventScroll: true }); });
  }
  function handleCreate(e: FormEvent) {
    e.preventDefault(); setError(null);
    createMutation.mutate({ title: title.trim(), topic: topic.trim(), questions: template?.questions });
  }
  const visible = sessions?.filter(s => (filter === 'All' || s.status === filter) && `${s.title} ${s.topic} ${s.joinCode}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-9">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div><p className="eyebrow">YOUR FACILITATION WORKSPACE</p><h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mt-2">Make every session count.</h1><p className="text-muted mt-3 max-w-xl text-sm leading-relaxed">Prepare a few good questions. Hear from the whole room. Leave knowing what to revisit.</p></div>
        <Button onClick={() => begin(null)} disabled={createMutation.isPending}>+ New session</Button>
      </header>
      <div className="grid grid-cols-3 gap-3" aria-label="Session overview">
        {(['Draft', 'Live', 'Ended'] as const).map(status => <div key={status} className="glass-card rounded-2xl p-4 sm:p-5"><p className="text-2xl sm:text-3xl font-display font-semibold">{sessions ? sessions.filter(s => s.status === status).length : '—'}</p><p className="text-xs sm:text-sm text-muted mt-1">{status === 'Draft' ? 'In preparation' : status === 'Live' ? 'Live now' : 'Completed'}</p></div>)}
      </div>
      <section aria-labelledby="starters-title">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4"><div><h2 id="starters-title" className="text-lg font-semibold">Start with a purpose</h2><p className="text-sm text-muted mt-1">Ready-made questions for real conversations. Preview before creating.</p></div><Link to="/demo" className="text-sm text-pulse-violet focus-ring py-2">Explore the demo ↗</Link></div>
        <div className="grid gap-3 md:grid-cols-3">{sessionTemplates.map((starter, index) => <button key={starter.id} onClick={() => begin(starter)} disabled={createMutation.isPending} className="focus-ring glass-card rounded-2xl p-5 text-left hover:border-pulse-violet transition-colors group disabled:opacity-50">
          <div className="flex justify-between items-center mb-5"><span className="text-pulse-violet font-mono text-lg">0{index + 1}</span><span className="text-xs text-muted">{starter.duration}</span></div>
          <p className="text-[10px] font-semibold tracking-widest text-signal-mint">{starter.label}</p><h3 className="font-semibold mt-2 mb-2">{starter.title}</h3><p className="text-sm text-muted leading-relaxed">{starter.description}</p><p className="text-sm text-pulse-violet mt-5">{starter.questions.length} questions · Preview starter →</p>
        </button>)}</div>
      </section>
      {isCreating && <form ref={formRef} onSubmit={handleCreate} className="glass-card rounded-2xl p-5 sm:p-7 space-y-5 border-pulse-violet/50">
        <div className="flex items-start justify-between gap-3"><div><p className="eyebrow">PREPARE</p><h2 className="text-xl font-semibold mt-1">{template ? 'Make this starter yours' : 'Create your session'}</h2></div><Button type="button" variant="ghost" disabled={createMutation.isPending} onClick={() => setIsCreating(false)}>Cancel</Button></div>
        {error && <p role="alert" className="text-pulse-magenta text-sm">{error}</p>}
        <FormField label="Session title" required maxLength={150} value={title} disabled={createMutation.isPending} onChange={e => setTitle(e.target.value)} placeholder="e.g. New developer onboarding" />
        <FormField label="Purpose / learning objective" required maxLength={500} value={topic} disabled={createMutation.isPending} onChange={e => setTopic(e.target.value)} placeholder="What should people understand or decide by the end?" />
        {template && <details className="rounded-xl bg-ink/50 p-4"><summary className="focus-ring cursor-pointer text-sm font-medium">Preview {template.questions.length} included questions</summary><ol className="mt-4 space-y-5">{template.questions.map((q, i) => <li key={q.question} className="text-sm"><p className="font-medium">{i + 1}. {q.question}</p><ul className="mt-2 space-y-1 text-muted">{q.options.map((o, n) => <li key={o} className={q.correctOptionIndex === n ? 'text-signal-mint' : ''}>{String.fromCharCode(65 + n)}. {o}{q.correctOptionIndex === n ? ' ✓ Correct' : ''}</li>)}</ul></li>)}</ol></details>}
        <p className="text-xs text-muted">Starts as a draft. Review the questions before going live. No AI key is needed for these starters.</p>
        <Button type="submit" disabled={createMutation.isPending || !title.trim() || !topic.trim()}>{createMutation.isPending ? 'Creating…' : template ? 'Create with these questions →' : 'Create session →'}</Button>
      </form>}
      <section aria-labelledby="sessions-title">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4"><h2 id="sessions-title" className="text-lg font-semibold">Your sessions</h2><label className="text-xs text-muted">Search sessions<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Title, purpose, or code" className="focus-ring block mt-1 rounded-xl bg-surface border border-border-soft px-3 py-2.5 text-paper w-full sm:w-64" /></label></div>
        <div className="flex flex-wrap gap-2 mb-4" aria-label="Filter sessions">{(['All', 'Draft', 'Live', 'Ended'] as const).map(status => <button key={status} onClick={() => setFilter(status)} aria-pressed={filter === status} className={`focus-ring px-4 min-h-11 rounded-xl text-sm border ${filter === status ? 'bg-pulse-violet/15 text-pulse-violet border-pulse-violet/40' : 'border-border-soft text-muted'}`}>{status === 'Ended' ? 'Completed' : status}</button>)}</div>
        {isLoading && <p role="status" className="text-muted py-8">Loading your workspace…</p>}
        {isError && <div role="alert" className="glass-card rounded-2xl p-5"><p className="text-pulse-magenta mb-3">We couldn’t load your sessions.</p><Button variant="secondary" onClick={() => refetch()}>Try again</Button></div>}
        {visible?.length === 0 && <div className="glass-card rounded-2xl text-center py-12 px-5"><h3 className="text-lg font-semibold">{sessions?.length ? 'No matching sessions' : 'Your first useful conversation starts here'}</h3><p className="text-muted text-sm mt-2">{sessions?.length ? 'Try another search or status.' : 'Pick a starter above, or create a session around your own question.'}</p></div>}
        <div className="grid gap-3">{visible?.map(s => <Link key={s.id} to={`/sessions/${s.id}`} className="focus-ring glass-card rounded-2xl px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-pulse-violet/60 transition-colors"><div className="min-w-0"><h3 className="font-medium break-words">{s.title}</h3><p className="text-sm text-muted mt-1 break-words">{s.topic}</p><p className="text-xs text-muted mt-3">Created {new Date(s.createdAt).toLocaleDateString()}</p></div><div className="flex shrink-0 items-center gap-4"><span className="font-mono text-xs text-muted">{s.joinCode}</span><StatusBadge status={s.status} /><span aria-hidden="true" className="text-muted">→</span></div></Link>)}</div>
      </section>
    </div>
  );
}
