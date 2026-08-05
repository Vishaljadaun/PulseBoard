import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/authApi';
import { getApiErrorMessage } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { AuthShell } from '../components/AuthShell';
import { FormField } from '../components/FormField';
import { Button } from '../components/Button';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authApi.register({ name, email, password });
      setAuth(result);
      navigate('/dashboard');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start running live sessions in minutes"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-pulse-violet font-medium hover:text-pulse-magenta transition-colors">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <FormField label="Name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Vishal Sharma" />
        <FormField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <FormField
          label="Password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />

        <Button type="submit" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}
