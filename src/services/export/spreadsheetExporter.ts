import { Workbook } from "exceljs";
import { ExportManifestEntry, DEFAULT_TIER_COLOR } from "./exportManifestBuilder";
import { splitDataUrl, mimeTypeToExtension, estimateBase64SizeBytes, hexToArgb } from "./exportFormatting";
import { AspectRatioMode } from "../../types/domain";

export interface SpreadsheetOptions {
	embedImages: boolean;
	imageSizePx?: number;
	ratioMode?: AspectRatioMode;
	maxEmbeddedImageCount?: number;
	maxEmbeddedImageBytes?: number;
}

const DEFAULT_EMBEDDED_IMAGE_COUNT_LIMIT = 250;
const DEFAULT_EMBEDDED_IMAGE_BYTES_LIMIT = 100 * 1024 * 1024;
const DEFAULT_IMAGE_SIZE = 80;
const DEFAULT_RATIO_MODE: AspectRatioMode = "preserve";

const pxToExcelColumnWidth = (pixels: number): number => Math.max(8, pixels / 7);

const pxToPoints = (pixels: number): number => pixels * 0.75;

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
	ratioMode: AspectRatioMode,
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
			fgColor: { argb: hexToArgb(tierRow.color, DEFAULT_TIER_COLOR) },
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
