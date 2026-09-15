import { useState, useRef, useEffect, useCallback, RefObject, MouseEvent as ReactMouseEvent } from "react";

export interface ContextMenuSize {
	width: number;
	height: number;
}

export interface ContextMenuState {
	menuRef: RefObject<HTMLDivElement>;
	isOpen: boolean;
	position: { left: number; top: number };
	open: (event: ReactMouseEvent) => void;
	close: () => void;
}

const MENU_VIEWPORT_MARGIN_PX = 10;

let activeMenuClose: (() => void) | null = null;

export const useContextMenu = (defaultSize: ContextMenuSize): ContextMenuState => {
	const [isOpen, setIsOpen] = useState(false);
	const [rawPosition, setRawPosition] = useState({ left: 0, top: 0 });
	const menuRef = useRef<HTMLDivElement>(null);

	const close = useCallback(() => setIsOpen(false), []);

	const open = useCallback((event: ReactMouseEvent) => {
		event.preventDefault();
		if (activeMenuClose && activeMenuClose !== close) {
			activeMenuClose();
		}
		activeMenuClose = close;
		setRawPosition({ left: event.clientX, top: event.clientY });
		setIsOpen(true);
	}, [close]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		return () => {
			if (activeMenuClose === close) {
				activeMenuClose = null;
			}
		};
	}, [isOpen, close]);

	useEffect(() => {
		const handleOutsideClick = (event: globalThis.MouseEvent) => {
			if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
				close();
			}
		};

		window.addEventListener("click", handleOutsideClick);
		return () => window.removeEventListener("click", handleOutsideClick);
	}, [isOpen, close]);

	const menuWidth = menuRef.current?.offsetWidth || defaultSize.width;
	const menuHeight = menuRef.current?.offsetHeight || defaultSize.height;

	let left = rawPosition.left;
	let top = rawPosition.top;

	if (left + menuWidth > window.innerWidth) {
		left = window.innerWidth - menuWidth - MENU_VIEWPORT_MARGIN_PX;
	}
	if (top + menuHeight > window.innerHeight) {
		top = window.innerHeight - menuHeight - MENU_VIEWPORT_MARGIN_PX;
	}

	return { menuRef, isOpen, position: { left, top }, open, close };
};
