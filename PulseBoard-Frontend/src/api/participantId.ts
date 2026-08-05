const STORAGE_KEY = 'pulseboard-participant-id';

/**
 * Participants never register an account, but votes still need to be
 * attributable to "one person" so we can block double-voting. This
 * generates a random ID once per browser and reuses it — it's not tied to
 * any personal data, just a vote-deduplication token.
 */
export function getParticipantId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
