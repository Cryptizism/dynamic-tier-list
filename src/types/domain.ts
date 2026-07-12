export interface ImageRecord {
	id: number;
	url: string;
	text: string;
}

export interface DisplayImageItem {
	id: number;
	url: string;
	text?: string;
}

export interface Tier {
	id: number;
	color: string;
	tierLabel: string;
}

export type AspectRatioMode = "preserve" | "fit" | "stretch";
export type PasteScaleMode = "fixed" | "preserve";

export interface Style {
	ratio: AspectRatioMode;
	size: number;
	quality: number;
	pasteScaleMode: PasteScaleMode;
}

export interface ImageResizeOptions {
	size: number;
	quality: number;
	pasteScaleMode: PasteScaleMode;
}
