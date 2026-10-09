import { describe, expect, it } from 'vitest';
import { csvCell, followUpQuestions, reportCsv } from '../src/utils/report';
import { demoReport } from '../src/data/demoReport';

describe('trainer reports', () => {
  it('only flags answered, closed quizzes below the selected threshold', () => {
    const questions = [
      ...demoReport.questions,
      { ...demoReport.questions[0], id: 'live', status: 'Active' as const },
      { ...demoReport.questions[0], id: 'empty', responses: 0, accuracy: null },
    ];
    expect(followUpQuestions(questions, 70).map((q) => q.id)).toEqual([
      'async',
    ]);
    expect(followUpQuestions(questions, 40)).toEqual([]);
  });
  it('escapes CSV formulas, quotes, commas, and multiline user content', () => {
    expect(csvCell('=HYPERLINK("test")')).toBe('"\'=HYPERLINK(""test"")"');
    expect(csvCell(' \t+SUM(1,2)')).toBe('"\' \t+SUM(1,2)"');
    expect(csvCell('Question, with\n"quotes"')).toBe(
      '"Question, with\n""quotes"""'
    );
    expect(csvCell(null)).toBe('""');
  });
  it('exports option counts and no personal respondent identifiers', () => {
    const csv = reportCsv(demoReport);
    expect(csv).toContain('"Snapshot UTC"');
    expect(csv).toContain('"Knowledge check","12","5","41.7"');
    expect(csv).toContain('"Opinion","12","",""');
    expect(csv).not.toContain('participantId');
  });
});
