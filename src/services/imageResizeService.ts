import { ImageResizeOptions, ImageRecord, DisplayImageItem } from "../types/domain";

const ALPHA_CAPABLE_MIME_PATTERN = /^data:image\/(png|gif|webp|svg\+xml);/i;

const supportsTransparency = (base64: string): boolean => ALPHA_CAPABLE_MIME_PATTERN.test(base64);

const encodeTransparentCanvas = (canvas: HTMLCanvasElement, quality: number): string => {
	const webpOutput = canvas.toDataURL("image/webp", quality);
	// poopy browser won't be able to do this, so uncompressed png as fallback to keep transparency :P
	if (webpOutput.startsWith("data:image/webp")) {
		return webpOutput;
	}

	return canvas.toDataURL("image/png");
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
			const output = supportsTransparency(base64)
				? encodeTransparentCanvas(canvas, qualityPercent / 100)
				: canvas.toDataURL("image/jpeg", qualityPercent / 100);
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
