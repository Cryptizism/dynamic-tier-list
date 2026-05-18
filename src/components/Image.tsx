import React, { useState, useContext, useEffect, useRef } from "react";
import { StylingContext } from "../App";

interface ImageWithContextMenuProps {
	imageUrl: string;
	imageText?: string;
	onDelete: () => void;
	onEditText: (nextText: string) => void;
}

const ImageWithContextMenu: React.FC<ImageWithContextMenuProps> = ({
	imageUrl,
	imageText,
	onDelete,
	onEditText
}) => {
	const [isHovered, setIsHovered] = useState(false);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [isTextModalOpen, setIsTextModalOpen] = useState(false);
	const [draftText, setDraftText] = useState(imageText ?? "");
	const [contextMenuPosition, setContextMenuPosition] = useState({ left: 0, top: 0 });
	const { style } = useContext(StylingContext) || {};
	const contextMenuRef = useRef<HTMLDivElement>(null);
	const textInputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setDraftText(imageText ?? "");
	}, [imageText]);

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			if (
				isContextMenuOpen &&
				contextMenuRef.current &&
				!contextMenuRef.current.contains(event.target as Node)
			) {
				setIsContextMenuOpen(false);
			}
		};

		window.addEventListener("click", handleOutsideClick);
		return () => {
			window.removeEventListener("click", handleOutsideClick);
		};
	}, [isContextMenuOpen]);

	useEffect(() => {
		if (!isTextModalOpen) {
			return;
		}

		textInputRef.current?.focus();
	}, [isTextModalOpen]);

	const handleMouseEnter = () => {
		setIsHovered(true);
	};

	const handleMouseLeave = () => {
		setIsHovered(false);
	};

	const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsContextMenuOpen(true);
		setContextMenuPosition({ left: event.clientX, top: event.clientY });
	};

	const calculateContextMenuPosition = () => {
		const menuWidth = contextMenuRef.current?.offsetWidth || 160;
		const menuHeight = contextMenuRef.current?.offsetHeight || 96;
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

	const openTextModal = () => {
		setDraftText(imageText ?? "");
		setIsTextModalOpen(true);
		setIsContextMenuOpen(false);
	};

	const closeTextModal = () => {
		setIsTextModalOpen(false);
	};

	const saveText = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onEditText(draftText);
		setIsTextModalOpen(false);
	};

	const closeTextModalIfBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.id === "image-text-modal-bg") {
			closeTextModal();
		}
	};

	const handleDraftTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			onEditText(draftText);
			setIsTextModalOpen(false);
		}
	};

	return (
		<>
			<div
				className="relative"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onContextMenu={handleContextMenu}
			>
				<img src={imageUrl} className={style.ratio} style={{height: `${style.size}px`, width: `${style.size}px`}} alt="" />
				{Boolean(imageText?.trim()) && (
					<div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white whitespace-pre-wrap break-words">
						{imageText}
					</div>
				)}
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

			{isContextMenuOpen && (
				<div
					ref={contextMenuRef}
					className="fixed bg-zinc-800 text-white rounded-md shadow-2xl z-20 py-1 min-w-[10rem]"
					style={{ ...calculateContextMenuPosition() }}
				>
					<button
						type="button"
						className="block w-full text-left px-3 py-2 hover:bg-zinc-700"
						onClick={openTextModal}
					>
						Edit Text
					</button>
					<button
						type="button"
						className="block w-full text-left px-3 py-2 text-red-400 hover:bg-zinc-700"
						onClick={() => {
							onDelete();
							setIsContextMenuOpen(false);
						}}
					>
						Delete Image
					</button>
				</div>
			)}

			{isTextModalOpen && (
				<div
					id="image-text-modal-bg"
					className="fixed inset-0 flex items-center justify-center z-30 bg-black bg-opacity-50 dark:bg-opacity-70"
					onMouseDown={closeTextModalIfBackgroundClick}
				>
					<div className="bg-zinc-800 p-6 rounded-md shadow-md w-[28rem] max-w-[90vw]">
						<h2 className="text-lg font-semibold mb-4 text-white">Edit Image Text</h2>
						<form onSubmit={saveText}>
							<textarea
								ref={textInputRef}
								className="w-full h-24 p-2 border rounded-md text-black"
								placeholder="Type caption text"
								value={draftText}
								onChange={(event) => setDraftText(event.target.value)}
								onKeyDown={handleDraftTextKeyDown}
							/>
							<div className="flex justify-end mt-4">
								<button
									type="button"
									className="mr-2 px-4 py-2 text-gray-400 hover:text-gray-100"
									onClick={closeTextModal}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
								>
									Save
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</>
	);
};

export default ImageWithContextMenu;
