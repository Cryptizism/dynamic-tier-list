import React, { ChangeEvent, forwardRef } from "react";

interface ImageFileInputProps {
	onFiles: (files: File[]) => void;
}

export const ImageFileInput = forwardRef<HTMLInputElement, ImageFileInputProps>(({ onFiles }, ref) => {
	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (event.target.files && event.target.files.length > 0) {
			onFiles(Array.from(event.target.files));
		}
		event.target.value = "";
	};

	return (
		<input
			ref={ref}
			type="file"
			accept="image/*"
			multiple
			className="hidden"
			onClick={(event) => event.stopPropagation()}
			onChange={handleChange}
		/>
	);
});

ImageFileInput.displayName = "ImageFileInput";
