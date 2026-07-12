export interface VersionedEnvelope<T> {
	version: number;
	data: T;
}

export const readVersioned = <T>(key: string): VersionedEnvelope<T> | null => {
	const raw = localStorage.getItem(key);
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			typeof parsed.version === "number" &&
			"data" in parsed
		) {
			return parsed as VersionedEnvelope<T>;
		}
	} catch {
		return null;
	}

	return null;
};

export const writeVersioned = <T>(key: string, version: number, data: T): void => {
	const envelope: VersionedEnvelope<T> = { version, data };
	localStorage.setItem(key, JSON.stringify(envelope));
};
