export class IndexedDbClient {
	private dbPromise: Promise<IDBDatabase> | null = null;

	constructor(
		private readonly dbName: string,
		private readonly dbVersion: number,
		private readonly storeNames: readonly string[],
	) {}

	static requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	static transactionToPromise(transaction: IDBTransaction): Promise<void> {
		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
	}

	open(): Promise<IDBDatabase> {
		if (this.dbPromise) {
			return this.dbPromise;
		}

		this.dbPromise = new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.dbVersion);

			request.onupgradeneeded = () => {
				const db = request.result;
				for (const storeName of this.storeNames) {
					if (!db.objectStoreNames.contains(storeName)) {
						db.createObjectStore(storeName);
					}
				}
			};

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

		return this.dbPromise;
	}

	async transaction(
		storeName: string,
		mode: IDBTransactionMode,
	): Promise<{ store: IDBObjectStore; transaction: IDBTransaction }> {
		const db = await this.open();
		const transaction = db.transaction(storeName, mode);
		return { store: transaction.objectStore(storeName), transaction };
	}

	async runInStore<T>(
		storeName: string,
		mode: IDBTransactionMode,
		handler: (store: IDBObjectStore) => IDBRequest<T>,
	): Promise<T> {
		const { store } = await this.transaction(storeName, mode);
		return IndexedDbClient.requestToPromise(handler(store));
	}
}
