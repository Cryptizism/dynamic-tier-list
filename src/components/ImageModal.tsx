import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CaseSensitive, Eye, ImagePlus, Palette, PenLine, Ratio, Type, Upload, WrapText } from "lucide-react";
import { useStyling } from "../context/StylingContext";
import { useImageHolder } from "../context/ImageHolderContext";
import { useLocalFonts } from "../hooks/useLocalFonts";
import { renderTextImage, TextFlow, TextImageOptions } from "../services/textImageRenderer";
import { ModalShell, ModalBody, ModalFooter } from "./ui/Modal";
import { Button, toolbarButtonClass } from "./ui/Button";
import { SegmentedControl, textInputClass } from "./ui/FormControls";
import { Section } from "./ui/Section";
import { ColorPicker } from "./ui/ColorPicker";
import { ImageFileInput } from "./ui/ImageFileInput";

type ImageModalTab = "upload" | "text";
type ColorField = "backgroundColor" | "textColor" | "outlineColor";

const WEB_SAFE_FONTS = [
	"Arial",
	"Comic Sans MS",
	"Courier New",
	"Georgia",
	"Impact",
	"Tahoma",
	"Times New Roman",
	"Trebuchet MS",
	"Verdana",
];

const ASPECT_RATIOS = [
	{ id: "ratio-1-1", value: "1:1", label: "1:1", ratio: 1 },
	{ id: "ratio-4-3", value: "4:3", label: "4:3", ratio: 4 / 3 },
	{ id: "ratio-16-9", value: "16:9", label: "16:9", ratio: 16 / 9 },
	{ id: "ratio-3-4", value: "3:4", label: "3:4", ratio: 3 / 4 },
];

const TEXT_FLOWS: { id: string; value: TextFlow; label: string }[] = [
	{ id: "flow-wrap", value: "wrap", label: "Wrap" },
	{ id: "flow-single", value: "single", label: "1 line" },
	{ id: "flow-overflow", value: "overflow", label: "Overflow" },
];

const TEXT_FLOW_DESCRIPTIONS: Record<TextFlow, string> = {
	wrap: "Words wrap onto new lines, the text only shrinks if it doesn't fit.",
	single: "Lines only break where you press enter, the text only shrinks if it doesn't fit.",
	overflow: "Words wrap and the text never shrinks, anything that doesn't fit spills off the edges.",
};

const MIN_FONT_SIZE_PERCENT = 5;
const MAX_FONT_SIZE_PERCENT = 100;
const MAX_OUTLINE_WIDTH = 16;

// Rendered well above any display size so the text stays sharp when it gets scaled down (or the "Image Size" setting goes up)
const RENDER_HEIGHT = 1024;

const TEXT_PRESET_COLORS = ["#000000", "#FFFFFF", "#FF7F7F", "#FFDF80", "#7FFF7F", "#7FBFFF", "#BF7FFF", "transparent"];

const COLOR_FIELDS: { field: ColorField; label: string }[] = [
	{ field: "backgroundColor", label: "Background" },
	{ field: "textColor", label: "Text" },
	{ field: "outlineColor", label: "Outline" },
];

type TextImageSettings = Omit<TextImageOptions, "width" | "height"> & { aspectRatio: string };

const DEFAULT_TEXT_OPTIONS: TextImageSettings = {
	text: "",
	aspectRatio: "1:1",
	fontFamily: "Impact",
	backgroundColor: "#27272a",
	textColor: "#FFFFFF",
	outlineColor: "#000000",
	outlineWidth: 6,
	textFlow: "wrap",
	fontSizePercent: 40,
};

const ColorSwatch: React.FC<{ color: string; label: string; isActive: boolean; onClick: () => void }> = ({
	color,
	label,
	isActive,
	onClick,
}) => (
	<button
		type="button"
		onClick={onClick}
		className={`flex flex-1 items-center gap-2 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
			isActive ? "border-indigo-500 bg-zinc-700 text-white" : "border-zinc-600 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
		}`}
	>
		<span
			className="h-4 w-4 shrink-0 rounded border border-zinc-500"
			style={{ background: `linear-gradient(${color}, ${color}), repeating-conic-gradient(#71717a 0 25%, #3f3f46 0 50%) 50% / 8px 8px` }}
		/>
		{label}
	</button>
);

interface ImageModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose }) => {
	const { style } = useStyling();
	const { addImage, addImageFiles } = useImageHolder();
	const { localFonts, isSupported, isLoading, error, loadLocalFonts } = useLocalFonts();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [tab, setTab] = useState<ImageModalTab>("upload");
	const [options, setOptions] = useState<TextImageSettings>(DEFAULT_TEXT_OPTIONS);
	const [activeColorField, setActiveColorField] = useState<ColorField>("backgroundColor");
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	const previewText = options.text.trim() ? options.text : "Preview";

	// Displayed at the "Image Size" setting, rendered at RENDER_HEIGHT, outline is in display pixels so it gets scaled up to match
	const ratio = ASPECT_RATIOS.find((option) => option.value === options.aspectRatio)?.ratio ?? 1;
	const renderScale = RENDER_HEIGHT / style.size;
	const renderOptions = useMemo<TextImageOptions>(
		() => ({
			...options,
			width: Math.round(RENDER_HEIGHT * ratio),
			height: RENDER_HEIGHT,
			outlineWidth: options.outlineWidth * renderScale,
		}),
		[options, ratio, renderScale]
	);

	useEffect(() => {
		if (!isOpen || tab !== "text") return;

		let isCurrent = true;
		renderTextImage({ ...renderOptions, text: previewText })
			.then((url) => {
				if (isCurrent) setPreviewUrl(url);
			})
			.catch((renderError) => console.error("Failed to render text preview:", renderError));

		return () => {
			isCurrent = false;
		};
	}, [isOpen, tab, renderOptions, previewText]);

	const updateOption = <K extends keyof TextImageSettings>(key: K, value: TextImageSettings[K]) => {
		setOptions((prev) => ({ ...prev, [key]: value }));
	};

	const handleFiles = (files: File[]) => {
		addImageFiles(files);
		onClose();
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!options.text.trim()) return;

		const dataUrl = await renderTextImage(renderOptions);
		void addImage(Date.now(), dataUrl);
		setOptions((prev) => ({ ...prev, text: "" }));
		onClose();
	};

	return (
		<ModalShell
			isOpen={isOpen}
			onClose={onClose}
			title="Add Image"
			icon={<ImagePlus className="h-5 w-5" />}
			widthClassName={tab === "text" ? "w-[44rem]" : "w-[28rem]"}
		>
			<form autoComplete="off" onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
				<ModalBody>
					<div className="mb-4">
						<SegmentedControl
							name="image-modal-tab"
							value={tab}
							onChange={(value) => setTab(value as ImageModalTab)}
							options={[
								{ id: "image-tab-upload", value: "upload", label: "From File" },
								{ id: "image-tab-text", value: "text", label: "From Text" },
							]}
						/>
					</div>

					{tab === "upload" ? (
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-600 p-8 text-center text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-zinc-900/40"
						>
							<Upload className="h-8 w-8 text-zinc-500" strokeWidth={1.5} />
							<span>
								<span className="font-semibold text-zinc-200 underline">Click to browse</span> for images
							</span>
							<span className="text-xs">You can also drag & drop or paste images anywhere on the page</span>
							<ImageFileInput ref={fileInputRef} onFiles={handleFiles} />
						</button>
					) : (
						<div className="flex flex-col gap-x-3 sm:flex-row">
							<div className="flex-1">
								<Section title="Text" icon={<Type className="h-4 w-4" />}>
									<textarea
										aria-label="Text"
										rows={2}
										placeholder="Enter some text"
										className={`${textInputClass} resize-none`}
										value={options.text}
										onChange={(event) => updateOption("text", event.target.value)}
									/>
								</Section>

								<Section title="Font" icon={<CaseSensitive className="h-4 w-4" />}>
									<div className="flex gap-2">
										<select
											aria-label="Font"
											className={textInputClass}
											value={options.fontFamily}
											onChange={(event) => updateOption("fontFamily", event.target.value)}
											style={{ fontFamily: options.fontFamily }}
										>
											<optgroup label="Web safe" className="font-sans">
												{WEB_SAFE_FONTS.map((font) => (
													<option key={font} value={font} style={{ fontFamily: font }}>
														{font}
													</option>
												))}
											</optgroup>
											{localFonts.length > 0 && (
												<optgroup label="Local" className="font-sans">
													{localFonts.map((font) => (
														<option key={font} value={font} style={{ fontFamily: font }}>
															{font}
														</option>
													))}
												</optgroup>
											)}
										</select>
										{isSupported && localFonts.length === 0 && (
											<Button
												variant="secondary"
												className="shrink-0 px-3"
												onClick={loadLocalFonts}
												disabled={isLoading}
												title="Load the fonts installed on your device"
											>
												{isLoading ? "Loading..." : "Load local"}
											</Button>
										)}
									</div>
									{error && <p className="mt-1 text-xs text-red-400">{error}</p>}
									{!isSupported && (
										<p className="mt-1 text-xs text-zinc-500">Local fonts need a Chromium based browser</p>
									)}
								</Section>

								<Section
									title="Text Flow"
									description={TEXT_FLOW_DESCRIPTIONS[options.textFlow]}
									icon={<WrapText className="h-4 w-4" />}
								>
									<SegmentedControl
										name="image-text-flow"
										value={options.textFlow}
										onChange={(value) => updateOption("textFlow", value as TextFlow)}
										options={TEXT_FLOWS}
									/>
									<div className="mt-3">
										<label className="mb-1 block text-xs text-zinc-400" htmlFor="image-font-size">
											Font size ({options.fontSizePercent}% of height)
										</label>
										<input
											id="image-font-size"
											type="range"
											min={MIN_FONT_SIZE_PERCENT}
											max={MAX_FONT_SIZE_PERCENT}
											className="w-full accent-indigo-500"
											value={options.fontSizePercent}
											onChange={(event) => updateOption("fontSizePercent", Number(event.target.value))}
										/>
									</div>
								</Section>

								<Section
									title="Aspect Ratio"
									description={`Height uses the "Image Size" setting (${style.size}px).`}
									icon={<Ratio className="h-4 w-4" />}
								>
									<SegmentedControl
										name="image-aspect-ratio"
										value={options.aspectRatio}
										onChange={(value) => updateOption("aspectRatio", value)}
										options={ASPECT_RATIOS}
									/>
								</Section>

								<Section title={`Outline Width (${options.outlineWidth}px)`} icon={<PenLine className="h-4 w-4" />}>
									<input
										type="range"
										aria-label="Outline width"
										min={0}
										max={MAX_OUTLINE_WIDTH}
										className="w-full accent-indigo-500"
										value={options.outlineWidth}
										onChange={(event) => updateOption("outlineWidth", Number(event.target.value))}
									/>
								</Section>
							</div>

							<div className="flex-1">
								<Section title="Colours" icon={<Palette className="h-4 w-4" />}>
									<div className="mb-2 flex gap-1">
										{COLOR_FIELDS.map(({ field, label }) => (
											<ColorSwatch
												key={field}
												color={options[field]}
												label={label}
												isActive={activeColorField === field}
												onClick={() => setActiveColorField(field)}
											/>
										))}
									</div>
									<ColorPicker
										color={options[activeColorField]}
										onChange={(color) => updateOption(activeColorField, color)}
										presetColors={TEXT_PRESET_COLORS}
										disableAlpha={false}
									/>
								</Section>

								<Section
									title="Preview"
									description="Shown at the size it'll appear in the tier list."
									icon={<Eye className="h-4 w-4" />}
								>
									<div className="flex min-h-[6rem] items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-[repeating-conic-gradient(#3f3f46_0_25%,#27272a_0_50%)] bg-[length:16px_16px] p-2">
										{previewUrl && (
											<img
												src={previewUrl}
												alt="Generated text preview"
												className="max-w-full object-contain"
												style={{ height: style.size, aspectRatio: `${ratio}` }}
											/>
										)}
									</div>
								</Section>
							</div>
						</div>
					)}
				</ModalBody>
				<ModalFooter>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					{tab === "text" && (
						<Button type="submit" variant="primary" disabled={!options.text.trim()}>
							Create
						</Button>
					)}
				</ModalFooter>
			</form>
		</ModalShell>
	);
};

export const AddImageButton: React.FC = () => {
	const [isModalOpen, setIsModalOpen] = useState(false);

	return (
		<>
			<button onClick={() => setIsModalOpen(true)} className={toolbarButtonClass}>
				<ImagePlus className="h-4 w-4" />
				Add/Create Image
			</button>
			<ImageModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
		</>
	);
};
