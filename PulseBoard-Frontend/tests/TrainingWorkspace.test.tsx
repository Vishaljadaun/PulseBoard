import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DashboardPage } from '../src/pages/DashboardPage';
import { DemoPage } from '../src/pages/DemoPage';
import { sessionTemplates } from '../src/data/sessionTemplates';

const api = vi.hoisted(() => ({ getMySessions: vi.fn(), create: vi.fn() }));
vi.mock('../src/api/sessionApi', () => ({ sessionApi: api }));
beforeEach(() => { vi.resetAllMocks(); api.getMySessions.mockResolvedValue([]); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);
function dashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route path="/" element={<DashboardPage />} /><Route path="/sessions/:id" element={<p>Session created</p>} /></Routes></MemoryRouter></QueryClientProvider>);
}
it('creates a starter in one request and retains the draft on failure for retry', async () => {
  api.create.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ id: 'new-session' });
  dashboard();
  fireEvent.click(screen.getByRole('button', { name: /ENGINEERING/ }));
  fireEvent.change(screen.getByLabelText('Session title'), { target: { value: 'My workshop' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create with these questions →' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Session title') as HTMLInputElement).value).toBe('My workshop');
  fireEvent.click(screen.getByRole('button', { name: 'Create with these questions →' }));
  await screen.findByText('Session created');
  expect(api.create.mock.calls[1][0]).toEqual({ title: 'My workshop', topic: sessionTemplates[0].topic, questions: sessionTemplates[0].questions });
});
it('demo gives answer feedback and opens a labelled sample report without calling the API', async () => {
  render(<MemoryRouter><DemoPage /></MemoryRouter>);
  expect((screen.getByRole('button', { name: 'Submit sample answer' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByLabelText('Suspends the method so the thread can do other work'));
  fireEvent.click(screen.getByRole('button', { name: 'Submit sample answer' }));
  await screen.findByText('That’s right.');
  fireEvent.click(screen.getByRole('button', { name: 'See the host’s next step →' }));
  await waitFor(() => expect(screen.getByText('SAMPLE REPORT · DEMONSTRATION DATA')).toBeTruthy());
  expect(api.create).not.toHaveBeenCalled();
  expect(api.getMySessions).not.toHaveBeenCalled();
});
