import { useState, useEffect, useCallback, useRef, MutableRefObject } from "react";

export interface ResponsivePixelSize {
	pixelSize: number;
	isRefreshOnlyRef: MutableRefObject<boolean>;
}

export const useResponsivePixelSize = (baseSize: number): ResponsivePixelSize => {
	const getPixelSize = useCallback(
		() => Math.max(1, Math.round(baseSize * (window.devicePixelRatio || 1))),
		[baseSize],
	);

	const [pixelSize, setPixelSize] = useState<number>(getPixelSize);
	const isRefreshOnlyRef = useRef(false);

	useEffect(() => {
		let debounceHandle: number | undefined;

		const scheduleRefresh = () => {
			if (debounceHandle !== undefined) {
				window.clearTimeout(debounceHandle);
			}

			debounceHandle = window.setTimeout(() => {
				setPixelSize((currentValue) => {
					const nextValue = getPixelSize();
					if (currentValue === nextValue) {
						isRefreshOnlyRef.current = false;
						return currentValue;
					}
					isRefreshOnlyRef.current = true;
					return nextValue;
				});
			}, 150);
		};

		setPixelSize(getPixelSize());
		window.addEventListener("resize", scheduleRefresh);
		window.addEventListener("scroll", scheduleRefresh, { passive: true });
		window.visualViewport?.addEventListener("resize", scheduleRefresh);
		window.visualViewport?.addEventListener("scroll", scheduleRefresh, { passive: true });

		return () => {
			if (debounceHandle !== undefined) {
				window.clearTimeout(debounceHandle);
			}

			window.removeEventListener("resize", scheduleRefresh);
			window.removeEventListener("scroll", scheduleRefresh);
			window.visualViewport?.removeEventListener("resize", scheduleRefresh);
			window.visualViewport?.removeEventListener("scroll", scheduleRefresh);
		};
	}, [getPixelSize]);

	return { pixelSize, isRefreshOnlyRef };
};
