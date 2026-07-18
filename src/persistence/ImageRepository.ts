import { IndexedDbClient } from "./IndexedDbClient";
import { readVersioned, writeVersioned } from "./versionedLocalStorage";
import { IMAGE_STORE_SCHEMA_VERSION, LEGACY_IMAGE_IMPORT_VERSION } from "../config/dataVersions";
import { ImageRecord } from "../types/domain";

interface LegacyImageItem {
	id: number;
	url: string;
	text?: string;
}

export class ImageRepository {
	private static readonly DB_NAME = "dynamic-tier-list";
	private static readonly DB_VERSION = 1;
	private static readonly IMAGE_STORE = "images";
	private static readonly IMAGE_RECORD_KEY_PREFIX = "image_";
	private static readonly LEGACY_ORIGINAL_IMAGE_KEY_PREFIX = "originalImage_";
	private static readonly TIER_IMAGE_LIST_KEY_PREFIX = "tierImages_";
	private static readonly SCHEMA_VERSION_KEY = "__imageStoreVersion__";
	private static readonly LEGACY_IMPORT_MARKER_KEY = "imageStoreLegacyImportVersion";

	static readonly IMAGE_HOLDER_LIST_KEY = "imageHolder";

	private readonly client = new IndexedDbClient(ImageRepository.DB_NAME, ImageRepository.DB_VERSION, [
		ImageRepository.IMAGE_STORE,
	]);
	private migrationPromise: Promise<void> | null = null;

	static tierListKey(tierId: number | string): string {
		return `${ImageRepository.TIER_IMAGE_LIST_KEY_PREFIX}${tierId}`;
	}

	async getList(listKey: string): Promise<number[]> {
		await this.ensureMigrated();
		const value = await this.client.runInStore<unknown>(ImageRepository.IMAGE_STORE, "readonly", (store) =>
			store.get(listKey),
		);
		return Array.isArray(value) ? (value as number[]) : [];
	}

	async setList(listKey: string, ids: number[]): Promise<void> {
		await this.ensureMigrated();
		await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) => store.put(ids, listKey));
	}

	async deleteList(listKey: string): Promise<void> {
		await this.ensureMigrated();
		await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) => store.delete(listKey));
	}

	async getRecord(id: number): Promise<ImageRecord | null> {
		await this.ensureMigrated();
		const value = await this.client.runInStore<unknown>(ImageRepository.IMAGE_STORE, "readonly", (store) =>
			store.get(this.recordKey(id)),
		);
		return this.isImageRecord(value) ? value : null;
	}

	async getRecords(ids: number[]): Promise<ImageRecord[]> {
		const records = await Promise.all(ids.map((id) => this.getRecord(id)));
		return records.filter((record): record is ImageRecord => record !== null);
	}

	async putRecord(record: ImageRecord): Promise<void> {
		await this.ensureMigrated();
		await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) =>
			store.put(record, this.recordKey(record.id)),
		);
	}

	async updateRecordText(id: number, text: string): Promise<void> {
		const existing = await this.getRecord(id);
		if (!existing) {
			return;
		}
		await this.putRecord({ ...existing, text });
	}

	async deleteRecord(id: number): Promise<void> {
		await this.ensureMigrated();
		await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) =>
			store.delete(this.recordKey(id)),
		);
	}

	async clearAll(): Promise<void> {
		await this.ensureMigrated();
		await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) => store.clear());
	}

	private recordKey(id: number): string {
		return `${ImageRepository.IMAGE_RECORD_KEY_PREFIX}${id}`;
	}

	private isImageRecord(value: unknown): value is ImageRecord {
		return (
			typeof value === "object" &&
			value !== null &&
			typeof (value as ImageRecord).id === "number" &&
			typeof (value as ImageRecord).url === "string"
		);
	}

	private ensureMigrated(): Promise<void> {
		if (!this.migrationPromise) {
			this.migrationPromise = this.runMigrations();
		}
		return this.migrationPromise;
	}

	private async runMigrations(): Promise<void> {
		await this.importLegacyLocalStorageIfNeeded();
		await this.reshapeStoreIfNeeded();
	}

	// Poopy legacy migration code
	private async importLegacyLocalStorageIfNeeded(): Promise<void> {
		const marker = readVersioned<boolean>(ImageRepository.LEGACY_IMPORT_MARKER_KEY);
		if (marker && marker.version >= LEGACY_IMAGE_IMPORT_VERSION) {
			return;
		}

		const keysToImport = [
			ImageRepository.IMAGE_HOLDER_LIST_KEY,
			...this.getLegacyTierListKeysFromLocalStorage(),
		];

		for (const key of keysToImport) {
			const items = this.parseLegacyListFromLocalStorage(key);

			if (items.length > 0) {
				await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) =>
					store.put(items.map((item) => item.id), key),
				);

				for (const item of items) {
					await this.client.runInStore(ImageRepository.IMAGE_STORE, "readwrite", (store) =>
						store.put({ id: item.id, url: item.url, text: item.text ?? "" }, this.recordKey(item.id)),
					);
				}
			}

			if (localStorage.getItem(key) !== null) {
				localStorage.removeItem(key);
			}
		}

		writeVersioned(ImageRepository.LEGACY_IMPORT_MARKER_KEY, LEGACY_IMAGE_IMPORT_VERSION, true);
	}

	private getLegacyTierListKeysFromLocalStorage(): string[] {
		const keys: string[] = [];

		for (let i = 0; i < localStorage.length; i += 1) {
			const key = localStorage.key(i);
			if (key && key.startsWith(ImageRepository.TIER_IMAGE_LIST_KEY_PREFIX)) {
				keys.push(key);
			}
		}

		return keys;
	}

	private parseLegacyListFromLocalStorage(key: string): LegacyImageItem[] {
		const value = localStorage.getItem(key);
		if (!value) {
			return [];
		}

		try {
			const parsed = JSON.parse(value);
			return Array.isArray(parsed) ? (parsed as LegacyImageItem[]) : [];
		} catch {
			return [];
		}
	}

	// poopy migration data, optimise storage, meep morp
	private async reshapeStoreIfNeeded(): Promise<void> {
		const currentVersion = await this.readSchemaVersion();
		if (currentVersion === IMAGE_STORE_SCHEMA_VERSION) {
			return;
		}

		const { store, transaction } = await this.client.transaction(ImageRepository.IMAGE_STORE, "readwrite");

		const originalUrlById = new Map<number, string>();
		const legacyItemById = new Map<number, LegacyImageItem>();
		const legacyListByKey = new Map<string, LegacyImageItem[]>();

		await this.iterateCursor(store, (cursor) => {
			const key = cursor.key;
			const value = cursor.value;

			if (typeof key !== "string") {
				return;
			}

			if (key.startsWith(ImageRepository.LEGACY_ORIGINAL_IMAGE_KEY_PREFIX)) {
				const id = Number(key.slice(ImageRepository.LEGACY_ORIGINAL_IMAGE_KEY_PREFIX.length));
				if (!Number.isNaN(id) && typeof value === "string") {
					originalUrlById.set(id, value);
				}
				return;
			}

			const isListKey =
				key === ImageRepository.IMAGE_HOLDER_LIST_KEY || key.startsWith(ImageRepository.TIER_IMAGE_LIST_KEY_PREFIX);

			if (isListKey && this.isLegacyItemArray(value)) {
				legacyListByKey.set(key, value);
				value.forEach((item) => {
					legacyItemById.set(item.id, item);
				});
			}
		});

		const seenIds = new Set<number>();
		originalUrlById.forEach((_url, id) => seenIds.add(id));
		legacyItemById.forEach((_item, id) => seenIds.add(id));

		seenIds.forEach((id) => {
			const legacyItem = legacyItemById.get(id);
			const url = originalUrlById.get(id) ?? legacyItem?.url;
			if (!url) {
				return;
			}
			store.put({ id, url, text: legacyItem?.text ?? "" }, this.recordKey(id));
		});

		legacyListByKey.forEach((items, key) => {
			store.put(items.map((item) => item.id), key);
		});

		originalUrlById.forEach((_url, id) => {
			store.delete(`${ImageRepository.LEGACY_ORIGINAL_IMAGE_KEY_PREFIX}${id}`);
		});

		store.put(IMAGE_STORE_SCHEMA_VERSION, ImageRepository.SCHEMA_VERSION_KEY);

		await IndexedDbClient.transactionToPromise(transaction);
	}

	private async readSchemaVersion(): Promise<number> {
		const value = await this.client.runInStore<unknown>(ImageRepository.IMAGE_STORE, "readonly", (store) =>
			store.get(ImageRepository.SCHEMA_VERSION_KEY),
		);
		return typeof value === "number" ? value : 0;
	}

	private isLegacyItemArray(value: unknown): value is LegacyImageItem[] {
		return (
			Array.isArray(value) &&
			value.every(
				(item) => typeof item === "object" && item !== null && typeof item.id === "number" && typeof item.url === "string",
			)
		);
	}

	private iterateCursor(store: IDBObjectStore, visit: (cursor: IDBCursorWithValue) => void): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = store.openCursor();
			request.onsuccess = () => {
				const cursor = request.result;
				if (cursor) {
					visit(cursor);
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = () => reject(request.error);
		});
	}
}

export const imageRepository = new ImageRepository();
