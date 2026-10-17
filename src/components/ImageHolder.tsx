import { useState, useCallback, useEffect, useRef } from "react";
import { ReactSortable } from "react-sortablejs";
import { Image as ImageIcon, Settings2 } from "lucide-react";
import SettingsModal from "./SettingsModal";
import Image from "./Image";
import { ImageFileInput } from "./ui/ImageFileInput";
import { useImageHolder } from "../context/ImageHolderContext";

const ImageHolder = () => {
	const { images, setImages, addImageFiles, deleteImage, editImageText } = useImageHolder();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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
					addImageFiles(Array.from(event.dataTransfer.files));
				}
			}
		},
		[addImageFiles]
	);

	const openFileExplorer = () => {
		fileInputRef.current?.click();
	};

	const dragStart = useCallback((event: DragEvent) => {
		if (event.dataTransfer == null) return;
		event.dataTransfer.setData("application/x-tier", "true");
	}, []);

	const handlePaste = useCallback(
		(event: ClipboardEvent) => {
			const items = event.clipboardData?.items;
			if (!items) return;

			const files = Array.from(items)
				.map((item) => item.getAsFile())
				.filter((file): file is File => file !== null);
			addImageFiles(files);
		},
		[addImageFiles]
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
				<ReactSortable
					list={images}
					setList={setImages}
					tag="div"
					group="shared"
					className="react-sortablejs flex space-x-4 p-4 min-h-[7rem] flex-wrap flex-1 items-center"
					filter=".ignore-elements"
				>
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
							className="ignore-elements w-full m-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-stone-600 p-6 text-center transition-colors hover:border-stone-500 hover:bg-stone-800/40"
						>
							<ImageIcon className="h-8 w-8 text-stone-500" strokeWidth={1.5} />
							<p className="text-gray-400">
								Drag & Drop, Copy and Paste, or <span className="font-semibold text-gray-300 underline">click here to browse</span> for images!
								<br />
								If this is your first time using this you can right click tiers to edit them and drag them about, clicking the &quot;Add Tier&quot; will add more tiers (duh)
								<br />
								<span className="font-semibold text-gray-300">All images are stored locally, you can export and import in the settings</span>
							</p>
							<ImageFileInput ref={fileInputRef} onFiles={addImageFiles} />
						</div>
					) : (
						<>
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
						</>
					)}
				</ReactSortable>
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
