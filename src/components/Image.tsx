import React, { useState, useContext } from "react";
import { StylingContext } from "../App";

interface ImageWithContextMenuProps {
	imageUrl: string;
	onDelete: () => void;
}

const ImageWithContextMenu: React.FC<ImageWithContextMenuProps> = ({
	imageUrl,
	onDelete
}) => {
	const [isHovered, setIsHovered] = useState(false);
	const { style } = useContext(StylingContext) || {};

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	return (
		<div
			className="relative"
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<img src={imageUrl} className={style.ratio} style={{height: `${style.size}px`, width: `${style.size}px`}} />
			{isHovered && (
				<div
					className="absolute top-0 right-0 p-1 cursor-pointer text-red-500"
					onClick={onDelete}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="currentColor"
						className="w-4 h-4"
					>
						<path
							fillRule="evenodd"
							d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
			)}
		</div>
	);
};

export default ImageWithContextMenu;
