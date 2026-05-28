import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { ReactSortable } from "react-sortablejs";
import { SketchPicker } from "react-color";
import { StylingContext, TierContext } from "../App"
import Image from "./Image"
import {
	getImageStore,
	migrateImageStoresFromLocalStorage,
	deleteOriginalImageData,
	setImageStore,
	getFullResolutionImages,
	resizeStoredImages,
} from "../utils/imageStore";

interface ImageItem {
	id: number;
	url: string;
	text?: string;
}

interface TierProps {
	id: number;
	color: string;
	tierLabel: string;
	onDelete: () => void;
}

const Tier: React.FC<TierProps> = ({ id, color, tierLabel, onDelete }) => {
	const { style } = useContext(StylingContext);

	const [images, setImages] = useState<ImageItem[]>([]);
	const [hasHydratedImages, setHasHydratedImages] = useState(false);
	const [previewPixelSize, setPreviewPixelSize] = useState(() =>
		Math.max(1, Math.round(style.size * (window.devicePixelRatio || 1)))
	);
	const isPreviewRefreshRef = useRef(false);

	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		left: 0,
		top: 0
	});

	const { tiers, setTiers } = useContext(TierContext) || {};
	
	const contextMenuRef = useRef<HTMLDivElement>(null);

	const getPreviewPixelSize = useCallback(
		() => Math.max(1, Math.round(style.size * (window.devicePixelRatio || 1))),
		[style.size]
	);

	useEffect(() => {
		let debounceHandle: number | undefined;

		const schedulePreviewRefresh = () => {
			if (debounceHandle !== undefined) {
				window.clearTimeout(debounceHandle);
			}

			debounceHandle = window.setTimeout(() => {
				setPreviewPixelSize((currentValue) => {
					const nextValue = getPreviewPixelSize();
					if (currentValue === nextValue) {
						isPreviewRefreshRef.current = false;
						return currentValue;
					}
					isPreviewRefreshRef.current = true;
					return nextValue;
				});
			}, 150);
		};

		setPreviewPixelSize(getPreviewPixelSize());
		window.addEventListener("resize", schedulePreviewRefresh);
		window.addEventListener("scroll", schedulePreviewRefresh, { passive: true });
		window.visualViewport?.addEventListener("resize", schedulePreviewRefresh);
		window.visualViewport?.addEventListener("scroll", schedulePreviewRefresh, { passive: true });

		return () => {
			if (debounceHandle !== undefined) {
				window.clearTimeout(debounceHandle);
			}

			window.removeEventListener("resize", schedulePreviewRefresh);
			window.removeEventListener("scroll", schedulePreviewRefresh);
			window.visualViewport?.removeEventListener("resize", schedulePreviewRefresh);
			window.visualViewport?.removeEventListener("scroll", schedulePreviewRefresh);
		};
	}, [getPreviewPixelSize]);

	const tierIndex = tiers.findIndex((tier) => tier.color === color && tier.tierLabel === tierLabel);
	const editedColor = tierIndex !== -1 ? tiers[tierIndex].color : color;
	const editedTierLabel = tierIndex !== -1 ? tiers[tierIndex].tierLabel : tierLabel;

	useEffect(() => {
		const handleOutsideClick = (e: MouseEvent) => {
			if (
				isContextMenuOpen &&
				contextMenuRef.current &&
				!contextMenuRef.current.contains(e.target as Node)
			) {
				handleCloseContextMenu();
			}
		};

		window.addEventListener("click", handleOutsideClick);

		return () => {
			window.removeEventListener("click", handleOutsideClick);
		};
	}, [isContextMenuOpen]);

	useEffect(() => {
		let isMounted = true;

		const loadImages = async () => {
			await migrateImageStoresFromLocalStorage();
			const storedImages = await getImageStore(`tierImages_${id}`);
			const resizedImages = await resizeStoredImages(storedImages, {
				size: previewPixelSize,
				quality: style.quality,
				pasteScaleMode: style.pasteScaleMode,
			});
			if (isMounted) {
				isPreviewRefreshRef.current = false;
				setImages(resizedImages);
				setHasHydratedImages(true);
			}
		};

		loadImages();

		return () => {
			isMounted = false;
		};
	}, [id, previewPixelSize, style.pasteScaleMode, style.quality, style.size]);

	useEffect(() => {
		if (!hasHydratedImages) {
			return;
		}

		if (isPreviewRefreshRef.current) {
			isPreviewRefreshRef.current = false;
			return;
		}

		const persistImages = async () => {
			const fullResolutionImages = await getFullResolutionImages(images);
			await setImageStore(`tierImages_${id}`, fullResolutionImages);
		};

		persistImages();
	}, [images, id, hasHydratedImages]);

	const handleColorChange = (newColor: any) => {
		if (tierIndex !== -1) {
			const updatedTiers = [...tiers];
			updatedTiers[tierIndex].color = newColor.hex;
			setTiers(updatedTiers);
		}
	};

	const handleTierLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (tierIndex !== -1) {
			const updatedTiers = [...tiers];
			updatedTiers[tierIndex].tierLabel = event.target.value;
			setTiers(updatedTiers);
		}
	};

	const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsContextMenuOpen(true);
		setContextMenuPosition({ left: e.clientX, top: e.clientY });
	};

	const handleCloseContextMenu = () => {
		setIsContextMenuOpen(false);
	};

	const handleDeleteImage = useCallback((imageId: number) => {
		deleteOriginalImageData(imageId).catch((error) => {
			console.error("Failed to delete original image data:", error);
		});
		setImages((prevImages) => prevImages.filter((img) => img.id !== imageId));
	}, []);

	const handleEditImageText = useCallback((imageId: number, nextText: string) => {
		setImages((prevImages) =>
			prevImages.map((img) => (img.id === imageId ? { ...img, text: nextText } : img))
		);
	}, []);

	const handleDeleteTier = async () => {
		await Promise.all(images.map((image) => deleteOriginalImageData(image.id).catch((error) => {
			console.error("Failed to delete original image data:", error);
		})));
		onDelete();
		handleCloseContextMenu();
	};

	const calculateContextMenuPosition = () => {
		// Too lazy to call re-render, so hardcoded since these values won't change, crucify me
		// Lol what the fuck is this guy above me talking avbout
		const menuWidth = contextMenuRef.current?.offsetWidth || 236;
		const menuHeight = contextMenuRef.current?.offsetHeight || 402;
		let left = contextMenuPosition.left;
		let top = contextMenuPosition.top;
		if (left + menuWidth > window.innerWidth) {
			left = window.innerWidth - menuWidth - 10;
		}
		if (top + menuHeight > window.innerHeight) {
			top = window.innerHeight - menuHeight - 10;
		}
		return { left, top };
	};

	return (
		<div className="flex bg-[#1A1A17] gap-[2px]">
			<div
				onContextMenu={handleContextMenu}
				className={`w-24 flex justify-center items-center handle cursor-move`}
				style={{ backgroundColor: editedColor, minHeight: `${style.size}px`, width: `${style.size*1.2}px`, fontSize: `${style.size/5}px` }}
			>
				<p className="text-center" style={{ overflowWrap: "anywhere" }}>
					{editedTierLabel}
				</p>
			</div>
			<ReactSortable
				list={images}
				setList={setImages}
				tag="div"
				group="shared"
				className="react-sortablejs flex space-x-[2px] flex-1 flex-wrap"
			>
				{images.map((image) => (
					<Image
						key={image.id}
						imageId={image.id}
						imageUrl={image.url}
						imageText={image.text}
						onDelete={handleDeleteImage}
						onEditText={handleEditImageText}
					/>
				))}
			</ReactSortable>

			{isContextMenuOpen && (
				<div
					ref={contextMenuRef}
					className="fixed bg-zinc-800 text-white p-2 rounded-md shadow-2xl z-10"
					style={{
						...calculateContextMenuPosition(),
					}}
					id="context-menu"
				>
					<div>
						<label className="block text-gray-300 font-semibold">
							Edit Color
						</label>
						<SketchPicker
							color={editedColor}
							onChange={handleColorChange}
							disableAlpha
							presetColors={[
								"#FF7F7F",
								"#FFBF7F",
								"#FFDF80",
								"#FFFF7F",
								"#BFFF7F",
								"#7FFF7F"
							]}
							className="text-black"
						/>
					</div>
					<div>
						<label className="block text-gray-300 font-semibold">
							Edit Name
						</label>
						<input
							type="text"
							placeholder="Tier Label"
							className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-indigo-300 text-black"
							value={editedTierLabel}
							onChange={handleTierLabelChange}
						/>
					</div>
					<div>
						<span
							className="text-red-500 cursor-pointer"
							onClick={handleDeleteTier}
						>
							Delete Tier
						</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default Tier;
