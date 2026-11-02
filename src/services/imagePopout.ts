const POPOUT_CLOSED_POLL_MS = 1000;

export const openImagePopout = async (imageUrl: string): Promise<void> => {
	const blob = await (await fetch(imageUrl)).blob();
	const bitmap = await createImageBitmap(blob);
	const width = Math.min(bitmap.width, window.screen.availWidth);
	const height = Math.min(bitmap.height, window.screen.availHeight);
	bitmap.close();

	const blobUrl = URL.createObjectURL(blob);
	const popup = window.open(blobUrl, "_blank", `popup,width=${width},height=${height}`);
	if (!popup) {
		URL.revokeObjectURL(blobUrl);
		throw new Error("Popup was blocked by the browser");
	}

	popup.opener = null;

	const closedPoll = window.setInterval(() => {
		if (popup.closed) {
			window.clearInterval(closedPoll);
			URL.revokeObjectURL(blobUrl);
		}
	}, POPOUT_CLOSED_POLL_MS);
};
