import type { SessionReport } from '../types';
// Deliberately separate from the API: the demo never creates sessions or votes.
export const demoReport: SessionReport = {
  session: {
    id: 'sample',
    title: '.NET onboarding check-in',
    topic:
      'A sample workshop: turn misunderstood concepts into your next teaching moment.',
    joinCode: 'DEMO',
    status: 'Ended',
    createdAt: '2026-10-09T09:00:00Z',
    startedAt: '2026-10-09T09:05:00Z',
    endedAt: '2026-10-09T09:20:00Z',
  },
  generatedAt: '2026-10-09T09:20:00Z',
  respondents: 12,
  totalResponses: 36,
  quizResponses: 24,
  accuracy: 62.5,
  questions: [
    {
      id: 'async',
      question:
        'For asynchronous I/O in C#, what does await do when the task is not yet complete?',
      status: 'Closed',
      responses: 12,
      correctResponses: 5,
      accuracy: 41.7,
      options: [
        {
          id: 'a',
          text: 'Blocks the thread until the task completes',
          isCorrect: false,
          responses: 6,
        },
        {
          id: 'b',
          text: 'Suspends the method so the thread can do other work',
          isCorrect: true,
          responses: 5,
        },
        {
          id: 'c',
          text: 'Always creates a new thread',
          isCorrect: false,
          responses: 1,
        },
        {
          id: 'd',
          text: 'Ignores errors from the task',
          isCorrect: false,
          responses: 0,
        },
      ],
    },
    {
      id: 'di',
      question:
        'In a typical ASP.NET Core web request, how long does a scoped service instance live?',
      status: 'Closed',
      responses: 12,
      correctResponses: 10,
      accuracy: 83.3,
      options: [
        {
          id: 'e',
          text: 'For the lifetime of the application',
          isCorrect: false,
          responses: 1,
        },
        {
          id: 'f',
          text: 'A new instance for every method call',
          isCorrect: false,
          responses: 1,
        },
        {
          id: 'g',
          text: 'For one request scope',
          isCorrect: true,
          responses: 10,
        },
        {
          id: 'h',
          text: 'Until the next deployment',
          isCorrect: false,
          responses: 0,
        },
      ],
    },
    {
      id: 'opinion',
      question: 'What would help you most right now?',
      status: 'Closed',
      responses: 12,
      correctResponses: null,
      accuracy: null,
      options: [
        { id: 'i', text: 'A worked example', isCorrect: false, responses: 7 },
        {
          id: 'j',
          text: 'A short practice task',
          isCorrect: false,
          responses: 3,
        },
        { id: 'k', text: 'Time for questions', isCorrect: false, responses: 2 },
      ],
    },
  ],
};
