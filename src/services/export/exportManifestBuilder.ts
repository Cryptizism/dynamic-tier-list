import { ImageRepository, imageRepository } from "../../persistence/ImageRepository";
import { padIndex, sanitizeFolderName, splitDataUrl, mimeTypeToExtension, normalizeHexColor } from "./exportFormatting";

export type ExportGroup = "tier" | "unassigned";

export interface ExportTierInput {
	id: number | string;
	tierLabel: string;
	color?: string;
}

export interface ExportManifestEntry {
	group: ExportGroup;
	folder: string;
	tierLabel: string;
	tierColor: string;
	tierOrder: number;
	itemOrder: number;
	globalOrder: number;
	imageId: number;
	filename: string;
	relativePath: string;
	mimeType: string;
	text: string;
	dataUrl: string;
}

export const DEFAULT_TIER_COLOR = "#4A4A4A";

export const collectFullResolutionManifest = async (
	tiers: ExportTierInput[] | undefined,
): Promise<ExportManifestEntry[]> => {
	const safeTiers = Array.isArray(tiers) ? tiers : [];
	const manifest: ExportManifestEntry[] = [];
	let globalOrder = 1;

	for (let tierIndex = 0; tierIndex < safeTiers.length; tierIndex += 1) {
		const tier = safeTiers[tierIndex];
		const tierLabel = typeof tier.tierLabel === "string" ? tier.tierLabel : "";
		const tierFolder = sanitizeFolderName(tierLabel || `tier_${tierIndex + 1}`);

		const ids = await imageRepository.getList(ImageRepository.tierListKey(tier.id));
		const records = await imageRepository.getRecords(ids);

		for (let itemIndex = 0; itemIndex < records.length; itemIndex += 1) {
			const record = records[itemIndex];
			const { mimeType } = splitDataUrl(record.url);
			const extension = mimeTypeToExtension(mimeType);
			const filename = `${padIndex(itemIndex + 1)}.${extension}`;

			manifest.push({
				group: "tier",
				folder: tierFolder,
				tierLabel,
				tierColor: normalizeHexColor(tier.color ?? DEFAULT_TIER_COLOR, DEFAULT_TIER_COLOR),
				tierOrder: tierIndex + 1,
				itemOrder: itemIndex + 1,
				globalOrder,
				imageId: record.id,
				filename,
				relativePath: `tiers/${tierFolder}/${filename}`,
				mimeType,
				text: record.text ?? "",
				dataUrl: record.url,
			});
			globalOrder += 1;
		}
	}

	const unassignedIds = await imageRepository.getList(ImageRepository.IMAGE_HOLDER_LIST_KEY);
	const unassignedRecords = await imageRepository.getRecords(unassignedIds);

	for (let itemIndex = 0; itemIndex < unassignedRecords.length; itemIndex += 1) {
		const record = unassignedRecords[itemIndex];
		const { mimeType } = splitDataUrl(record.url);
		const extension = mimeTypeToExtension(mimeType);
		const filename = `${padIndex(itemIndex + 1)}.${extension}`;

		manifest.push({
			group: "unassigned",
			folder: "unassigned",
			tierLabel: "unassigned",
			tierColor: DEFAULT_TIER_COLOR,
			tierOrder: safeTiers.length + 1,
			itemOrder: itemIndex + 1,
			globalOrder,
			imageId: record.id,
			filename,
			relativePath: `unassigned/${filename}`,
			mimeType,
			text: record.text ?? "",
			dataUrl: record.url,
		});
		globalOrder += 1;
	}

	return manifest;
};
