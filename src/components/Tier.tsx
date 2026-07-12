import React from "react";
import { ReactSortable } from "react-sortablejs";
import { SketchPicker, ColorResult } from "react-color";
import Image from "./Image";
import { useStyling } from "../context/StylingContext";
import { useTiers } from "../context/TierContext";
import { useResponsivePixelSize } from "../hooks/useResponsivePixelSize";
import { useImageList } from "../hooks/useImageList";
import { useContextMenu } from "../hooks/useContextMenu";
import { ImageRepository, imageRepository } from "../persistence/ImageRepository";

interface TierProps {
	id: number;
	color: string;
	tierLabel: string;
	onDelete: () => void;
}

const TIER_CONTEXT_MENU_DEFAULT_SIZE = { width: 236, height: 402 };

const Tier: React.FC<TierProps> = ({ id, color, tierLabel, onDelete }) => {
	const { style } = useStyling();
	const { tiers, setTiers } = useTiers();
	const { pixelSize, isRefreshOnlyRef } = useResponsivePixelSize(style.size);

	const { images, setImages, deleteImage, editImageText } = useImageList(
		ImageRepository.tierListKey(id),
		{ size: pixelSize, quality: style.quality, pasteScaleMode: style.pasteScaleMode },
		isRefreshOnlyRef,
	);

	const contextMenu = useContextMenu(TIER_CONTEXT_MENU_DEFAULT_SIZE);

	const tierIndex = tiers.findIndex((tier) => tier.color === color && tier.tierLabel === tierLabel);
	const editedColor = tierIndex !== -1 ? tiers[tierIndex].color : color;
	const editedTierLabel = tierIndex !== -1 ? tiers[tierIndex].tierLabel : tierLabel;

	const handleColorChange = (newColor: ColorResult) => {
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

	const handleDeleteTier = () => {
		images.forEach((image) => {
			imageRepository.deleteRecord(image.id).catch((error) => {
				console.error("Failed to delete image data:", error);
			});
		});
		onDelete();
		contextMenu.close();
	};

	return (
		<div className="flex bg-[#1A1A17] gap-[2px]">
			<div
				onContextMenu={contextMenu.open}
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
						onDelete={deleteImage}
						onEditText={editImageText}
					/>
				))}
			</ReactSortable>

			{contextMenu.isOpen && (
				<div
					ref={contextMenu.menuRef}
					className="fixed bg-zinc-800 text-white p-2 rounded-md shadow-2xl z-10"
					style={{
						...contextMenu.position,
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
