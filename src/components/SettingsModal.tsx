import React, { FormEvent, useState } from "react";
import { toBlob } from 'html-to-image';
import { useStyling } from "../context/StylingContext";
import { useTiers } from "../context/TierContext";
import { imageRepository } from "../persistence/ImageRepository";
import { collectFullResolutionManifest } from "../services/export/exportManifestBuilder";
import { buildExportZip } from "../services/export/zipExporter";
import { buildSpreadsheetExport } from "../services/export/spreadsheetExporter";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const SettingsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
	const { style, setStyle } = useStyling();
	const { tiers } = useTiers();
	const [selectedStyle, setSelectedStyle] = useState(style);
	const [isCopying, setIsCopying] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [exportStatus, setExportStatus] = useState<string | null>(null);
	const CLIPBOARD_LIMIT_BYTES = 8 * 1024 * 1024;

	const waitForPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))); // Without setTimeout it doesn't work? LAME ASS CODE

	const exportOptions = {
		pixelRatio: 1,
		skipFonts: true,
		cacheBust: false,
		skipAutoScale: true
	};

	const getTierListNode = () => document.getElementById("tierlist");

	const renderTierListToBlob = async () => {
		const node = getTierListNode();
		if (!node) {
			return null;
		}

		return toBlob(node, exportOptions);
	};

	const saveBlobAsPng = (blob: Blob, filename = "tierlist.png") => {
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const getClipboardLimitBytes = (blob: Blob): number => {
		return Math.max(CLIPBOARD_LIMIT_BYTES, Math.round(blob.size * 0.5));
	};

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onClose();

		if (!setStyle) return;
		setStyle(selectedStyle);
	};

	const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.id === "modal-bg") onClose();
	};

	const handleClearLocalStorage = async () => {
		localStorage.clear();
		await imageRepository.clearAll();
		onClose();
		window.location.reload();
	};

	const handleCopyImage = async () => {
		if (isCopying || isSaving) return;
		setIsCopying(true);
		try {
			await waitForPaint();
			const blob = await renderTierListToBlob();
			if (blob) {
				const clipboardLimitBytes = getClipboardLimitBytes(blob);
				if (blob.size > clipboardLimitBytes) {
					const blobSizeMb = (blob.size / (1024 * 1024)).toFixed(2);
					const limitMb = (clipboardLimitBytes / (1024 * 1024)).toFixed(2);
					const shouldSave = window.confirm(
						`This image is ${blobSizeMb} MB and exceeds the copy limit of ${limitMb} MB. Save the image instead?`,
					);

					if (shouldSave) {
						saveBlobAsPng(blob);
					}
					return;
				}

				const item = new ClipboardItem({ "image/png": blob });
				await navigator.clipboard.write([item]);
			}
		} catch (error) {
			console.error('Failed to copy image: ', error);
			const shouldSave = window.confirm(
				"Copying to clipboard failed on this device/browser. Save the image instead?",
			);
			if (shouldSave) {
				await waitForPaint();
				const fallbackBlob = await renderTierListToBlob();
				if (fallbackBlob) {
					saveBlobAsPng(fallbackBlob);
				}
			}
		} finally {
			setIsCopying(false);
		}
	};

	const handleSaveImage = async () => {
		if (isCopying || isSaving || isExporting) return;
		setIsSaving(true);
		try {
			await waitForPaint();
			const blob = await renderTierListToBlob();
			if (blob) {
				saveBlobAsPng(blob);
			}
		} catch (error) {
			console.error('Failed to save image: ', error);
		} finally {
			setIsSaving(false);
		}
	};

	const downloadBlob = (blob: Blob, filename: string) => {
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleExportZip = async () => {
		if (isCopying || isSaving || isExporting) return;
		if (!Array.isArray(tiers)) {
			setExportStatus("Export unavailable: tier data is not ready yet.");
			return;
		}

		setIsExporting(true);
		setExportStatus("Collecting full-resolution images...");

		try {
			const manifest = await collectFullResolutionManifest(tiers);
			if (manifest.length === 0) {
				setExportStatus("No images to export.");
				return;
			}

			setExportStatus("Building ZIP archive...");
			const result = await buildExportZip(manifest);

			const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
			downloadBlob(result.zipBlob, `tierlist-fullres-${timestamp}.zip`);
			setExportStatus("Export finished.");
		} catch (error) {
			console.error("Failed to export full-resolution images:", error);
			setExportStatus("Export failed. Check browser console for details.");
		} finally {
			setIsExporting(false);
		}
	};

	const handleExportSpreadsheet = async () => {
		if (isCopying || isSaving || isExporting) return;
		if (!Array.isArray(tiers)) {
			setExportStatus("Export unavailable: tier data is not ready yet.");
			return;
		}

		setIsExporting(true);
		setExportStatus("Collecting full-resolution images...");

		try {
			const manifest = await collectFullResolutionManifest(tiers);
			if (manifest.length === 0) {
				setExportStatus("No images to export.");
				return;
			}

			setExportStatus("Building spreadsheet...");
			const ratioMode =
				selectedStyle.ratio === "stretch" || selectedStyle.ratio === "fit"
					? selectedStyle.ratio
					: "preserve";
			const result = await buildSpreadsheetExport(manifest, {
				embedImages: true,
				imageSizePx: selectedStyle.size,
				ratioMode,
			});

			const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
			downloadBlob(result.spreadsheetBlob, `tierlist-${timestamp}.xlsx`);

			if (!result.usedEmbeddedSpreadsheet && result.spreadsheetReason) {
				setExportStatus(result.spreadsheetReason);
				return;
			}

			setExportStatus("Export finished.");
		} catch (error) {
			console.error("Failed to export full-resolution images:", error);
			setExportStatus("Export failed. Check browser console for details.");
		} finally {
			setIsExporting(false);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 dark:bg-opacity-70"
			id="modal-bg"
			onClick={handleClick}
		>
			<div className="bg-zinc-800 p-6 rounded-md shadow-md">
				<h2 className="text-lg font-semibold mb-4 text-white">
					Image Settings
				</h2>
				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<h3 className="block text-sm font-medium text-gray-300">
							Aspect Ratio
						</h3>
						<div className="flex items-center space-x-4 text-gray-300">
							<label htmlFor="preserve" className="flex items-center">
								<input
									type="radio"
									id="preserve"
									name="aspectRatio"
									value="preserve"
									className="mr-2"
									checked={selectedStyle.ratio === "preserve"}
									onChange={() => setSelectedStyle({ ...selectedStyle, ratio: "preserve" })}
								/>
								Preserve
							</label>
							<label htmlFor="fit" className="flex items-center">
								<input
									type="radio"
									id="fit"
									name="aspectRatio"
									value="fit"
									className="mr-2"
									checked={selectedStyle.ratio === "fit"}
									onChange={() => setSelectedStyle({ ...selectedStyle, ratio: "fit" })}
								/>
								1:1 Fit
							</label>
							<label htmlFor="stretch" className="flex items-center">
								<input
									type="radio"
									id="stretch"
									name="aspectRatio"
									value="stretch"
									className="mr-2"
									checked={selectedStyle.ratio === "stretch"}
									onChange={() => setSelectedStyle({ ...selectedStyle, ratio: "stretch" })}
								/>
								1:1 Stretch
							</label>
						</div>
					</div>
					<div className="mb-4">
						<h3 className="block text-sm font-medium text-gray-300">
							Image Size (px)
						</h3>
						<h4 className="text-gray-400 text-xs font-light mb-2">
							This will change the size of all images on the site and can influence the image scaling setting
						</h4>
						<div className="relative flex items-center w-fit">
							<input
								type="number"
								min={16}
								value={selectedStyle.size}
								onChange={(e) =>
									setSelectedStyle({ ...selectedStyle, size: parseInt(e.target.value) })
								}
								className="mt-1 p-2 pr-6 w-full border rounded-md focus:ring focus:ring-indigo-300 text-black"
							/>
							<span className="absolute right-2 text-gray-400">px</span>
						</div>
					</div>
					<div className="mb-4">
						<h3 className="block text-sm font-medium text-gray-300">
							Compression Quality
						</h3>
						<h4 className="text-gray-400 text-xs font-light mb-2">
							100% means no compression.<br />Lowering this will lower storage on your computer but also reduce image quality.
						</h4>
						<div className="flex items-center gap-3">
							<input
								type="range"
								min={1}
								max={100}
								value={selectedStyle.quality}
								onChange={(e) =>
									setSelectedStyle({ ...selectedStyle, quality: parseInt(e.target.value, 10) })
								}
								className="w-48"
							/>
							<span className="text-gray-300 min-w-[3rem]">{selectedStyle.quality}%</span>
						</div>
					</div>
					<div className="mb-4">
						<h3 className="block text-sm font-medium text-gray-300">
							Image Scaling
						</h3>
						<div className="flex flex-col gap-1 text-gray-300">
							<label htmlFor="scale-preserve" className="flex items-center">
								<input
									type="radio"
									id="scale-preserve"
									name="pasteScaleMode"
									value="preserve"
									className="mr-2"
									checked={selectedStyle.pasteScaleMode === "preserve"}
									onChange={() =>
										setSelectedStyle({ ...selectedStyle, pasteScaleMode: "preserve" })
									}
								/>
								Preserve original resolution
							</label>
							<label htmlFor="scale-fixed" className="flex items-center">
								<input
									type="radio"
									id="scale-fixed"
									name="pasteScaleMode"
									value="fixed"
									className="mr-2"
									checked={selectedStyle.pasteScaleMode === "fixed"}
									onChange={() =>
										setSelectedStyle({ ...selectedStyle, pasteScaleMode: "fixed" })
									}
								/>
								Scale to current image size setting
							</label>
						</div>
					</div>
					<div className="my-4 flex flex-row gap-2">
						<button
							type="button"
							className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
							onClick={handleClearLocalStorage}
						>
							Clear Local Storage
						</button>
						<button
							type="button"
							disabled={isCopying || isSaving || isExporting}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
							onClick={handleCopyImage}
						>
							{isCopying ? "Copying..." : "Copy Image"}
						</button>
						<button
							type="button"
							disabled={isCopying || isSaving || isExporting}
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
							onClick={handleSaveImage}
						>
							{isSaving ? "Saving..." : "Save Image"}
						</button>
					</div>
					<details className="mb-4 bg-zinc-900 rounded-md border border-zinc-700">
						<summary className="cursor-pointer px-3 py-2 text-sm font-medium text-gray-200">
							Export
						</summary>
						<div className="px-3 pb-3 pt-1 flex flex-row gap-2 flex-wrap">
							<button
								type="button"
								disabled={isCopying || isSaving || isExporting}
								className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
								onClick={handleExportZip}
							>
								{isExporting ? "Exporting..." : "Export Full-Res ZIP"}
							</button>
							<button
								type="button"
								disabled={isCopying || isSaving || isExporting}
								className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
								onClick={handleExportSpreadsheet}
							>
								{isExporting ? "Exporting..." : "Export Spreadsheet (XLSX)"}
							</button>
						</div>
					</details>
					{exportStatus && (
						<p className="mb-4 text-sm text-gray-300">
							{exportStatus}
						</p>
					)}
					<div className="flex justify-end">
						<button
							type="button"
							className="mr-2 px-4 py-2 text-gray-400 hover:text-gray-100"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							Save
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default SettingsModal;
