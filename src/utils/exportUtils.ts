import { Workbook } from "exceljs";
import JSZip from "jszip";
import { getImageStore, getOriginalImageData } from "./imageStore";

interface TierItem {
	id: number | string;
	tierLabel: string;
	color?: string;
}

interface StoredImage {
	id: number;
	text?: string;
}

type ExportGroup = "tier" | "unassigned";

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

export interface SpreadsheetOptions {
	embedImages: boolean;
	imageSizePx?: number;
	ratioMode?: "preserve" | "fit" | "stretch";
	maxEmbeddedImageCount?: number;
	maxEmbeddedImageBytes?: number;
}

export interface ExportResult {
	zipBlob: Blob;
	manifest: ExportManifestEntry[];
	spreadsheetBlob: Blob;
	usedEmbeddedSpreadsheet: boolean;
	spreadsheetReason?: string;
}

const DEFAULT_EMBEDDED_IMAGE_COUNT_LIMIT = 250;
const DEFAULT_EMBEDDED_IMAGE_BYTES_LIMIT = 100 * 1024 * 1024;
const DEFAULT_IMAGE_SIZE = 80;
const DEFAULT_RATIO_MODE: "preserve" | "fit" | "stretch" = "preserve";
const DEFAULT_TIER_COLOR = "#4A4A4A";

const sanitizeFolderName = (value: string): string => {
	const normalized = value.trim();
	if (!normalized) {
		return "untitled";
	}

	return normalized.replace(/[<>:"/\\|?*]+/g, "_").replace(/\s+/g, "_");
};

const padIndex = (value: number): string => String(value).padStart(3, "0");

const splitDataUrl = (dataUrl: string): { mimeType: string; base64Data: string } => {
	const commaIndex = dataUrl.indexOf(",");
	if (commaIndex < 0) {
		return {
			mimeType: "application/octet-stream",
			base64Data: "",
		};
	}

	const header = dataUrl.slice(0, commaIndex);
	const mimeMatch = header.match(/^data:([^;]+);base64$/i);

	return {
		mimeType: mimeMatch?.[1]?.toLowerCase() ?? "application/octet-stream",
		base64Data: dataUrl.slice(commaIndex + 1),
	};
};

const mimeTypeToExtension = (mimeType: string): string => {
	switch (mimeType) {// If you don't indent like this it yells at me, idk why because this is wrong..? I am chosing to ignore it battle it if you dare.
	case "image/jpeg":
		return "jpg";
	case "image/png":
		return "png";
	case "image/webp":
		return "webp";
	case "image/gif":
		return "gif";
	case "image/bmp":
		return "bmp";
	case "image/svg+xml":
		return "svg";
	default:
		return "bin";
	}
};

const buildCsv = (manifest: ExportManifestEntry[]): string => {
	const escapeCell = (value: string): string => {
		if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
			return `"${value.replace(/"/g, '""')}"`;
		}
		return value;
	};

	const rows = manifest.map((item) => [
		item.globalOrder.toString(),
		item.group,
		item.folder,
		item.tierLabel,
		item.tierOrder.toString(),
		item.itemOrder.toString(),
		item.imageId.toString(),
		item.filename,
		item.relativePath,
		item.mimeType,
		item.text,
	]);

	const header = [
		"globalOrder",
		"group",
		"folder",
		"tierLabel",
		"tierOrder",
		"itemOrder",
		"imageId",
		"filename",
		"relativePath",
		"mimeType",
		"text",
	];

	return [header, ...rows]
		.map((cells) => cells.map((cell) => escapeCell(cell)).join(","))
		.join("\n");
};

const estimateBase64SizeBytes = (base64Value: string): number => {
	if (!base64Value) {
		return 0;
	}

	const padding = base64Value.endsWith("==") ? 2 : base64Value.endsWith("=") ? 1 : 0;
	return Math.floor((base64Value.length * 3) / 4) - padding;
};

const pxToExcelColumnWidth = (pixels: number): number => {
	return Math.max(8, pixels / 7);
};

const pxToPoints = (pixels: number): number => {
	return pixels * 0.75;
};

const normalizeHexColor = (value: string): string => {
	const trimmed = value.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
		return trimmed.toUpperCase();
	}
	if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
		const short = trimmed.slice(1);
		return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toUpperCase();
	}
	return DEFAULT_TIER_COLOR;
};

const hexToArgb = (hexColor: string): string => {
	const normalized = normalizeHexColor(hexColor).replace("#", "");
	return `FF${normalized}`;
};

const getDataUrlDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
	return new Promise((resolve) => {
		const image = document.createElement("img");
		image.onload = () => {
			resolve({
				width: image.naturalWidth || 1,
				height: image.naturalHeight || 1,
			});
		};
		image.onerror = () => resolve({ width: 1, height: 1 });
		image.src = dataUrl;
	});
};

const getPlacedSize = (
	inputWidth: number,
	inputHeight: number,
	size: number,
	ratioMode: "preserve" | "fit" | "stretch",
): { width: number; height: number } => {
	if (ratioMode === "stretch") {
		return { width: size, height: size };
	}

	const width = Math.max(1, inputWidth);
	const height = Math.max(1, inputHeight);
	const scale = Math.min(size / width, size / height);

	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
};

const buildTierSpreadsheet = async (
	manifest: ExportManifestEntry[],
	options: SpreadsheetOptions,
): Promise<{ workbookBytes: Uint8Array; usedEmbeddedSpreadsheet: boolean; reason?: string }> => {
	const workbook = new Workbook();
	const sheet = workbook.addWorksheet("Tier Images");
	const imageSizePx = Math.max(16, options.imageSizePx ?? DEFAULT_IMAGE_SIZE);
	const ratioMode = options.ratioMode ?? DEFAULT_RATIO_MODE;
	const cellPaddingPx = 12;
	const imageCellWidthPx = imageSizePx + cellPaddingPx * 2;
	const imageCellHeightPx = imageSizePx + cellPaddingPx * 2;

	const maxImageCount = options.maxEmbeddedImageCount ?? DEFAULT_EMBEDDED_IMAGE_COUNT_LIMIT;
	const maxImageBytes = options.maxEmbeddedImageBytes ?? DEFAULT_EMBEDDED_IMAGE_BYTES_LIMIT;
	const totalImageBytes = manifest.reduce((sum, item) => {
		const { base64Data } = splitDataUrl(item.dataUrl);
		return sum + estimateBase64SizeBytes(base64Data);
	}, 0);

	let canEmbedImages = options.embedImages;
	let reason: string | undefined;

	if (manifest.length > maxImageCount) {
		canEmbedImages = false;
		reason = `Embedded images disabled: ${manifest.length} images exceeds limit of ${maxImageCount}.`;
	}

	if (totalImageBytes > maxImageBytes) {
		canEmbedImages = false;
		reason = `Embedded images disabled: estimated ${Math.round(totalImageBytes / (1024 * 1024))}MB exceeds limit of ${Math.round(maxImageBytes / (1024 * 1024))}MB.`;
	}

	const tierRowsMap = new Map<string, { label: string; color: string; tierOrder: number; images: ExportManifestEntry[] }>();

	for (const item of manifest) {
		const key = `${item.tierOrder}:${item.tierLabel}`;
		const existing = tierRowsMap.get(key);
		if (existing) {
			existing.images.push(item);
		} else {
			tierRowsMap.set(key, {
				label: item.tierLabel,
				color: item.tierColor,
				tierOrder: item.tierOrder,
				images: [item],
			});
		}
	}

	const tierRows = Array.from(tierRowsMap.values()).sort((a, b) => a.tierOrder - b.tierOrder);
	const maxImagesInTier = Math.max(...tierRows.map((row) => row.images.length), 0);

	sheet.getColumn(1).width = 18;
	for (let colIndex = 0; colIndex < maxImagesInTier; colIndex += 1) {
		sheet.getColumn(colIndex + 2).width = pxToExcelColumnWidth(imageCellWidthPx);
	}

	for (const tierRow of tierRows) {
		const rowValues = [tierRow.label, ...Array(maxImagesInTier).fill("")];
		const row = sheet.addRow(rowValues);
		row.height = pxToPoints(imageCellHeightPx);

		const tierCell = sheet.getCell(row.number, 1);
		tierCell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: hexToArgb(tierRow.color) },
		};
		tierCell.alignment = {
			vertical: "middle",
			horizontal: "center",
		};

		if (!canEmbedImages) {
			for (let imageIndex = 0; imageIndex < tierRow.images.length; imageIndex += 1) {
				const cell = sheet.getCell(row.number, imageIndex + 2);
				cell.value = tierRow.images[imageIndex].filename;
				cell.alignment = {
					vertical: "middle",
					horizontal: "center",
				};
			}
			continue;
		}

		for (let imageIndex = 0; imageIndex < tierRow.images.length; imageIndex += 1) {
			const entry = tierRow.images[imageIndex];
			const { base64Data, mimeType } = splitDataUrl(entry.dataUrl);
			const extension = mimeTypeToExtension(mimeType);

			if (extension === "jpg" || extension === "png" || extension === "gif") {
				const excelExtension = extension === "jpg" ? "jpeg" : extension;
				const imageId = workbook.addImage({
					base64: entry.dataUrl,
					extension: excelExtension,
				});

				const dimensions = await getDataUrlDimensions(entry.dataUrl);
				const placed = getPlacedSize(dimensions.width, dimensions.height, imageSizePx, ratioMode);
				const offsetX = Math.max(0, Math.floor((imageCellWidthPx - placed.width) / 2));
				const offsetY = Math.max(0, Math.floor((imageCellHeightPx - placed.height) / 2));

				sheet.addImage(imageId, {
					tl: {
						col: imageIndex + 1 + offsetX / imageCellWidthPx,
						row: row.number - 1 + offsetY / imageCellHeightPx,
					},
					ext: { width: placed.width, height: placed.height },
					editAs: "oneCell",
				});
			} else if (base64Data) {
				const cell = sheet.getCell(row.number, imageIndex + 2);
				cell.value = entry.filename;
				cell.alignment = {
					vertical: "middle",
					horizontal: "center",
				};
			}
		}
	}

	if (!canEmbedImages) {
		const noteSheet = workbook.addWorksheet("Notes");
		noteSheet.getCell("A1").value = reason ?? "Embedded images disabled by limits.";
	}

	const workbookBytes = await workbook.xlsx.writeBuffer();
	return {
		workbookBytes: workbookBytes instanceof Uint8Array ? workbookBytes : new Uint8Array(workbookBytes),
		usedEmbeddedSpreadsheet: canEmbedImages,
		reason,
	};
};

export const collectFullResolutionManifest = async (
	tiers: TierItem[] | undefined,
): Promise<ExportManifestEntry[]> => {
	const safeTiers = Array.isArray(tiers) ? tiers : [];
	const manifest: ExportManifestEntry[] = [];
	let globalOrder = 1;

	for (let tierIndex = 0; tierIndex < safeTiers.length; tierIndex += 1) {
		const tier = safeTiers[tierIndex];
		const tierLabel = typeof tier.tierLabel === "string" ? tier.tierLabel : "";
		const tierFolder = sanitizeFolderName(tierLabel || `tier_${tierIndex + 1}`);
		const tierImages = await getImageStore(`tierImages_${tier.id}`) as StoredImage[];

		for (let itemIndex = 0; itemIndex < tierImages.length; itemIndex += 1) {
			const image = tierImages[itemIndex];
			const originalData = await getOriginalImageData(image.id);
			const dataUrl = originalData ?? "";
			const { mimeType } = splitDataUrl(dataUrl);
			const extension = mimeTypeToExtension(mimeType);
			const filename = `${padIndex(itemIndex + 1)}.${extension}`;
			manifest.push({
				group: "tier",
				folder: tierFolder,
				tierLabel,
				tierColor: normalizeHexColor(tier.color ?? DEFAULT_TIER_COLOR),
				tierOrder: tierIndex + 1,
				itemOrder: itemIndex + 1,
				globalOrder,
				imageId: image.id,
				filename,
				relativePath: `tiers/${tierFolder}/${filename}`,
				mimeType,
				text: image.text ?? "",
				dataUrl,
			});
			globalOrder += 1;
		}
	}

	const unassignedImages = await getImageStore("imageHolder") as StoredImage[];
	for (let itemIndex = 0; itemIndex < unassignedImages.length; itemIndex += 1) {
		const image = unassignedImages[itemIndex];
		const originalData = await getOriginalImageData(image.id);
		const dataUrl = originalData ?? "";
		const { mimeType } = splitDataUrl(dataUrl);
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
			imageId: image.id,
			filename,
			relativePath: `unassigned/${filename}`,
			mimeType,
			text: image.text ?? "",
			dataUrl,
		});
		globalOrder += 1;
	}

	return manifest;
};

export const buildExportZip = async (
	manifest: ExportManifestEntry[],
): Promise<{ zipBlob: Blob }> => {
	const zip = new JSZip();

	for (const entry of manifest) {
		const { base64Data } = splitDataUrl(entry.dataUrl);
		if (base64Data) {
			zip.file(entry.relativePath, base64Data, { base64: true });
		}
	}

	zip.file("manifest.json", JSON.stringify(manifest.map(({ dataUrl, ...rest }) => rest), null, 2));
	zip.file("manifest.csv", buildCsv(manifest));

	const zipBlob = await zip.generateAsync({ type: "blob" });
	return { zipBlob };
};

export const buildSpreadsheetExport = async (
	manifest: ExportManifestEntry[],
	spreadsheetOptions: SpreadsheetOptions,
): Promise<{ spreadsheetBlob: Blob; usedEmbeddedSpreadsheet: boolean; spreadsheetReason?: string }> => {
	const spreadsheet = await buildTierSpreadsheet(manifest, spreadsheetOptions);
	const normalizedBytes = Uint8Array.from(spreadsheet.workbookBytes);
	const spreadsheetBlob = new Blob([normalizedBytes], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});

	return {
		spreadsheetBlob,
		usedEmbeddedSpreadsheet: spreadsheet.usedEmbeddedSpreadsheet,
		spreadsheetReason: spreadsheet.reason,
	};
};