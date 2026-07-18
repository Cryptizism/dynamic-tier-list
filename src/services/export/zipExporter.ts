import JSZip from "jszip";
import { ExportManifestEntry } from "./exportManifestBuilder";
import { splitDataUrl } from "./exportFormatting";

const escapeCsvCell = (value: string): string => {
	if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
};

const buildCsv = (manifest: ExportManifestEntry[]): string => {
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

	return [header, ...rows].map((cells) => cells.map(escapeCsvCell).join(",")).join("\n");
};

export const buildExportZip = async (manifest: ExportManifestEntry[]): Promise<{ zipBlob: Blob }> => {
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
