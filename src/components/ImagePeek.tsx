import React, { RefObject, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { imageRepository } from "../persistence/ImageRepository";
import { popoutPanelClass } from "./ui/FormControls";

interface ImagePeekProps {
	imageId: number;
	fallbackUrl: string;
	imageText?: string;
	anchorRef: RefObject<HTMLElement>;
	onDismiss?: () => void;
}

const PEEK_VIEWPORT_MARGIN_PX = 8;

const clampToViewport = (start: number, size: number, viewportSize: number) =>
	Math.max(PEEK_VIEWPORT_MARGIN_PX, Math.min(start, viewportSize - size - PEEK_VIEWPORT_MARGIN_PX));

const ImagePeek: React.FC<ImagePeekProps> = ({ imageId, fallbackUrl, imageText, anchorRef, onDismiss }) => {
	const [url, setUrl] = useState<string | null>(null);
	const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let isMounted = true;

		imageRepository
			.getRecord(imageId)
			.then((record) => {
				if (isMounted) setUrl(record?.url ?? fallbackUrl);
			})
			.catch((error) => {
				console.error("Failed to load image for peek:", error);
				if (isMounted) setUrl(fallbackUrl);
			});

		return () => {
			isMounted = false;
		};
	}, [imageId, fallbackUrl]);

	useEffect(() => {
		if (!onDismiss) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onDismiss();
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onDismiss]);

	const placeNextToAnchor = () => {
		const panel = panelRef.current;
		const anchor = anchorRef.current;
		if (!panel || !anchor) {
			return;
		}

		const anchorRect = anchor.getBoundingClientRect();
		const width = panel.offsetWidth;
		const height = panel.offsetHeight;
		const below = anchorRect.bottom + PEEK_VIEWPORT_MARGIN_PX;
		const above = anchorRect.top - height - PEEK_VIEWPORT_MARGIN_PX;

		let top = (window.innerHeight - height) / 2;
		if (below + height + PEEK_VIEWPORT_MARGIN_PX <= window.innerHeight) {
			top = below;
		} else if (above >= PEEK_VIEWPORT_MARGIN_PX) {
			top = above;
		}

		setPosition({
			left: clampToViewport(anchorRect.left + (anchorRect.width - width) / 2, width, window.innerWidth),
			top,
		});
	};

	if (!url) {
		return null;
	}

	return createPortal(
		<div
			className={`fixed inset-0 z-50 ${onDismiss ? "" : "pointer-events-none"}`}
			onClick={onDismiss}
			onContextMenu={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onDismiss?.();
			}}
		>
			<div
				ref={panelRef}
				className={`animate-menu-in fixed max-w-[90vw] ${popoutPanelClass} ${position ? "" : "invisible"}`}
				style={position ?? undefined}
			>
				{Boolean(imageText?.trim()) && (
					<div className="mb-1 text-center text-lg font-semibold text-zinc-400 whitespace-pre-wrap break-words">
						{imageText}
					</div>
				)}
				<img
					src={url}
					className="mx-auto block min-h-[16rem] max-h-[70vh] max-w-[88vw]"
					alt=""
					decoding="async"
					onLoad={placeNextToAnchor}
				/>
			</div>
		</div>,
		document.body,
	);
};

export default ImagePeek;
