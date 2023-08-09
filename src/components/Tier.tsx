import React, { useState, useEffect, useRef, useContext } from "react";
import { ReactSortable } from "react-sortablejs";
import { SketchPicker } from "react-color";
import { StylingContext } from "../App"

interface ImageItem {
	id: number;
	url: string;
}

interface TierProps {
	color: string;
	name: string;
	onDelete: () => void;
}

const Tier: React.FC<TierProps> = ({ color, name, onDelete }) => {
	const [images, setImages] = useState<ImageItem[]>([]);
	const [editedColor, setEditedColor] = useState(color);
	const [editedName, setEditedName] = useState(name);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		left: 0,
		top: 0
	});
	const {style, setStyle} = useContext(StylingContext) || {};

	const contextMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setEditedColor(color);
	}, [color]);

	useEffect(() => {
		setEditedName(name);
	}, [name]);

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

	const handleColorChange = (newColor: any) => {
		setEditedColor(newColor.hex);
	};

	const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setEditedName(event.target.value);
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

	return (
		<div className="flex bg-[#1A1A17] gap-[2px]">
			<div
				onContextMenu={handleContextMenu}
				className={`w-24 min-h-[5rem] flex justify-center items-center`}
				style={{ backgroundColor: editedColor }}
			>
				<p className="text-center" style={{ overflowWrap: "anywhere" }}>
					{editedName}
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
					<img src={image.url} key={image.id} className={`h-20 w-auto ${style}`} />
				))}
			</ReactSortable>

			{isContextMenuOpen && (
				<div
					ref={contextMenuRef}
					className="fixed bg-zinc-800 text-white p-2 rounded-md shadow-2xl"
					style={{
						left: contextMenuPosition.left,
						top: contextMenuPosition.top
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
							className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-indigo-300 text-black"
							value={editedName}
							onChange={handleNameChange}
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
