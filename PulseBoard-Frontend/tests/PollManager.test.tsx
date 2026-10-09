import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PollManager } from '../src/components/PollManager';

const api = vi.hoisted(() => ({ getSessionPolls: vi.fn(), generateSuggestion: vi.fn(), create: vi.fn() }));
vi.mock('../src/api/pollApi', () => ({ pollApi: api }));
vi.mock('../src/hooks/useSessionHub', () => ({ useSessionHub: () => ({ results: null }) }));

beforeEach(() => {
  vi.resetAllMocks();
  window.scrollTo = vi.fn();
  api.getSessionPolls.mockResolvedValue([]);
  api.create.mockResolvedValue({ id: 'created' });
});
afterEach(cleanup);

function openEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><PollManager sessionId="session-1" sessionStatus="Draft" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: '+ New question' }));
  fireEvent.change(screen.getByLabelText('What should the question cover?'), { target: { value: 'C# async' } });
}

describe('AI question editor', () => {
  it('keeps manual content and offers a focusable fallback on configuration failure', async () => {
    api.generateSuggestion.mockRejectedValue({ isAxiosError: true, response: { data: { error: 'AI needs configuration.', retryable: false } } });
    openEditor();
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'My existing question' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));
    await screen.findByText('AI needs configuration.');
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Write manually ↓' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Question'));
    expect((screen.getByLabelText('Question') as HTMLInputElement).value).toBe('My existing question');
  });

  it('can retry a temporary failure and saves the generated correct answer', async () => {
    api.generateSuggestion.mockRejectedValueOnce({ isAxiosError: true, response: { data: { error: 'Try shortly.', retryable: true } } })
      .mockResolvedValueOnce({ question: 'Which type?', options: ['string', 'Task', 'int', 'bool'], correctOptionIndex: 1 });
    openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));
    await screen.findByText('Try shortly.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('Draft ready. Check the question and marked answer below.');
    expect(screen.getByRole('button', { name: 'Mark option 2 as correct' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Save question' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('session-1', {
      question: 'Which type?', options: ['string', 'Task', 'int', 'bool'], correctOptionIndex: 1,
    }));
  });
});
