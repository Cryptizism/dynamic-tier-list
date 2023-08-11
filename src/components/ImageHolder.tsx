import React, { useState, useEffect, useContext } from "react";
import { ReactSortable } from "react-sortablejs";
import SettingsModal from "./SettingsModal";
import { StylingContext } from "../App";
import Image from "./Image"

interface ImageItem {
	id: number;
	url: string;
}

const ImageHolder = () => {
	const [images, setImages] = useState<ImageItem[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);

	const openModal = () => {
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		if (event.dataTransfer == null) return;
		if (event.dataTransfer.getData("application/x-tier") !== "true") {
			if (event.dataTransfer.files.length > 0) {
				const files = Array.from(event.dataTransfer.files);
				files.forEach((file) => {
					if (!file.type.startsWith("image/")) return;
					const reader = new FileReader();
					reader.onload = function (event) {
						if (event.target == null) return;
						const imageData = event.target.result;
						setImages((prevImages) => [
							...prevImages,
							{
								id: new Date().getTime() + Math.floor(Math.random() * 1000),
								url: imageData as string
							}
						]);
					};
					reader.readAsDataURL(file);
				});
			}
		}
	};

	const dragStart = (event: DragEvent) => {
		if (event.dataTransfer == null) return;
		event.dataTransfer.setData("application/x-tier", "true");
	};

	useEffect(() => {
		const handlePaste = (event: ClipboardEvent) => {
			const items = event.clipboardData?.items;
			if (items) {
				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					if (item.type.indexOf("image") !== -1) {
						const blob = item.getAsFile();
						if (blob) {
							const imageUrl = URL.createObjectURL(blob);
							setImages((prevImages) => [
								...prevImages,
								{ id: new Date().getTime(), url: imageUrl }
							]);
						}
					}
				}
			}
		};

		document.addEventListener("paste", handlePaste);

		const dragOver = (event: DragEvent) => {
			event.preventDefault();
		};

		const drop = (event: DragEvent) => {
			event.preventDefault();
			handleDrop(event);
		};

		document.addEventListener("dragstart", dragStart);
		document.addEventListener("dragover", dragOver);
		document.addEventListener("drop", drop);

		return () => {
			document.removeEventListener("paste", handlePaste);
			document.removeEventListener("dragover", dragOver);
			document.removeEventListener("drop", drop);
		};
	}, []);

	return (
		<div className="bg-stone-700 flex mt-8">
			<ReactSortable
				list={images}
				setList={setImages}
				tag="div"
				group="shared"
				className="react-sortablejs flex space-x-4 p-4 min-h-[7rem] flex-wrap flex-1 items-center"
				filter=".ignore-elements"
			>
				{images.length === 0 ? (
					<p className="text-gray-400 text-center w-full ignore-elements">
						Drag & Drop or Copy and Paste images in here!
						<br />
						If this is your first time using this you can right click tiers to
						edit them and drag them about, clicking the plus will add more tiers
					</p>
				) : (
					images.map((image) => (
						<Image
						key={image.id}
						imageUrl={image.url}
						onDelete={() => {
							// Implement your delete logic here
							const updatedImages = images.filter((img) => img.id !== image.id);
							setImages(updatedImages);
						}}
						/>
					))
				)}
			</ReactSortable>
			<button className="bg-stone-600" onClick={openModal}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
          stroke="currentColor"
					className="w-6 h-6 text-gray-400"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>
      	<SettingsModal isOpen={isModalOpen} onClose={()=>{closeModal()}} setImages={setImages}/>
		</div>
	);
};

export default ImageHolder;
