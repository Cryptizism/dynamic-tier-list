export const readBlobAsDataUrl = (blob: Blob): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (readerEvent) => {
			const result = readerEvent.target?.result;
			if (typeof result === "string") {
				resolve(result);
			} else {
				reject(new Error("Failed to read file as data URL"));
			}
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
};

export const isImageFile = (file: File): boolean => file.type.startsWith("image/");
