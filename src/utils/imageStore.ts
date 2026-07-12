const DB_NAME = "dynamic-tier-list";
const DB_VERSION = 1;
const IMAGE_STORE = "images";

const IMAGE_HOLDER_KEY = "imageHolder";
const TIER_IMAGE_KEY_PREFIX = "tierImages_";
const ORIGINAL_IMAGE_KEY_PREFIX = "originalImage_";
const MIGRATION_FLAG_V2 = "imageStoreMigratedV2";

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

export interface StoredImageItem {
	id: number;
	text?: string;
}

export interface ResolvedImageItem extends StoredImageItem {
	url: string;
}

interface LegacyImageItem extends StoredImageItem {
	url?: string;
}

interface OriginalImageItem {
	id: number;
	url: string;
}

export interface ImageResizeOptions {
	size: number;
	quality: number;
	pasteScaleMode: "fixed" | "preserve";
}

const normalizeStoredImageItem = (value: unknown): StoredImageItem | null => {
	if (typeof value !== "object" || value === null) {
		return null;
	}

	const candidate = value as Partial<LegacyImageItem>;
	if (typeof candidate.id !== "number") {
		return null;
	}

	return {
		id: candidate.id,
		text: typeof candidate.text === "string" ? candidate.text : undefined,
	};
};

const normalizeStoredImageItems = (value: unknown): StoredImageItem[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map(normalizeStoredImageItem)
		.filter((item): item is StoredImageItem => item !== null);
};

const readLegacyStoredImageItems = async (key: string): Promise<LegacyImageItem[]> => {
	const value = await withStore("readonly", (store) => store.get(key));
	return Array.isArray(value) ? (value as LegacyImageItem[]) : [];
};

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

export const getImageStore = async (key: string): Promise<StoredImageItem[]> => {
	const value = await withStore("readonly", (store) => store.get(key));
	return normalizeStoredImageItems(value);
};

export const setImageStore = async (
	key: string,
	images: StoredImageItem[],
): Promise<void> => {
	const normalizedImages = images.map((image) => ({
		id: image.id,
		text: image.text,
	}));

	await withStore("readwrite", (store) => store.put(normalizedImages, key));
};

export const setOriginalImageData = async (
	image: OriginalImageItem,
): Promise<void> => {
	await withStore("readwrite", (store) => store.put(image.url, `${ORIGINAL_IMAGE_KEY_PREFIX}${image.id}`));
};

export const getOriginalImageData = async (imageId: number): Promise<string | null> => {
	const value = await withStore("readonly", (store) => store.get(`${ORIGINAL_IMAGE_KEY_PREFIX}${imageId}`));
	return typeof value === "string" ? value : null;
};

export const deleteOriginalImageData = async (imageId: number): Promise<void> => {
	await withStore("readwrite", (store) => store.delete(`${ORIGINAL_IMAGE_KEY_PREFIX}${imageId}`));
};

export const deleteImageStore = async (key: string): Promise<void> => {
	await withStore("readwrite", (store) => store.delete(key));
};

const compressAndDownscaleImage = (
	base64: string,
	maxHeight: number,
	qualityPercent: number,
	shouldScale: boolean,
): Promise<string> => {
	return new Promise((resolve) => {
		const img = document.createElement("img");
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx || img.naturalWidth === 0 || img.naturalHeight === 0) {
				resolve(base64);
				return;
			}

			const scale = shouldScale ? maxHeight / img.naturalHeight : Math.min(1, maxHeight / img.naturalHeight);
			canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
			canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			const output = canvas.toDataURL("image/jpeg", qualityPercent / 100);
			resolve(output);
		};
		img.onerror = () => {
			resolve(base64);
		};
		img.src = base64;
	});
};

export const resizeImageDataUrl = async (
	base64: string,
	options: ImageResizeOptions,
): Promise<string> => {
	return compressAndDownscaleImage(
		base64,
		options.size,
		options.quality,
		options.pasteScaleMode === "fixed",
	);
};

export const resizeStoredImages = async (
	images: Array<StoredImageItem & { url?: string }>,
	options: ImageResizeOptions,
): Promise<ResolvedImageItem[]> => {
	return Promise.all(
		images.map(async (image) => {
			const originalImage = await getOriginalImageData(image.id);
			const source = originalImage ?? image.url ?? "";
			const resizedUrl = await resizeImageDataUrl(source, options);

			return {
				id: image.id,
				text: image.text,
				url: resizedUrl,
			};
		}),
	);
};

export const getFullResolutionImages = async (
	images: Array<StoredImageItem & { url?: string }>,
): Promise<ResolvedImageItem[]> => {
	return Promise.all(
		images.map(async (image) => {
			const originalImage = await getOriginalImageData(image.id);

			return {
				id: image.id,
				text: image.text,
				url: originalImage ?? image.url ?? "",
			};
		}),
	);
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

export const migrateImageStoresFromLocalStorage = async (): Promise<void> => {
	if (migrationPromise) {
		return migrationPromise;
	}

	migrationPromise = (async () => {
		if (localStorage.getItem(MIGRATION_FLAG_V2) === "true") {
			return;
		}

		const keysToMigrate = [
			IMAGE_HOLDER_KEY,
			...getTierImageKeysFromLocalStorage(),
		];
		const uniqueKeys = Array.from(new Set(keysToMigrate));

		for (const key of uniqueKeys) {
			const legacyImages = await readLegacyStoredImageItems(key);
			if (legacyImages.length > 0) {
				await Promise.all(
					legacyImages.map(async (image) => {
						const existingOriginal = await getOriginalImageData(image.id);
						if (existingOriginal || typeof image.url !== "string" || image.url.length === 0) {
							return;
						}

						await setOriginalImageData({
							id: image.id,
							url: image.url,
						});
					}),
				);
				await setImageStore(key, legacyImages);
			}

			if (localStorage.getItem(key) !== null) {
				localStorage.removeItem(key);
			}
		}

		localStorage.setItem(MIGRATION_FLAG_V2, "true");
	})();

	return migrationPromise;
};
