
const PREFIX = "bookshelf-page-state-v1";

export function getPageStorageKey(userId, page) {
  if (!userId) return null;
  return `${PREFIX}:${userId}:${page}`;
}

export function readPageState(userId, page, fallback) {
  const key = getPageStorageKey(userId, page);
  if (!key) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function savePageState(userId, page, state) {
  const key = getPageStorageKey(userId, page);
  if (!key) return;

  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // The page remains usable if browser storage is unavailable.
  }
}
