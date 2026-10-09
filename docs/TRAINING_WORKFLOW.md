# PulseBoard facilitation workflow

PulseBoard helps a trainer or team facilitator hear from participants and decide what to revisit. This milestone implements a small, usable workshop workflow; it is not an LMS, an attendance system, or a certified assessment product.

## Run a first workshop

1. Visit `/` for the product overview or `/demo` for an interactive, explicitly labelled sample. The demo does not call the API, save answers, or modify real reports.
2. Register or log in. On the dashboard, preview the .NET onboarding, workshop pulse, or sprint retrospective starter. Set the title and purpose, then create the draft with its questions in one operation. Alternatively, create a blank session and add manual or AI-drafted questions.
3. Review the starter questions before starting. Starters are fixed question sets; this version supports adding questions, not editing or deleting saved questions.
4. Start the session, share its join link/QR/code, and activate one question at a time. Participants need no account. Close each question when the group is ready to discuss the result.
5. End the session and open **View results & report**. The report includes option-level counts, quiz accuracy, and closed quiz questions below a selectable discussion threshold (50%, 70%, or 80%). Opinion polls never count as incorrect answers.
6. Explain misunderstood answers and work through an example. Export CSV or use Print / save PDF to retain the report. The suggestions are rules based, not an AI diagnosis or a pass/fail assessment.
7. Choose **Reuse for a new group** to copy the questions into a new draft with fresh IDs and a new join code. Votes and lifecycle timestamps are not copied. Session creation/copy supports at most 50 starter questions.

## Reporting semantics

- **Responding browsers** counts distinct anonymous participant IDs with at least one submitted response. It is not verified attendance or a count of people. Switching browsers/devices can create a new identity.
- **Total answers** counts saved votes across all questions.
- **Correct quiz answers** is the number of correct saved quiz responses divided by all quiz responses. It is weighted by responses, not an average of question percentages. Opinion questions are excluded. With no quiz responses, accuracy is unavailable, not zero.
- Follow-up suggestions include only closed, answered quiz questions below the selected threshold. Small samples and question wording affect interpretation.
- Reports are owner-only snapshots. Refresh explicitly during a live session. Counts may change while votes are arriving; use ended sessions for a stable review.
- CSV exports contain aggregate results and correct answers, not participant IDs. Cells are escaped and formula prefixes neutralized.

## API changes

- `POST /api/sessions` accepts optional `questions: [{ question, options, correctOptionIndex }]`. Existing title/topic-only requests remain valid. Input is validated before writes; the session and questions use one database save.
- `POST /api/sessions/{id}/duplicate` requires the owning host and returns a new draft.
- `GET /api/sessions/{id}/report` requires the owning host and returns aggregate question data with answer keys. It is never broadcast to participants.

No schema migration or extra configuration is required. Deploy the backend before the frontend because the report and starter screens depend on the new endpoints. Existing Vercel/Render environment values remain in use.

## Five-minute product demo

Show the public page → try a sample answer → inspect the sample report → sign in → preview and create a starter → use a second browser to join a real session → vote and close → review the report → export → reuse with a fresh code. Sample values on the landing page and demo are illustrative, not customer metrics.

## Before a paid rollout

Run an actual pilot with a training team and measure whether the report changes their follow-up teaching. Complete the concurrency protection, backup/restore, and two-browser production checks in COMPLETION.md. Individual learner progress, source-cited document questions, scheduled follow-ups, tenant/department integration, and billing remain future work. Repeating a session currently creates an independent group; it does not compare learners over time.
