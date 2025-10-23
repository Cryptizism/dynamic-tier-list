import React, { useState, useEffect, useRef, useContext } from "react";
import { ReactSortable } from "react-sortablejs";
import { SketchPicker } from "react-color";
import { StylingContext, TierContext } from "../App"
import Image from "./Image"

interface ImageItem {
	id: number;
	url: string;
}

interface TierProps {
	id: number;
	color: string;
	tierLabel: string;
	onDelete: () => void;
}

const Tier: React.FC<TierProps> = ({ id, color, tierLabel, onDelete }) => {
	const { style } = useContext(StylingContext);

	const [images, setImages] = useState<ImageItem[]>(() => {
		const storedImages = localStorage.getItem(`tierImages_${id}`);
		return storedImages ? JSON.parse(storedImages) : [];
	});

	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
	  left: 0,
	  top: 0
	});

	const { tiers, setTiers } = useContext(TierContext) || {};
  
	const contextMenuRef = useRef<HTMLDivElement>(null);

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
		localStorage.setItem(
		  `tierImages_${id}`,
		  JSON.stringify(images)
		);
	  }, [images, id]);

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

	const handleDeleteTier = () => {
		onDelete();
		handleCloseContextMenu();
	};

	const calculateContextMenuPosition = () => {
		// Too lazy to call re-render, so hardcoded since these values won't change, crucify me
		const menuWidth = contextMenuRef.current?.offsetWidth || 236;
		const menuHeight = contextMenuRef.current?.offsetHeight || 402;
		let left = contextMenuPosition.left;
		let top = contextMenuPosition.top;
		console.log({ left, top, menuWidth, menuHeight });
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
					imageUrl={image.url}
					onDelete={() => {
						const updatedImages = images.filter((img) => img.id !== image.id);
						setImages(updatedImages);
					}}
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
