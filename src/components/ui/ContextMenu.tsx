import React, { CSSProperties, ReactNode, RefObject } from "react";

interface ContextMenuPanelProps {
	menuRef?: RefObject<HTMLDivElement>;
	position?: CSSProperties;
	widthClassName?: string;
	className?: string;
	children: ReactNode;
}

export const ContextMenuPanel: React.FC<ContextMenuPanelProps> = ({
	menuRef,
	position,
	widthClassName = "min-w-[11rem]",
	className = "",
	children,
}) => (
	<div
		ref={menuRef}
		className={`animate-menu-in ${position ? "fixed z-20" : ""} overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/95 text-white shadow-2xl ring-1 ring-black/5 backdrop-blur-sm ${widthClassName} ${className}`}
		style={position}
	>
		{children}
	</div>
);

export const ContextMenuHeader: React.FC<{ icon: ReactNode; children: ReactNode }> = ({ icon, children }) => (
	<div className="flex items-center gap-2 border-b border-zinc-700/80 px-3 py-2">
		<span className="text-zinc-400">{icon}</span>
		<span className="text-sm font-semibold text-zinc-200">{children}</span>
	</div>
);

interface ContextMenuItemProps {
	icon: ReactNode;
	danger?: boolean;
	onClick: () => void;
	className?: string;
	children: ReactNode;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ icon, danger, onClick, className = "", children }) => (
	<button
		type="button"
		className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
			danger ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" : "text-zinc-200 hover:bg-zinc-700/80"
		} ${className}`}
		onClick={onClick}
	>
		<span className="shrink-0">{icon}</span>
		{children}
	</button>
);

export const ContextMenuDivider: React.FC = () => <div className="my-1 border-t border-zinc-700/80" />;
