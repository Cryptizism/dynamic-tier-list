import React, { useState, useEffect, useRef } from "react";
import { PenLine, Trash2, XCircle } from "lucide-react";
import { useStyling } from "../context/StylingContext";
import { useContextMenu } from "../hooks/useContextMenu";
import { ContextMenuPanel, ContextMenuItem, ContextMenuDivider } from "./ui/ContextMenu";
import { ModalShell, ModalBody, ModalFooter } from "./ui/Modal";
import { Button } from "./ui/Button";

interface ImageWithContextMenuProps {
	imageId: number;
	imageUrl: string;
	imageText?: string;
	onDelete: (imageId: number) => void;
	onEditText: (imageId: number, nextText: string) => void;
}

const IMAGE_CONTEXT_MENU_DEFAULT_SIZE = { width: 160, height: 96 };

const ImageWithContextMenu: React.FC<ImageWithContextMenuProps> = ({
	imageId,
	imageUrl,
	imageText,
	onDelete,
	onEditText
}) => {
	const [isHovered, setIsHovered] = useState(false);
	const [isTextModalOpen, setIsTextModalOpen] = useState(false);
	const [draftText, setDraftText] = useState(imageText ?? "");
	const { style } = useStyling();
	const contextMenu = useContextMenu(IMAGE_CONTEXT_MENU_DEFAULT_SIZE);
	const textInputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		setDraftText(imageText ?? "");
	}, [imageText]);

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

	const openTextModal = () => {
		setDraftText(imageText ?? "");
		setIsTextModalOpen(true);
		contextMenu.close();
	};

	const closeTextModal = () => {
		setIsTextModalOpen(false);
	};

	const saveText = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onEditText(imageId, draftText);
		setIsTextModalOpen(false);
	};

	const handleDraftTextKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			onEditText(imageId, draftText);
			setIsTextModalOpen(false);
		}
	};

	return (
		<>
			<div
				className="relative"
				onMouseEnter={handleMouseEnter}
				onMouseLeave={handleMouseLeave}
				onContextMenu={contextMenu.open}
			>
				<img
					src={imageUrl}
					className={style.ratio}
					style={{ height: `${style.size}px`, width: `${style.size}px` }}
					alt=""
					loading="lazy"
					decoding="async"
				/>
				{Boolean(imageText?.trim()) && (
					<div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[10px] text-white whitespace-pre-wrap break-words">
						{imageText}
					</div>
				)}
				{isHovered && (
					<div
						className="absolute top-0 right-0 p-1 cursor-pointer text-red-500"
						onClick={() => onDelete(imageId)}
					>
						<XCircle className="w-4 h-4" fill="currentColor" stroke="white" strokeWidth={1} />
					</div>
				)}
			</div>

			{contextMenu.isOpen && (
				<ContextMenuPanel menuRef={contextMenu.menuRef} position={contextMenu.position} className="py-1">
					<ContextMenuItem icon={<PenLine className="h-4 w-4 text-zinc-400" />} onClick={openTextModal}>
						Edit Text
					</ContextMenuItem>
					<ContextMenuDivider />
					<ContextMenuItem
						icon={<Trash2 className="h-4 w-4" />}
						danger
						onClick={() => {
							onDelete(imageId);
							contextMenu.close();
						}}
					>
						Delete Image
					</ContextMenuItem>
				</ContextMenuPanel>
			)}

			<ModalShell
				isOpen={isTextModalOpen}
				onClose={closeTextModal}
				title="Edit Image Text"
				icon={<PenLine className="h-5 w-5" />}
			>
				<form onSubmit={saveText} className="flex min-h-0 flex-1 flex-col">
					<ModalBody>
						<textarea
							ref={textInputRef}
							className="w-full h-24 resize-none rounded-md border border-zinc-600 bg-zinc-900 p-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
							placeholder="Type caption text"
							value={draftText}
							onChange={(event) => setDraftText(event.target.value)}
							onKeyDown={handleDraftTextKeyDown}
						/>
					</ModalBody>
					<ModalFooter>
						<Button type="button" variant="ghost" onClick={closeTextModal}>
							Cancel
						</Button>
						<Button type="submit" variant="primary">
							Save
						</Button>
					</ModalFooter>
				</form>
			</ModalShell>
		</>
	);
};

export default React.memo(ImageWithContextMenu);
