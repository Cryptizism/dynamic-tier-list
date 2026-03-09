import React, { FormEvent, useContext, useState } from "react";
import { StylingContext } from "../App";
import { toBlob } from 'html-to-image';
import { clearAllImageStores } from "../utils/imageStore";

interface ImageItem {
	id: number;
	url: string;
}

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
}

const SettingsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
	const { style, setStyle } = useContext(StylingContext);
	const [selectedStyle, setSelectedStyle] = useState(style);

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
		await clearAllImageStores();
		onClose();
		window.location.reload();
	};

	const handleCopyImage = async () => {
		const node = document.getElementById('tierlist');
		if (node) {
			try {
				const blob = await toBlob(node);
				const item = new ClipboardItem({ "image/png": blob as Blob });
				await navigator.clipboard.write([item]);
			} catch (error) {
				console.error('Failed to copy image: ', error);
			}
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
								min={50}
								max={500}
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
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
							onClick={handleCopyImage}
						>
							Copy Image
						</button>
					</div>
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
