import React, { FormEvent, useContext, useState } from "react";
import { StylingContext } from "../App";
import { toBlob } from 'html-to-image';

interface ImageItem {
	id: number;
	url: string;
}

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>;
}

const SettingsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
    const { style, setStyle } = useContext(StylingContext);
	const [selectedAspectRatio, setSelectedAspectRatio] = useState(style);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onClose();

		if (!setStyle) return;
		setStyle(selectedAspectRatio);
	};

	const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
		const target = event.target as HTMLElement;
		if (target.id === "modal-bg") onClose();
	};

	const handleClearLocalStorage = () => {
		localStorage.clear();
		onClose();
		window.location.reload();
	};

    const handleCopyImage = async () => {
        const node = document.getElementById('tierlist');
        if (node) {
            try {
                const blob = await toBlob(node);
                const item = new ClipboardItem({ "image/png": blob as Blob });
                await navigator.clipboard.write([item]);
            } catch (error) {
                console.error('Failed to copy image: ', error);
            }
        }
    };

	if (!isOpen) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 dark:bg-opacity-70"
			id="modal-bg"
			onClick={handleClick}
		>
			<div className="bg-zinc-800 p-6 rounded-md shadow-md">
				<h2 className="text-lg font-semibold mb-4 text-white">
					Image Settings
				</h2>
				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<label
							htmlFor="aspect-ratio"
							className="block text-sm font-medium text-gray-300"
						>
							Aspect Ratio
						</label>
						<div className="flex items-center space-x-4 text-gray-300">
							<label htmlFor="preserve" className="flex items-center">
								<input
									type="radio"
									id="preserve"
									name="aspectRatio"
									value="preserve"
									className="mr-2"
									checked={selectedAspectRatio === "preserve"}
									onChange={() => setSelectedAspectRatio("preserve")}
								/>
								Preserve
							</label>
							<label htmlFor="fit" className="flex items-center">
								<input
									type="radio"
									id="fit"
									name="aspectRatio"
									value="fit"
									className="mr-2"
									checked={selectedAspectRatio === "fit"}
									onChange={() => setSelectedAspectRatio("fit")}
								/>
								1:1 Fit
							</label>
							<label htmlFor="stretch" className="flex items-center">
								<input
									type="radio"
									id="stretch"
									name="aspectRatio"
									value="stretch"
									className="mr-2"
									checked={selectedAspectRatio === "stretch"}
									onChange={() => setSelectedAspectRatio("stretch")}
								/>
								1:1 Stretch
							</label>
						</div>
					</div>
					<div className="my-4 flex flex-row gap-2">
						<button
							type="button"
							className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
							onClick={handleClearLocalStorage}
						>
							Clear Local Storage
						</button>
						<button
                            type="button"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            onClick={handleCopyImage}
                        >
                            Copy Image
                        </button>
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
							className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
						>
							Save
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default SettingsModal;
