import React, { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalShellProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	icon: ReactNode;
	widthClassName?: string;
	children: ReactNode;
}

export const ModalShell: React.FC<ModalShellProps> = ({
	isOpen,
	onClose,
	title,
	icon,
	widthClassName = "w-[28rem]",
	children,
}) => {
	if (!isOpen) {
		return null;
	}

	const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.id === "modal-bg") onClose();
	};

	return (
		<div
			id="modal-bg"
			className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onMouseDown={handleOverlayMouseDown}
		>
			<div
				className={`animate-modal-in flex max-h-[90vh] ${widthClassName} max-w-[92vw] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-2xl`}
			>
				<div className="flex shrink-0 items-center justify-between border-b border-zinc-700 px-6 py-4">
					<h2 className="flex items-center gap-2 text-lg font-semibold text-white">
						<span className="text-indigo-400">{icon}</span>
						{title}
					</h2>
					<button
						type="button"
						aria-label="Close"
						className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
						onClick={onClose}
					>
						<X className="h-5 w-5" />
					</button>
				</div>
				{children}
			</div>
		</div>
	);
};

export const ModalBody: React.FC<{ children: ReactNode; scrollable?: boolean }> = ({
	children,
	scrollable = true,
}) => (
	<div className={`px-6 py-4 ${scrollable ? "slim-scrollbar flex-1 overflow-y-auto" : ""}`}>
		{children}
	</div>
);

export const ModalFooter: React.FC<{ children: ReactNode }> = ({ children }) => (
	<div className="flex shrink-0 justify-end gap-2 border-t border-zinc-700 px-6 py-4">
		{children}
	</div>
);
