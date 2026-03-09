const DB_NAME = "dynamic-tier-list";
const DB_VERSION = 1;
const IMAGE_STORE = "images";
const MIGRATION_FLAG = "imageStoreMigratedV1";

const IMAGE_HOLDER_KEY = "imageHolder";
const TIER_IMAGE_KEY_PREFIX = "tierImages_";

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

interface ImageItem {
  id: number;
  url: string;
}

const openDatabase = (): Promise<IDBDatabase> => {
	if (dbPromise) {
		return dbPromise;
	}

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(IMAGE_STORE)) {
				db.createObjectStore(IMAGE_STORE);
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

	return dbPromise;
};

const withStore = async <T>(
	mode: IDBTransactionMode,
	handler: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
	const db = await openDatabase();

	return new Promise<T>((resolve, reject) => {
		const transaction = db.transaction(IMAGE_STORE, mode);
		const store = transaction.objectStore(IMAGE_STORE);
		const request = handler(store);

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
};

export const getImageStore = async (key: string): Promise<ImageItem[]> => {
	const value = await withStore("readonly", (store) => store.get(key));
	return Array.isArray(value) ? (value as ImageItem[]) : [];
};

export const setImageStore = async (
	key: string,
	images: ImageItem[],
): Promise<void> => {
	await withStore("readwrite", (store) => store.put(images, key));
};

export const deleteImageStore = async (key: string): Promise<void> => {
	await withStore("readwrite", (store) => store.delete(key));
};

export const clearAllImageStores = async (): Promise<void> => {
	await withStore("readwrite", (store) => store.clear());
};

const getTierImageKeysFromLocalStorage = (): string[] => {
	const keys: string[] = [];

	for (let i = 0; i < localStorage.length; i += 1) {
		const key = localStorage.key(i);
		if (key && key.startsWith(TIER_IMAGE_KEY_PREFIX)) {
			keys.push(key);
		}
	}

	return keys;
};

const parseStoredImages = (value: string | null): ImageItem[] => {
	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? (parsed as ImageItem[]) : [];
	} catch {
		return [];
	}
};

export const migrateImageStoresFromLocalStorage = async (): Promise<void> => {
	if (migrationPromise) {
		return migrationPromise;
	}

	migrationPromise = (async () => {
		if (localStorage.getItem(MIGRATION_FLAG) === "true") {
			return;
		}

		const keysToMigrate = [
			IMAGE_HOLDER_KEY,
			...getTierImageKeysFromLocalStorage(),
		];

		for (const key of keysToMigrate) {
			const parsedImages = parseStoredImages(localStorage.getItem(key));
			if (parsedImages.length > 0) {
				await setImageStore(key, parsedImages);
			}

			if (localStorage.getItem(key) !== null) {
				localStorage.removeItem(key);
			}
		}

		localStorage.setItem(MIGRATION_FLAG, "true");
	})();

	return migrationPromise;
};
