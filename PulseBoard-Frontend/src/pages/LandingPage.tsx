import { Link } from 'react-router-dom';
import { PublicNav } from '../components/PublicNav';
import { sessionTemplates } from '../data/sessionTemplates';
import { useAuthStore } from '../store/authStore';

export function LandingPage() {
  const authenticated = useAuthStore((s) => s.isAuthenticated);
  return (
    <div className="min-h-screen">
      <PublicNav />
      <main className="max-w-6xl mx-auto px-5 sm:px-8">
        <section className="grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center pt-14 pb-16 sm:pt-24 sm:pb-24">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-signal-mint rounded-full" />
              LIVE LEARNING. CLEAR NEXT STEPS.
            </p>
            <h1 className="font-display text-[2.7rem] sm:text-6xl font-semibold leading-[1.07] tracking-[-0.045em] mt-6">
              Don’t just teach.
              <br />
              <span className="gradient-text">
                Know what
                <br className="hidden sm:block" /> clicks.
              </span>
            </h1>
            <p className="text-muted text-base sm:text-lg leading-relaxed mt-6 max-w-lg">
              Turn workshops, onboarding, and team check-ins into conversations
              everyone can take part in. Ask, listen, and find what needs
              another look.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to={authenticated ? '/dashboard' : '/register'}
                className="primary-link"
              >
                {authenticated
                  ? 'Open your workspace'
                  : 'Create your first session'}{' '}
                <span aria-hidden="true">→</span>
              </Link>
              <Link to="/demo" className="secondary-link">
                Try the interactive demo
              </Link>
            </div>
            <p className="text-xs text-muted mt-5">
              Participants join with a code. No participant account required.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-pulse-violet/5 rounded-full blur-3xl pointer-events-none" />
            <div className="glass-card rounded-3xl relative overflow-hidden shadow-2xl shadow-black/20">
              <div className="px-6 py-4 flex justify-between items-center gap-3 border-b border-border-soft bg-surface-raised/40">
                <span className="text-xs text-muted font-mono">
                  WORKSHOP / 01
                </span>
                <span className="text-[10px] uppercase tracking-wider text-pulse-violet border border-pulse-violet/30 rounded-full px-3 py-1">
                  Sample data
                </span>
              </div>
              <div className="p-6 sm:p-8">
                <p className="text-sm text-muted">.NET onboarding check-in</p>
                <h2 className="text-xl sm:text-2xl font-semibold mt-2 mb-7">
                  Is async making sense?
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-7">
                  <div>
                    <p className="text-4xl font-display">
                      12
                      <span className="text-signal-mint text-lg ml-1">↗</span>
                    </p>
                    <p className="text-xs text-muted mt-1">
                      responding browsers
                    </p>
                  </div>
                  <div className="border-l border-border-soft pl-5">
                    <p className="text-4xl font-display">
                      42<span className="text-xl text-muted">%</span>
                    </p>
                    <p className="text-xs text-muted mt-1">correct on async</p>
                  </div>
                </div>
                <div className="space-y-5">
                  {[
                    ['Blocks the thread', 50, false],
                    ['Suspends the method', 42, true],
                    ['Creates a new thread', 8, false],
                  ].map(([label, percent, correct]) => (
                    <div key={String(label)}>
                      <div className="text-xs flex justify-between gap-3 mb-2">
                        <span
                          className={
                            correct ? 'text-signal-mint' : 'text-muted'
                          }
                        >
                          {label}
                          {correct ? ' ✓' : ''}
                        </span>
                        <span>{percent}%</span>
                      </div>
                      <div className="h-2 bg-surface-raised rounded-full">
                        <div
                          className={`h-2 rounded-full ${correct ? 'bg-signal-mint' : 'bg-pulse-violet/60'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-7 rounded-xl border border-signal-mint/20 bg-signal-mint/5 p-4">
                  <p className="text-signal-mint text-xs font-semibold">
                    YOUR NEXT TEACHING MOMENT
                  </p>
                  <p className="text-sm leading-relaxed mt-2 text-paper/90">
                    Revisit blocking vs. awaiting with a worked example before
                    moving on.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted text-center">
              A useful signal, while you still have the room.
            </p>
          </div>
        </section>
        <section
          className="border-y border-border-soft py-6 flex flex-wrap justify-between gap-5 text-xs sm:text-sm text-muted"
          aria-label="Capabilities"
        >
          <span>01 / Ready-to-use starters</span>
          <span>02 / Live responses</span>
          <span>03 / Follow-up insights</span>
          <span>04 / Exportable results</span>
        </section>
        <section className="py-16 sm:py-24">
          <div className="max-w-xl">
            <p className="eyebrow">BUILT AROUND THE CONVERSATION</p>
            <h2 className="text-3xl sm:text-4xl tracking-tight font-semibold mt-4">
              One small check-in.
              <br />A more useful next step.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-7 mt-10">
            {[
              [
                '01',
                'Prepare with purpose',
                'Pick a workshop starter or draft your own questions with AI. Review the answer choices before your session.',
              ],
              [
                '02',
                'Hear from everyone',
                'Share a link or QR code. Open one question at a time and see responses arrive as your audience votes.',
              ],
              [
                '03',
                'Close the learning loop',
                'Review commonly missed questions, export the results, and reuse the session with your next group.',
              ],
            ].map(([n, title, description]) => (
              <article key={n} className="border-t border-border-soft pt-5">
                <span className="text-pulse-violet text-sm font-mono">{n}</span>
                <h3 className="text-lg font-semibold mt-4">{title}</h3>
                <p className="text-muted text-sm leading-relaxed mt-3">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="pb-16 sm:pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
            <div>
              <p className="eyebrow">MADE FOR REAL ROOMS</p>
              <h2 className="text-3xl font-semibold mt-3">
                Start where your team is.
              </h2>
            </div>
            <Link
              className="focus-ring text-pulse-violet py-3 text-sm"
              to="/demo"
            >
              See it in action ↗
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {sessionTemplates.map((t) => (
              <article key={t.id} className="glass-card rounded-2xl p-6">
                <p className="text-[10px] tracking-widest text-signal-mint font-semibold">
                  {t.label}
                </p>
                <h3 className="text-xl font-semibold mt-5 mb-3">{t.title}</h3>
                <p className="text-muted text-sm leading-relaxed">
                  {t.description}
                </p>
                <p className="text-xs text-pulse-violet mt-6">
                  {t.questions.length} starter questions · {t.duration}
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-pulse-violet/30 bg-pulse-violet/5 p-7 sm:p-12 mb-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-7">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">
              Make the next session a conversation.
            </h2>
            <p className="text-muted text-sm mt-3">
              Start with a few questions and one thing you want to learn.
            </p>
          </div>
          <Link
            className="primary-link shrink-0"
            to={authenticated ? '/dashboard' : '/register'}
          >
            Get started →
          </Link>
        </section>
      </main>
      <footer className="border-t border-border-soft max-w-6xl mx-auto px-5 sm:px-8 py-7 text-xs text-muted flex flex-wrap justify-between gap-4">
        <span>PulseBoard · A clearer picture of the room.</span>
        <Link to="/join" className="focus-ring">
          Have a code? Join a session →
        </Link>
      </footer>
    </div>
  );
}
