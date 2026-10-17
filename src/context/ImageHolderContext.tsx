import React, { createContext, useContext, useCallback, ReactNode } from "react";
import { useStyling } from "./StylingContext";
import { useResponsivePixelSize } from "../hooks/useResponsivePixelSize";
import { useImageList, UseImageListResult } from "../hooks/useImageList";
import { ImageRepository } from "../persistence/ImageRepository";
import { isImageFile, readBlobAsDataUrl } from "../services/imageFileReader";

export interface ImageHolderContextValue extends UseImageListResult {
	addImageFiles: (files: File[]) => void;
}

export const ImageHolderContext = createContext<ImageHolderContextValue>({} as ImageHolderContextValue);

export const ImageHolderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { style } = useStyling();
	const { pixelSize, isRefreshOnlyRef } = useResponsivePixelSize(style.size);

	const imageList = useImageList(
		ImageRepository.IMAGE_HOLDER_LIST_KEY,
		{ size: pixelSize, quality: style.quality, pasteScaleMode: style.pasteScaleMode },
		isRefreshOnlyRef,
	);
	const { addImage } = imageList;

	const addImageFiles = useCallback(
		(files: File[]) => {
			const time = Date.now();

			files.forEach((file, index) => {
				if (!isImageFile(file)) return;

				readBlobAsDataUrl(file)
					.then((dataUrl) => addImage(time + index, dataUrl))
					.catch((error) => {
						console.error("Failed to read image file:", error);
					});
			});
		},
		[addImage]
	);

	return (
		<ImageHolderContext.Provider value={{ ...imageList, addImageFiles }}>
			{children}
		</ImageHolderContext.Provider>
	);
};

export const useImageHolder = (): ImageHolderContextValue => useContext(ImageHolderContext);
