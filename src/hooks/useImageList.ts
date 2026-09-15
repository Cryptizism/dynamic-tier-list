import { useState, useEffect, useCallback, Dispatch, SetStateAction, MutableRefObject } from "react";
import { imageRepository } from "../persistence/ImageRepository";
import { buildDisplayItems, resizeImageDataUrl } from "../services/imageResizeService";
import { DisplayImageItem, ImageResizeOptions } from "../types/domain";

export interface UseImageListResult {
	images: DisplayImageItem[];
	setImages: Dispatch<SetStateAction<DisplayImageItem[]>>;
	addImage: (imageId: number, fullResolutionUrl: string) => Promise<void>;
	deleteImage: (imageId: number) => void;
	editImageText: (imageId: number, nextText: string) => void;
}

/*
Provides access to image "CRUD" features including text but not tier list order.
*/
export const useImageList = (
	listKey: string,
	resizeOptions: ImageResizeOptions,
	isRefreshOnlyRef: MutableRefObject<boolean>,
): UseImageListResult => {
	const { size, quality, pasteScaleMode } = resizeOptions;

	const [images, setImages] = useState<DisplayImageItem[]>([]);
	const [hasHydrated, setHasHydrated] = useState(false);

	useEffect(() => {
		let isMounted = true;

		const load = async () => {
			const ids = await imageRepository.getList(listKey);
			const records = await imageRepository.getRecords(ids);
			const displayItems = await buildDisplayItems(records, { size, quality, pasteScaleMode });

			if (isMounted) {
				isRefreshOnlyRef.current = false;
				setImages(displayItems);
				setHasHydrated(true);
			}
		};

		load();

		return () => {
			isMounted = false;
		};
	}, [listKey, size, quality, pasteScaleMode, isRefreshOnlyRef]);

	useEffect(() => {
		if (!hasHydrated) {
			return;
		}

		if (isRefreshOnlyRef.current) {
			isRefreshOnlyRef.current = false;
			return;
		}

		imageRepository.setList(listKey, images.map((image) => image.id)).catch((error) => {
			console.error(`Failed to persist image list "${listKey}":`, error);
		});
	}, [images, listKey, hasHydrated, isRefreshOnlyRef]);

	const addImage = useCallback(
		async (imageId: number, fullResolutionUrl: string) => {
			try {
				await imageRepository.putRecord({ id: imageId, url: fullResolutionUrl, text: "" });
			} catch (error) {
				console.error("Failed to save image data:", error);
			}

			const previewUrl = await resizeImageDataUrl(fullResolutionUrl, { size, quality, pasteScaleMode });
			setImages((prevImages) => [...prevImages, { id: imageId, url: previewUrl, text: "" }]);
		},
		[size, quality, pasteScaleMode],
	);

	const deleteImage = useCallback((imageId: number) => {
		imageRepository.deleteRecord(imageId).catch((error) => {
			console.error("Failed to delete image data:", error);
		});
		setImages((prevImages) => prevImages.filter((image) => image.id !== imageId));
	}, []);

	const editImageText = useCallback((imageId: number, nextText: string) => {
		imageRepository.updateRecordText(imageId, nextText).catch((error) => {
			console.error("Failed to update image text:", error);
		});
		setImages((prevImages) =>
			prevImages.map((image) => (image.id === imageId ? { ...image, text: nextText } : image)),
		);
	}, []);

	return { images, setImages, addImage, deleteImage, editImageText };
};
