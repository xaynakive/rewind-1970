// On-device tape storage in IndexedDB. Nothing here touches the network.
// Spec: .kiro/specs/tapes (Requirement 6)

const DB_NAME = 'rewind-1970';
const DB_VERSION = 1;

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDb() {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    if (!db.objectStoreNames.contains('tapes')) db.createObjectStore('tapes', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  };
  return request(req);
}

/** In-memory fallback when IndexedDB is unavailable (some private modes). */
function memoryStore() {
  const tapes = new Map();
  const meta = new Map();
  return {
    persistent: false,
    async getMeta(key) { return meta.get(key); },
    async setMeta(key, value) { meta.set(key, value); },
    async all() { return [...tapes.values()]; },
    async put(tape) { tapes.set(tape.id, structuredClone(tape)); },
    async clear() { tapes.clear(); },
  };
}

export async function openTapeStore() {
  if (!('indexedDB' in globalThis)) return memoryStore();
  let db;
  try {
    db = await openDb();
  } catch {
    return memoryStore();
  }
  return {
    persistent: true,
    /** Small game facts (never memory text), e.g. whether the pond's secret was noticed. */
    async getMeta(key) {
      return request(db.transaction('meta').objectStore('meta').get(key));
    },
    async setMeta(key, value) {
      const tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put(value, key);
      await done(tx);
    },
    async all() {
      const tapes = await request(db.transaction('tapes').objectStore('tapes').getAll());
      return tapes.sort((a, b) => a.createdAt - b.createdAt);
    },
    async put(tape) {
      const tx = db.transaction('tapes', 'readwrite');
      tx.objectStore('tapes').put(tape);
      await done(tx);
    },
    async clear() {
      const tx = db.transaction('tapes', 'readwrite');
      tx.objectStore('tapes').clear();
      await done(tx);
    },
  };
}
