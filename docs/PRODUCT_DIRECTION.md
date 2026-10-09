# Proposed product: PulseBoard Training Readiness

## Assessment

The existing .NET/React application is a useful portfolio foundation: it demonstrates authentication, live communication, database-backed state, AI integration, and testing. A generic AI polling tool is not yet a strong commercial position. Mentimeter already generates interactive content with AI, and Slido offers analytics and exports.

References checked October 9, 2026:
- https://help.mentimeter.com/en/articles/16730234-create-and-edit-mentis-with-the-ai-assistant
- https://www.slido.com/features-analytics

The following is a product hypothesis to validate with customers, not evidence of demand or a claim of a unique invention.

## Initial customer and problem

Start with small software training teams and engineering managers onboarding developers. They need to know which concepts were misunderstood after training and whether follow-up teaching helped. Attendance and a one-off quiz score do not answer that question.

Sell a training-readiness module that can stand alone or embed inside BizCore's employee/department workflow. The buyer is a team lead or training manager; learners use a mobile link.

## Core workflow

1. Trainer uploads or pastes approved course/SOP content and selects learning objectives.
2. AI drafts questions and explanations with citations to specific source passages. Trainer approves them.
3. Learners answer and optionally indicate confidence. Show the trainer topic-level gaps and common wrong answers.
4. Trainer assigns a short remediation lesson based on those gaps.
5. A later follow-up check measures improvement for the same learning objective.
6. Export a report of completion, weak topics, and follow-up results.

Example: a .NET onboarding session reveals confusion about async calls. The trainer assigns a short explanation and a debugging exercise, then checks understanding again after seven days.

## Build sequence

| Milestone | Deliverable | Acceptance evidence |
| --- | --- | --- |
| Reliability | Concurrent vote protection, session state integrity, browser tests, persistent deployment | Automated tests plus a two-browser production smoke test |
| Training MVP | Reusable question bank, explanations, topic tags, named learner opt-in, CSV export | A trainer runs a real workshop without developer assistance |
| Source-based drafting | Approved documents, passage citations, question review/versioning | Questions are traceable to the source and rejected when unsupported |
| Follow-up learning | Assignments, reminders, confidence signals, repeat assessment | Trainer can compare the same learning objective over time |
| BizCore module | Tenant isolation, employee/department mapping, SSO or signed launch links, webhook results | Two tenant test accounts cannot access each other's content or results |
| Paid pilot | Workspace limits, usage metering, onboarding and support | Three pilot teams use it repeatedly and agree to pay |

## Potential differentiation

Combine source-linked answers, common-error explanations, and follow-up evidence in a workflow for technical onboarding. Make multilingual delivery and low-bandwidth mobile use optional priorities if pilot customers need them. Do not build all of these before validating the training workflow.

Anonymous participants can remain available for informal polls. Tracked training needs explicit participant identification and a clear notice about who can see results. Do not market a quiz score as an objective measure of job performance or use it as an automated hiring decision.

## Pilot and commercial test

Recruit three training teams. Measure preparation time, workshop completion, repeat usage, incorrect-question reports, and usefulness of the follow-up report. Compare quiz results carefully: repeating the exact same question may measure recall rather than durable understanding.

Test a workspace subscription with a defined learner allowance and capped AI usage. Offer a paid pilot before adding billing automation. Set pricing after measuring support time, AI cost, and willingness to pay; avoid “unlimited AI” promises.

Not implemented by the current UI/AI repair: document ingestion, learner tracking, follow-up assignments, BizCore embedding, or billing.
