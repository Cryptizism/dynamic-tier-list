import React, { useState, ChangeEvent, FormEvent } from "react";
import { SketchPicker, ColorResult } from "react-color";
import { Palette, Plus, Tag, Pencil } from "lucide-react";
import { useTiers } from "../context/TierContext";
import { Button } from "./ui/Button";
import { FieldLabel, textInputClass } from "./ui/FormControls";
import { ContextMenuPanel, ContextMenuHeader } from "./ui/ContextMenu";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAddTier: (color: string, tierLabel: string) => void;
}

export const AddTierButton: React.FC = () => {
	const { setTiers } = useTiers();

	const [isModalOpen, setIsModalOpen] = useState(false);

	const openModal = () => {
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	const addTier = (color: string, tierLabel: string) => {
		const newTier = { color: color || "#ffffff", tierLabel: tierLabel || "New Tier", id: Date.now() };
		setTiers((prevTiers) => [...prevTiers, newTier]);
	};

	return (
		<>
			<button
				onClick={openModal}
				className="flex items-center justify-center gap-2 bg-stone-600 hover:bg-stone-700 text-white font-semibold py-2 px-4 my-4 w-fit transition-colors"
			>
				<Plus className="h-4 w-4" />
				Add Tier
			</button>
			<TierModal
				isOpen={isModalOpen}
				onClose={closeModal}
				onAddTier={addTier}
			/>
		</>
	)
}

export const TierModal: React.FC<ModalProps> = ({ isOpen, onClose, onAddTier }) => {
	const [tierLabel, setTierLabel] = useState("");
	const [color, setColor] = useState("");

	const handleTierLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
		setTierLabel(event.target.value);
	};

	const handleColorChange = (newColor: ColorResult) => {
		setColor(newColor.hex);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onAddTier(color, tierLabel);
		onClose();
	};

	const handleOverlayMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.id === "modal-bg") onClose();
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div
			id="modal-bg"
			className="animate-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
			onMouseDown={handleOverlayMouseDown}
		>
			<ContextMenuPanel widthClassName="w-[236px]">
				<form autoComplete="off" onSubmit={handleSubmit}>
					<ContextMenuHeader icon={<Pencil className="h-4 w-4" />}>New Tier</ContextMenuHeader>
					<div className="p-3">
						<FieldLabel htmlFor="tierLabel" icon={<Tag className="h-3.5 w-3.5" />}>
							Tier Label
						</FieldLabel>
						<input
							type="text"
							placeholder="Tier Label"
							id="tierLabel"
							className={textInputClass}
							value={tierLabel}
							onChange={handleTierLabelChange}
						/>
					</div>
					<div className="px-3 pb-3">
						<FieldLabel icon={<Palette className="h-3.5 w-3.5" />}>Color</FieldLabel>
						<SketchPicker
							color={color}
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
					<div className="flex justify-end gap-2 border-t border-zinc-700/80 p-2">
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" variant="primary">
							Create
						</Button>
					</div>
				</form>
			</ContextMenuPanel>
		</div>
	);
};
