import { useState, useEffect } from "react";
import { ReactSortable } from "react-sortablejs";

interface ImageItem {
	id: number;
	url: string;
}

const ImageHolder = () => {
	const [images, setImages] = useState<ImageItem[]>([]);

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
		<ReactSortable
			list={images}
			setList={setImages}
			tag="div"
			group="shared"
			className="react-sortablejs flex space-x-4 p-4 bg-stone-700 min-h-[7rem] flex-wrap mt-8"
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
					<img src={image.url} key={image.id} className="h-20 w-auto" />
				))
			)}
		</ReactSortable>
	);
};

export default ImageHolder;
