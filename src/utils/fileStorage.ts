export interface Liite {
  id: string;
  nimi: string;
  tyyppi: string;
  data: ArrayBuffer;
  koko: number;
  lisatty: string;
}

const DB_NAME = 'onnenkoukku-files';
const STORE_NAME = 'liitteet';
const DB_VERSION = 1;

function avaaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function tallennaTiedosto(file: File): Promise<string> {
  const id = crypto.randomUUID();
  const data = await file.arrayBuffer();
  const liite: Liite = {
    id,
    nimi: file.name,
    tyyppi: file.type,
    data,
    koko: file.size,
    lisatty: new Date().toISOString(),
  };
  const db = await avaaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(liite);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function haeTiedosto(id: string): Promise<Liite | null> {
  const db = await avaaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function poistaTiedosto(id: string): Promise<void> {
  const db = await avaaDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function haeTiedostot(ids: string[]): Promise<Liite[]> {
  if (ids.length === 0) return [];
  const db = await avaaDB();
  const tulokset = await Promise.all(
    ids.map(
      (id) =>
        new Promise<Liite | null>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(id);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        })
    )
  );
  return tulokset.filter((l): l is Liite => l !== null);
}
