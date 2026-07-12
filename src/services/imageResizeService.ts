import { ImageResizeOptions, ImageRecord, DisplayImageItem } from "../types/domain";

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

export const resizeImageDataUrl = async (base64: string, options: ImageResizeOptions): Promise<string> => {
	return compressAndDownscaleImage(base64, options.size, options.quality, options.pasteScaleMode === "fixed");
};

export const buildDisplayItems = async (
	records: ImageRecord[],
	options: ImageResizeOptions,
): Promise<DisplayImageItem[]> => {
	return Promise.all(
		records.map(async (record) => ({
			id: record.id,
			url: await resizeImageDataUrl(record.url, options),
			text: record.text,
		})),
	);
};
