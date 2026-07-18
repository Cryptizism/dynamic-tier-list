import React from "react";
import { ReactSortable } from "react-sortablejs";
import { SketchPicker, ColorResult } from "react-color";
import { Palette, SlidersHorizontal, Tag, Trash2 } from "lucide-react";
import Image from "./Image";
import { useStyling } from "../context/StylingContext";
import { useTiers } from "../context/TierContext";
import { useResponsivePixelSize } from "../hooks/useResponsivePixelSize";
import { useImageList } from "../hooks/useImageList";
import { useContextMenu } from "../hooks/useContextMenu";
import { ImageRepository, imageRepository } from "../persistence/ImageRepository";
import { ContextMenuPanel, ContextMenuHeader, ContextMenuItem } from "./ui/ContextMenu";
import { FieldLabel, textInputClass } from "./ui/FormControls";

interface TierProps {
	id: number;
	color: string;
	tierLabel: string;
	onDelete: () => void;
}

const TIER_CONTEXT_MENU_DEFAULT_SIZE = { width: 236, height: 460 };

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
				<ContextMenuPanel
					menuRef={contextMenu.menuRef}
					position={contextMenu.position}
					widthClassName="w-[236px]"
					className="z-10"
				>
					<ContextMenuHeader icon={<SlidersHorizontal className="h-4 w-4" />}>
						Tier Options
					</ContextMenuHeader>
					<div className="p-3">
						<FieldLabel icon={<Palette className="h-3.5 w-3.5" />}>Color</FieldLabel>
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
							styles={{
								default: {
									picker: {
										background: "#18181b",
										border: "1px solid #3f3f46",
										boxShadow: "none",
										borderRadius: "0.5rem",
										width: "auto",
									},
								},
							}}
						/>
					</div>
					<div className="px-3 pb-3">
						<FieldLabel htmlFor="tier-label-input" icon={<Tag className="h-3.5 w-3.5" />}>
							Name
						</FieldLabel>
						<input
							id="tier-label-input"
							type="text"
							placeholder="Tier Label"
							className={textInputClass}
							value={editedTierLabel}
							onChange={handleTierLabelChange}
						/>
					</div>
					<div className="border-t border-zinc-700/80 p-1">
						<ContextMenuItem icon={<Trash2 className="h-4 w-4" />} danger className="rounded-md" onClick={handleDeleteTier}>
							Delete Tier
						</ContextMenuItem>
					</div>
				</ContextMenuPanel>
			)}
		</div>
	);
};

export default Tier;
