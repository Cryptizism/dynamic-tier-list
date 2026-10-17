import { useState, useCallback } from "react";

interface LocalFontData {
	family: string;
	fullName: string;
	postscriptName: string;
	style: string;
}

declare global {
	interface Window {
		queryLocalFonts?: () => Promise<LocalFontData[]>;
	}
}

export interface UseLocalFontsResult {
	localFonts: string[];
	isSupported: boolean;
	isLoading: boolean;
	error: string | null;
	loadLocalFonts: () => Promise<void>;
}

export const useLocalFonts = (): UseLocalFontsResult => {
	const [localFonts, setLocalFonts] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isSupported = typeof window.queryLocalFonts === "function";

	const loadLocalFonts = useCallback(async () => {
		if (!window.queryLocalFonts) {
			setError("Your browser doesn't support reading local fonts");
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			const fonts = await window.queryLocalFonts();
			const families = Array.from(new Set(fonts.map((font) => font.family))).sort((a, b) => a.localeCompare(b));
			setLocalFonts(families);
			if (families.length === 0) {
				setError("No local fonts found, permission may have been denied");
			}
		} catch (loadError) {
			console.error("Failed to query local fonts:", loadError);
			setError("Couldn't access local fonts, permission may have been denied");
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { localFonts, isSupported, isLoading, error, loadLocalFonts };
};
