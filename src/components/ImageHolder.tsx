import { useState, useCallback, useEffect, useRef, ChangeEvent } from "react";
import { ReactSortable } from "react-sortablejs";
import { Image as ImageIcon, Settings2 } from "lucide-react";
import SettingsModal from "./SettingsModal";
import Image from "./Image";
import { useStyling } from "../context/StylingContext";
import { useResponsivePixelSize } from "../hooks/useResponsivePixelSize";
import { useImageList } from "../hooks/useImageList";
import { ImageRepository } from "../persistence/ImageRepository";

const ImageHolder = () => {
	const { style } = useStyling();
	const { pixelSize, isRefreshOnlyRef } = useResponsivePixelSize(style.size);

	const { images, setImages, addImage, deleteImage, editImageText } = useImageList(
		ImageRepository.IMAGE_HOLDER_LIST_KEY,
		{ size: pixelSize, quality: style.quality, pasteScaleMode: style.pasteScaleMode },
		isRefreshOnlyRef,
	);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const openModal = () => {
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const processFiles = useCallback(
		(files: File[]) => {
			const time = Date.now();

			files.forEach((file, index) => {
				if (!file.type.startsWith("image/")) return;

				const reader = new FileReader();
				reader.onload = (readerEvent) => {
					const result = readerEvent.target?.result;
					if (typeof result === "string") {
						void addImage(time + index, result);
					}
				};
				reader.readAsDataURL(file);
			});
		},
		[addImage]
	);

	const handleDrop = useCallback(
		(event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer == null) return;

			if (event.dataTransfer.getData("application/x-tier") !== "true") {
				if (event.dataTransfer.files.length > 0) {
					processFiles(Array.from(event.dataTransfer.files));
				}
			}
		},
		[processFiles]
	);

	const openFileExplorer = () => {
		fileInputRef.current?.click();
	};

	const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			processFiles(Array.from(event.target.files));
		}
		event.target.value = "";
	};

	const dragStart = useCallback((event: DragEvent) => {
		if (event.dataTransfer == null) return;
		event.dataTransfer.setData("application/x-tier", "true");
	}, []);

	const handlePaste = useCallback(
		(event: ClipboardEvent) => {
			const items = event.clipboardData?.items;
			if (!items) return;

			const time = Date.now();
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if (item.type.indexOf("image") === -1) continue;

				const blob = item.getAsFile();
				const reader = new FileReader();
				reader.readAsDataURL(blob || new Blob());

				reader.onloadend = (readerEvent) => {
					const result = typeof readerEvent.target?.result === "string" ? readerEvent.target.result : null;
					if (result) {
						void addImage(time + i, result);
					}
				};
			}
		},
		[addImage]
	);

	useEffect(() => {
		const dragOver = (event: DragEvent) => {
			event.preventDefault();
		};

		const drop = (event: DragEvent) => {
			event.preventDefault();
			handleDrop(event);
		};

		document.addEventListener("paste", handlePaste);
		document.addEventListener("dragstart", dragStart);
		document.addEventListener("dragover", dragOver);
		document.addEventListener("drop", drop);

		return () => {
			document.removeEventListener("paste", handlePaste);
			document.removeEventListener("dragstart", dragStart);
			document.removeEventListener("dragover", dragOver);
			document.removeEventListener("drop", drop);
		};
	}, [handlePaste, dragStart, handleDrop]);

	return (
		<div className="flex border-t border-black/20 bg-stone-700">
			<div className="flex flex-col flex-1">
				{images.length === 0 ? (
					<div
						role="button"
						tabIndex={0}
						onClick={openFileExplorer}
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								openFileExplorer();
							}
						}}
						className="ignore-elements m-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-stone-600 p-6 text-center transition-colors hover:border-stone-500 hover:bg-stone-800/40"
					>
						<ImageIcon className="h-8 w-8 text-stone-500" strokeWidth={1.5} />
						<p className="text-gray-400">
							Drag & Drop, Copy and Paste, or <span className="font-semibold text-gray-300 underline">click here to browse</span> for images!
							<br />
							If this is your first time using this you can right click tiers to edit them and drag them about, clicking the &quot;Add Tier&quot; will add more tiers (duh)
							<br />
							<span className="font-semibold text-gray-300">All images are stored locally on your PC and cannot be shared*</span>
						</p>
						<input
							ref={fileInputRef}
							type="file"
							accept="image/*"
							multiple
							className="hidden"
							onClick={(event) => event.stopPropagation()}
							onChange={handleFileInputChange}
						/>
					</div>
				) : (
					<ReactSortable
						list={images}
						setList={setImages}
						tag="div"
						group="shared"
						className="react-sortablejs flex space-x-4 p-4 min-h-[7rem] flex-wrap flex-1 items-center"
						filter=".ignore-elements"
					>
						{images.map((image) => (
							<Image
								key={image.id}
								imageId={image.id}
								imageUrl={image.url}
								imageText={image.text}
								onDelete={deleteImage}
								onEditText={editImageText}
							/>
						))}
					</ReactSortable>
				)}
			</div>
			<button
				type="button"
				aria-label="Open settings"
				className="flex items-center justify-center self-stretch border-l border-black/20 bg-stone-600 px-4 text-gray-400 transition-colors hover:bg-stone-500 hover:text-gray-100"
				onClick={openModal}
			>
				<Settings2 className="w-6 h-6" strokeWidth={1.5} />
			</button>
			<SettingsModal isOpen={isModalOpen} onClose={closeModal} />
		</div>
	);
};

export default ImageHolder;
