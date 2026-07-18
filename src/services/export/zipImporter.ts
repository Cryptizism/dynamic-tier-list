import JSZip from "jszip";
import { ImageRepository, imageRepository } from "../../persistence/ImageRepository";
import { Tier } from "../../types/domain";
import { DEFAULT_TIER_COLOR, ExportManifestEntry } from "./exportManifestBuilder";
import { normalizeHexColor } from "./exportFormatting";

export type ManifestJsonEntry = Omit<ExportManifestEntry, "dataUrl">;

const isValidManifestJsonEntry = (value: unknown): value is ManifestJsonEntry => {
	if (!value || typeof value !== "object") {
		return false;
	}

	const entry = value as Partial<ManifestJsonEntry>;
	return (
		(entry.group === "tier" || entry.group === "unassigned") &&
		typeof entry.folder === "string" &&
		typeof entry.tierLabel === "string" &&
		typeof entry.tierColor === "string" &&
		typeof entry.tierOrder === "number" &&
		typeof entry.itemOrder === "number" &&
		typeof entry.globalOrder === "number" &&
		typeof entry.imageId === "number" &&
		typeof entry.filename === "string" &&
		typeof entry.relativePath === "string" &&
		typeof entry.mimeType === "string" &&
		typeof entry.text === "string"
	);
};

export const readManifestFromZip = async (zipFile: File): Promise<ExportManifestEntry[]> => {
	const zip = await JSZip.loadAsync(zipFile);

	const manifestEntry = zip.file("manifest.json");
	if (!manifestEntry) {
		throw new Error('Selected ZIP has no manifest.json. Pick a ZIP produced by "Export Full-Res ZIP".');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(await manifestEntry.async("string"));
	} catch {
		throw new Error("manifest.json inside the ZIP is not valid JSON.");
	}

	if (!Array.isArray(parsed) || !parsed.every(isValidManifestJsonEntry)) {
		throw new Error("manifest.json does not match the expected tier list export format.");
	}

	const jsonEntries = parsed as ManifestJsonEntry[];
	const entries: ExportManifestEntry[] = [];

	for (const jsonEntry of jsonEntries) {
		const imageFile = zip.file(jsonEntry.relativePath);
		if (!imageFile) {
			throw new Error(`ZIP is missing image file "${jsonEntry.relativePath}".`);
		}

		const base64Data = await imageFile.async("base64");
		entries.push({ ...jsonEntry, dataUrl: `data:${jsonEntry.mimeType};base64,${base64Data}` });
	}

	return entries;
};

export const importManifestIntoRepository = async (manifest: ExportManifestEntry[]): Promise<Tier[]> => {
	await imageRepository.clearAll();

	const tierEntries = manifest.filter((entry) => entry.group === "tier");
	const unassignedEntries = manifest.filter((entry) => entry.group === "unassigned");

	const tierOrders = Array.from(new Set(tierEntries.map((entry) => entry.tierOrder))).sort((a, b) => a - b);

	const tiers: Tier[] = tierOrders.map((tierOrder, index) => {
		const firstEntry = tierEntries.find((entry) => entry.tierOrder === tierOrder)!;
		return {
			id: Date.now() + index,
			tierLabel: firstEntry.tierLabel,
			color: normalizeHexColor(firstEntry.tierColor, DEFAULT_TIER_COLOR),
		};
	});

	for (const entry of manifest) {
		await imageRepository.putRecord({ id: entry.imageId, url: entry.dataUrl, text: entry.text ?? "" });
	}

	for (let tierIndex = 0; tierIndex < tiers.length; tierIndex += 1) {
		const tierOrder = tierOrders[tierIndex];
		const ids = tierEntries
			.filter((entry) => entry.tierOrder === tierOrder)
			.sort((a, b) => a.itemOrder - b.itemOrder)
			.map((entry) => entry.imageId);
		await imageRepository.setList(ImageRepository.tierListKey(tiers[tierIndex].id), ids);
	}

	const unassignedIds = unassignedEntries
		.sort((a, b) => a.itemOrder - b.itemOrder)
		.map((entry) => entry.imageId);
	await imageRepository.setList(ImageRepository.IMAGE_HOLDER_LIST_KEY, unassignedIds);

	return tiers;
};
