export const sanitizeFolderName = (value: string): string => {
	const normalized = value.trim();
	if (!normalized) {
		return "untitled";
	}

	return normalized.replace(/[<>:"/\\|?*]+/g, "_").replace(/\s+/g, "_");
};

export const padIndex = (value: number): string => String(value).padStart(3, "0");

export const splitDataUrl = (dataUrl: string): { mimeType: string; base64Data: string } => {
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

export const mimeTypeToExtension = (mimeType: string): string => {
	switch (mimeType) {
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

export const normalizeHexColor = (value: string, fallback: string): string => {
	const trimmed = value.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
		return trimmed.toUpperCase();
	}
	if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
		const short = trimmed.slice(1);
		return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toUpperCase();
	}
	return fallback;
};

export const hexToArgb = (hexColor: string, fallback: string): string => {
	const normalized = normalizeHexColor(hexColor, fallback).replace("#", "");
	return `FF${normalized}`;
};

export const estimateBase64SizeBytes = (base64Value: string): number => {
	if (!base64Value) {
		return 0;
	}

	const padding = base64Value.endsWith("==") ? 2 : base64Value.endsWith("=") ? 1 : 0;
	return Math.floor((base64Value.length * 3) / 4) - padding;
};
