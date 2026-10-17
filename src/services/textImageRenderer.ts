export type TextFlow = "wrap" | "single" | "overflow";

export interface TextImageOptions {
	text: string;
	width: number;
	height: number;
	fontFamily: string;
	backgroundColor: string;
	textColor: string;
	outlineColor: string;
	outlineWidth: number;
	textFlow: TextFlow;
	fontSizePercent: number; // of image height
}

const PADDING_RATIO = 0.08;
const LINE_HEIGHT = 1.15;
const MIN_FONT_SIZE = 4;

const buildFont = (fontSize: number, fontFamily: string) => `bold ${fontSize}px "${fontFamily}", sans-serif`;

// Splits a word that's too wide for a line into line sized chunks
const breakWord = (ctx: CanvasRenderingContext2D, word: string, maxWidth: number): string[] => {
	const chunks: string[] = [];
	let currentChunk = "";
	for (const character of Array.from(word)) {
		const candidate = currentChunk + character;
		if (currentChunk && ctx.measureText(candidate).width > maxWidth) {
			chunks.push(currentChunk);
			currentChunk = character;
		} else {
			currentChunk = candidate;
		}
	}
	chunks.push(currentChunk);
	return chunks;
};

// Greedy word wrap that also breaks words too long for a line, explicit newlines are kept
const wrapLines = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
	return text.split("\n").flatMap((paragraph) => {
		const words = paragraph.split(/\s+/).filter(Boolean);
		if (words.length === 0) return [""];

		const lines: string[] = [];
		let currentLine = "";
		for (const word of words) {
			const candidate = currentLine ? `${currentLine} ${word}` : word;
			if (ctx.measureText(candidate).width <= maxWidth) {
				currentLine = candidate;
				continue;
			}

			if (currentLine) lines.push(currentLine);
			const chunks = breakWord(ctx, word, maxWidth);
			lines.push(...chunks.slice(0, -1));
			currentLine = chunks[chunks.length - 1];
		}
		lines.push(currentLine);
		return lines;
	});
};

const fitsInBox = (ctx: CanvasRenderingContext2D, lines: string[], fontSize: number, maxWidth: number, maxHeight: number) =>
	lines.length * fontSize * LINE_HEIGHT <= maxHeight && lines.every((line) => ctx.measureText(line).width <= maxWidth);

const layoutLines = (ctx: CanvasRenderingContext2D, options: TextImageOptions, maxWidth: number): string[] =>
	options.textFlow === "single" ? options.text.split("\n") : wrapLines(ctx, options.text, maxWidth);

const getChosenFontSize = (options: TextImageOptions) =>
	Math.max(MIN_FONT_SIZE, Math.round((options.height * options.fontSizePercent) / 100));

// Binary search for the biggest font size (up to the chosen one) where the text fits in the image
const findBestFit = (ctx: CanvasRenderingContext2D, options: TextImageOptions, maxWidth: number, maxHeight: number) => {
	let low = MIN_FONT_SIZE;
	let high = Math.max(MIN_FONT_SIZE, Math.min(getChosenFontSize(options), Math.floor(maxHeight)));
	let best = { fontSize: low, lines: options.text.split("\n") };

	while (low <= high) {
		const fontSize = Math.floor((low + high) / 2);
		ctx.font = buildFont(fontSize, options.fontFamily);
		const lines = layoutLines(ctx, options, maxWidth);

		if (fitsInBox(ctx, lines, fontSize, maxWidth, maxHeight)) {
			best = { fontSize, lines };
			low = fontSize + 1;
		} else {
			high = fontSize - 1;
		}
	}

	return best;
};

const fixedSizeLayout = (ctx: CanvasRenderingContext2D, options: TextImageOptions, maxWidth: number) => {
	const fontSize = getChosenFontSize(options);
	ctx.font = buildFont(fontSize, options.fontFamily);
	return { fontSize, lines: wrapLines(ctx, options.text, maxWidth) };
};

export const renderTextImage = async (options: TextImageOptions): Promise<string> => {
	const { width, height, fontFamily, backgroundColor, textColor, outlineColor, outlineWidth } = options;

	// Make sure web/local fonts are actually ready before the canvas measures with them
	try {
		await document.fonts.load(buildFont(48, fontFamily), options.text);
	} catch {
		// Falls back to whatever the browser has by default
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Canvas 2D context is unavailable");
	}

	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, width, height);

	const padding = Math.min(width, height) * PADDING_RATIO;
	const maxWidth = width - padding * 2 - outlineWidth * 2;
	const maxHeight = height - padding * 2 - outlineWidth * 2;
	const { fontSize, lines } =
		options.textFlow === "overflow"
			? fixedSizeLayout(ctx, options, maxWidth)
			: findBestFit(ctx, options, maxWidth, maxHeight);

	ctx.font = buildFont(fontSize, fontFamily);
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.lineJoin = "round";
	ctx.lineWidth = outlineWidth * 2;
	ctx.strokeStyle = outlineColor;
	ctx.fillStyle = textColor;

	const lineHeight = fontSize * LINE_HEIGHT;
	const firstLineY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

	lines.forEach((line, index) => {
		const y = firstLineY + index * lineHeight;
		if (outlineWidth > 0) {
			ctx.strokeText(line, width / 2, y);
		}
		ctx.fillText(line, width / 2, y);
	});

	return canvas.toDataURL("image/png");
};
