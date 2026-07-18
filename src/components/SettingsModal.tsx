import React, { ChangeEvent, FormEvent, useRef, useState } from "react";
import { toBlob } from 'html-to-image';
import {
	Archive,
	ChevronDown,
	Copy,
	Download,
	FileSpreadsheet,
	Gauge,
	Image as ImageIcon,
	Maximize2,
	Scaling,
	Settings2,
	Trash2,
	Upload,
} from "lucide-react";
import { useStyling } from "../context/StylingContext";
import { useTiers } from "../context/TierContext";
import { imageRepository } from "../persistence/ImageRepository";
import { collectFullResolutionManifest } from "../services/export/exportManifestBuilder";
import { buildExportZip } from "../services/export/zipExporter";
import { importManifestIntoRepository, readManifestFromZip } from "../services/export/zipImporter";
import { buildSpreadsheetExport } from "../services/export/spreadsheetExporter";
import { ModalShell, ModalBody, ModalFooter } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Section } from "./ui/Section";
import { SegmentedControl } from "./ui/FormControls";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
}

const SettingsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
	const { style, setStyle } = useStyling();
	const { tiers, setTiers } = useTiers();
	const [selectedStyle, setSelectedStyle] = useState(style);
	const [isCopying, setIsCopying] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isExporting, setIsExporting] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [exportStatus, setExportStatus] = useState<string | null>(null);
	const importFileInputRef = useRef<HTMLInputElement>(null);
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

	const handleImportButtonClick = () => {
		if (isCopying || isSaving || isExporting || isImporting) return;
		importFileInputRef.current?.click();
	};

	const handleImportZipSelected = async (event: ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const confirmed = window.confirm(
			"Importing a tier list replaces all current tiers and images. This cannot be undone. Continue?",
		);
		if (!confirmed) return;

		setIsImporting(true);
		setExportStatus("Reading manifest from ZIP...");

		try {
			const manifest = await readManifestFromZip(file);
			setExportStatus(`Reading ${manifest.length} image${manifest.length === 1 ? "" : "s"} from ZIP...`);
			const importedTiers = await importManifestIntoRepository(manifest);
			setTiers(importedTiers);
			setExportStatus("Import finished. Reloading...");
			window.location.reload();
		} catch (error) {
			console.error("Failed to import tier list from ZIP:", error);
			setExportStatus(error instanceof Error ? error.message : "Import failed. Check browser console for details.");
			setIsImporting(false);
		}
	};

	const exportStatusClasses = isExporting
		? "border-blue-500/30 bg-blue-500/10 text-blue-300"
		: exportStatus?.toLowerCase().includes("fail") || exportStatus?.toLowerCase().includes("unavailable")
			? "border-red-500/30 bg-red-500/10 text-red-300"
			: exportStatus?.toLowerCase().includes("finished")
				? "border-green-500/30 bg-green-500/10 text-green-300"
				: "border-zinc-600/40 bg-zinc-700/30 text-zinc-300";

	const isBusy = isCopying || isSaving || isExporting || isImporting;

	return (
		<ModalShell
			isOpen={isOpen}
			onClose={onClose}
			title="Image Settings"
			icon={<Settings2 className="h-5 w-5" />}
			widthClassName="w-[32rem]"
		>
			<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
				<ModalBody>
					<Section title="Aspect Ratio" icon={<ImageIcon className="h-4 w-4" />}>
						<SegmentedControl
							name="aspectRatio"
							value={selectedStyle.ratio}
							onChange={(value) => setSelectedStyle({ ...selectedStyle, ratio: value as typeof selectedStyle.ratio })}
							options={[
								{ id: "preserve", value: "preserve", label: "Preserve" },
								{ id: "fit", value: "fit", label: "1:1 Fit" },
								{ id: "stretch", value: "stretch", label: "1:1 Stretch" },
							]}
						/>
					</Section>

					<Section
						title="Image Size"
						description="Changes the size of all images on the site and can influence the image scaling setting."
						icon={<Maximize2 className="h-4 w-4" />}
					>
						<div className="relative flex w-32 items-center">
							<input
								type="number"
								min={16}
								value={selectedStyle.size}
								onChange={(e) =>
									setSelectedStyle({ ...selectedStyle, size: parseInt(e.target.value) })
								}
								className="w-full rounded-md border border-zinc-600 bg-zinc-900 p-2 pr-8 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
							/>
							<span className="absolute right-2 text-sm text-zinc-500">px</span>
						</div>
					</Section>

					<Section
						title="Compression Quality"
						description="100% means no compression. Lowering this reduces storage used on your computer but also reduces image quality."
						icon={<Gauge className="h-4 w-4" />}
					>
						<div className="flex items-center gap-3">
							<input
								type="range"
								min={1}
								max={100}
								value={selectedStyle.quality}
								onChange={(e) =>
									setSelectedStyle({ ...selectedStyle, quality: parseInt(e.target.value, 10) })
								}
								className="styled-range w-full"
							/>
							<span className="min-w-[3rem] text-right text-sm text-zinc-300">{selectedStyle.quality}%</span>
						</div>
					</Section>

					<Section title="Image Scaling" icon={<Scaling className="h-4 w-4" />}>
						<SegmentedControl
							name="pasteScaleMode"
							value={selectedStyle.pasteScaleMode}
							onChange={(value) => setSelectedStyle({ ...selectedStyle, pasteScaleMode: value as typeof selectedStyle.pasteScaleMode })}
							options={[
								{ id: "scale-preserve", value: "preserve", label: "Preserve original" },
								{ id: "scale-fixed", value: "fixed", label: "Scale to \"Image Size\"" },
							]}
						/>
					</Section>

					<div className="mb-3 flex flex-row flex-wrap gap-2">
						<Button variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={handleClearLocalStorage}>
							Clear Local Storage
						</Button>
						<Button variant="info" icon={<Copy className="h-4 w-4" />} disabled={isBusy} onClick={handleCopyImage}>
							{isCopying ? "Copying..." : "Copy Image"}
						</Button>
						<Button variant="success" icon={<Download className="h-4 w-4" />} disabled={isBusy} onClick={handleSaveImage}>
							{isSaving ? "Saving..." : "Save Image"}
						</Button>
					</div>

					<details className="group mb-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40">
						<summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-semibold text-zinc-200">
							<span>Export/Import</span>
							<ChevronDown className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" />
						</summary>
						<div className="flex flex-row flex-wrap gap-2 px-4 pb-4 pt-1">
							<Button variant="warning" icon={<Archive className="h-4 w-4" />} disabled={isBusy} onClick={handleExportZip}>
								{isExporting ? "Exporting..." : "Export Full-Res ZIP"}
							</Button>
							<Button variant="accent" icon={<FileSpreadsheet className="h-4 w-4" />} disabled={isBusy} onClick={handleExportSpreadsheet}>
								{isExporting ? "Exporting..." : "Export Spreadsheet (XLSX)"}
							</Button>
							<Button variant="info" icon={<Upload className="h-4 w-4" />} disabled={isBusy} onClick={handleImportButtonClick}>
								{isImporting ? "Importing..." : "Import Full-Res ZIP"}
							</Button>
							<input
								ref={importFileInputRef}
								type="file"
								accept="application/zip,.zip"
								className="hidden"
								onChange={handleImportZipSelected}
							/>
						</div>
					</details>

					{exportStatus && (
						<p className={`mb-1 rounded-md border px-3 py-2 text-sm ${exportStatusClasses}`}>
							{exportStatus}
						</p>
					)}
				</ModalBody>

				<ModalFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" variant="primary">
						Save
					</Button>
				</ModalFooter>
			</form>
		</ModalShell>
	);
};

export default SettingsModal;
