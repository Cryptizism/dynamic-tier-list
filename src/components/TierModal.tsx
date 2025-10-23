import React, { useState, ChangeEvent, FormEvent, useContext } from "react";
import { SketchPicker } from "react-color";
import { StylingContext, TierContext } from "../App";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAddTier: (color: string, tierLabel: string) => void;
}

export const AddTierButton: React.FC = () => {
	const { style } = useContext(StylingContext);
	const { setTiers } = useContext(TierContext);
	
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
			<button onClick={openModal} className="bg-stone-600 hover:bg-stone-700 text-white font-semibold py-2 px-4 my-4" style={{width: style.size * 1.2}}>
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

	const handleColorChange = (newColor: any) => {
		setColor(newColor.hex);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onAddTier(color, tierLabel);
		onClose();
	};

	const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.id === "modal-bg") onClose();
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 dark:bg-opacity-70"
			id="modal-bg"
			onMouseDown={handleClick}
		>
			<div className="bg-zinc-800 p-6 rounded-md shadow-md">
				<h2 className="text-lg font-semibold mb-4 text-white">New Tier</h2>
				<form autoComplete="false" onSubmit={handleSubmit}>
					<div className="mb-4">
						<label
							htmlFor="tierLabel"
							className="block text-sm font-medium text-gray-300"
						>
							Tier Label
						</label>
						<input
							type="text"
							placeholder="Tier Label"
							id="tierLabel"
							className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-indigo-300 text-black"
							value={tierLabel}
							onChange={handleTierLabelChange}
						/>
					</div>
					<div className="mb-4">
						<label
							htmlFor="color"
							className="block text-sm font-medium text-gray-300"
						>
							Color
						</label>
						<div className="mt-1 w-full">
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
							/>
						</div>
					</div>
					<div className="flex justify-end">
						<button
							type="button"
							className="mr-2 px-4 py-2 text-gray-400 hover:text-gray-100"
							onClick={onClose}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
						>
							Create
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

