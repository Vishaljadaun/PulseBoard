import type { SessionQuestion } from '../types';

export interface SessionTemplate {
  id: string;
  label: string;
  title: string;
  topic: string;
  description: string;
  duration: string;
  questions: SessionQuestion[];
}

export const sessionTemplates: SessionTemplate[] = [
  {
    id: 'engineering', label: 'ENGINEERING', title: '.NET onboarding check-in',
    topic: 'Check understanding of async code, dependency injection, and API responses.',
    description: 'Find the concepts to revisit before your new developers ship their first feature.', duration: '10–15 min',
    questions: [
      { question: 'For asynchronous I/O in C#, what does await do when the task is not yet complete?',
        options: ['Blocks the thread until the task completes', 'Suspends the method so the thread can do other work', 'Always creates a new thread', 'Ignores errors from the task'], correctOptionIndex: 1 },
      { question: 'In a typical ASP.NET Core web request, how long does a scoped service instance live?',
        options: ['For the lifetime of the application', 'A new instance for every method call', 'For one request scope', 'Until the next deployment'], correctOptionIndex: 2 },
      { question: 'Which HTTP status usually indicates that a requested resource could not be found?',
        options: ['200', '201', '404', '500'], correctOptionIndex: 2 },
      { question: 'Where would a hands-on follow-up help you most?',
        options: ['Async and error handling', 'Dependency injection', 'Building API endpoints', 'I am ready for a practice task'], correctOptionIndex: null },
    ],
  },
  {
    id: 'workshop', label: 'LEARNING & DEVELOPMENT', title: 'Workshop pulse check',
    topic: 'Understand confidence, clarity, and the next useful learning activity.',
    description: 'Give quieter participants a way to tell you what is clear and what needs another example.', duration: '5 min',
    questions: [
      { question: 'How confident do you feel applying what we covered?', options: ['Ready to try independently', 'Ready with a little support', 'I need another example', 'I need to revisit the basics'], correctOptionIndex: null },
      { question: 'What would help you most right now?', options: ['A worked example', 'A short practice task', 'Time for questions', 'A written recap'], correctOptionIndex: null },
      { question: 'What should we do before the next session?', options: ['Share a reference guide', 'Offer a practice exercise', 'Arrange a follow-up discussion', 'Move to the next topic'], correctOptionIndex: null },
    ],
  },
  {
    id: 'retro', label: 'TEAM FACILITATION', title: 'Sprint retrospective pulse',
    topic: 'Choose one practical improvement for the next sprint.',
    description: 'Turn a team check-in into a focused conversation about blockers and a next step.', duration: '5–10 min',
    questions: [
      { question: 'How manageable was our workload this sprint?', options: ['Comfortable', 'Mostly manageable', 'Frequently overloaded', 'Unsure'], correctOptionIndex: null },
      { question: 'Which blocker should we discuss first?', options: ['Unclear requirements', 'Review or approval delays', 'Build and environment issues', 'Too much work in progress'], correctOptionIndex: null },
      { question: 'Which experiment should we try next sprint?', options: ['Smaller work items', 'A daily review window', 'Clearer acceptance criteria', 'A lower work-in-progress limit'], correctOptionIndex: null },
    ],
  },
];
