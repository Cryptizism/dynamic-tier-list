import { useState, useCallback, useEffect } from "react";
import { ReactSortable } from "react-sortablejs";
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

	const openModal = () => {
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const handleDrop = useCallback(
		(event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer == null) return;

			if (event.dataTransfer.getData("application/x-tier") !== "true") {
				if (event.dataTransfer.files.length > 0) {
					const time = Date.now();
					const files = Array.from(event.dataTransfer.files);

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
				}
			}
		},
		[addImage]
	);

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
		<div className="bg-stone-700 flex">
			<div className="flex flex-col flex-1">
				{images.length === 0 ? (
					<p className="text-gray-400 text-center w-full ignore-elements p-4">
						Drag & Drop or Copy and Paste images in here!
						<br />
						If this is your first time using this you can right click tiers to edit them and drag them about, clicking the "Add Tier" will add more tiers (duh)
						<br />
						<span className="font-semibold text-gray-300">All images are stored locally on your PC and cannot be shared*</span>
					</p>
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
			<button className="bg-stone-600" onClick={openModal}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth="1.5"
					stroke="currentColor"
					className="w-6 h-6 text-gray-400"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>
			<SettingsModal isOpen={isModalOpen} onClose={closeModal} />
		</div>
	);
};

export default ImageHolder;
