# PulseBoard completion tracker

This project is being completed in reviewable milestones. An implemented item is not a claim of production readiness.

## Milestone 1: session lifecycle and repeatable builds

- End a session and close its active polls in the same database save.
- Reject activation and voting when the session is not live, including legacy active polls in ended sessions.
- Prevent new polls and AI generation in ended sessions.
- Notify participants when a session ends; recover that state after refresh or a missed notification.
- Retry initial SignalR failures and periodically refresh state over HTTP.
- Keep host actions consistent with the session state and display poll-action errors outside the creation form.
- Preserve quiz answer indexes by rejecting blank options instead of removing them.
- Run backend build/tests and frontend install/lint/tests/build from a root GitHub Actions workflow.
- Add SQLite-backed lifecycle regression tests and frontend synchronization tests.

## Remaining milestones

1. **Voting integrity:** enforce one vote per participant per poll at the database level, including concurrent requests for different options; serialize competing activation/end/vote operations. Restore a participant's vote receipt on refresh.
2. **Host workflow:** audit authorization across all host endpoints; test multiple host tabs; define edit/delete/archive behavior for draft sessions and polls; add pagination and results export if needed.
3. **AI workflow:** test malformed provider responses, timeouts, missing configuration, cancellation, and answer validation. Confirm the configured model in the target deployment.
4. **Browser acceptance:** automate registration → session → poll → join → vote → results → end with separate host and participant contexts. Cover QR joining, mobile layouts, keyboard navigation, errors, and reconnects.
5. **Deployment:** select persistent database storage, configure real environment values, add health checks and a deployment smoke test. Verify restore/backup and production error behavior before calling the app complete.

Billing is not included in this completion scope unless a paid product is requested.

## Acceptance checklist for this milestone

1. Create a draft session and a poll. Activation stays disabled until the session starts.
2. Start it, activate a poll, and join in another browser. Submit a vote and check host totals.
3. End the session with the poll still active. The host sees the poll as closed; the participant sees “Session ended.”
4. Refresh the participant page. It still shows the ended state.
5. Disconnect the participant, end a different live session, and reconnect. The ended state is recovered.
6. Attempt activation/voting through the API for draft/ended sessions; expect a business-rule error.
7. Run the commands in README.md and check both CI jobs before merging.

## Milestone 2: useful training and facilitation workflow

- Public product page and a no-login interactive demo with labelled sample data.
- Dashboard starters for .NET onboarding, workshop feedback, and sprint retrospectives; search and status filters.
- Validated atomic creation of a session and up to 50 starter questions.
- Owner-only session duplication: new IDs/code, draft state, no votes or lifecycle timestamps.
- Owner-only aggregate report with weighted quiz accuracy, distinct responding browser counts, option breakdowns, and selectable follow-up thresholds.
- Formula-safe CSV export and print layout.
- Regression coverage for report authorization/calculation, starter validation, copy isolation, demo behavior, and retrying failed starter creation.

See docs/TRAINING_WORKFLOW.md for the product demo, API contract, and interpretation limits. These additions do not close the voting-concurrency, persistent deployment, or full browser acceptance milestones above.
