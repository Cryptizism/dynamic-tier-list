import React, { useState, ChangeEvent, FormEvent } from "react";
import { SketchPicker } from "react-color";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAddTier: (color: string, name: string) => void;
}

const TierModal: React.FC<ModalProps> = ({ isOpen, onClose, onAddTier }) => {
	const [name, setName] = useState("");
	const [color, setColor] = useState("");

	const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
		setName(event.target.value);
	};

	const handleColorChange = (newColor: any) => {
		setColor(newColor.hex);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onAddTier(color, name);
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
							htmlFor="name"
							className="block text-sm font-medium text-gray-300"
						>
							Name
						</label>
						<input
							type="text"
							id="name"
							className="mt-1 p-2 w-full border rounded-md focus:ring focus:ring-indigo-300 text-black"
							value={name}
							onChange={handleNameChange}
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

export default TierModal;
