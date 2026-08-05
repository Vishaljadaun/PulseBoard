import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionApi } from '../api/sessionApi';
import { getApiErrorMessage } from '../api/client';
import { Button } from '../components/Button';

export function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCode = useCallback(
    async (joinCode: string) => {
      setError(null);
      setIsSubmitting(true);
      try {
        const result = await sessionApi.getByJoinCode(joinCode);
        navigate(`/participate/${result.sessionId}`, { state: { title: result.title } });
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [navigate]
  );

  // Scanning the host's QR code lands here as /join?code=123456 — prefill
  // and auto-submit so scanning is a single action, not scan-then-type.
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && /^\d{6}$/.test(codeFromUrl)) {
      setCode(codeFromUrl);
      submitCode(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitCode(code);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-pulse-violet/15 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm text-center relative"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="relative flex h-3 w-3">
            <span className="pulse-ring absolute inline-flex h-3 w-3 rounded-full" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-signal-mint" />
          </span>
          <span className="font-display font-semibold text-xl tracking-tight">
            Pulse<span className="gradient-text">Board</span>
          </span>
        </Link>

        <h1 className="font-display text-2xl font-semibold mb-1">Join a session</h1>
        <p className="text-muted mb-8 text-sm">Enter the 6-digit code from the host's screen</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="focus-ring w-full text-center text-4xl font-mono font-bold tracking-[0.4em] bg-surface/60 border border-border-soft rounded-2xl py-4 pl-4 text-paper placeholder:text-muted/30 focus:border-pulse-violet transition-colors"
          />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-pulse-magenta/10 text-pulse-magenta text-sm px-3 py-2 rounded-lg border border-pulse-magenta/20"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button type="submit" fullWidth disabled={isSubmitting || code.length !== 6}>
            {isSubmitting ? 'Checking...' : 'Join'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
