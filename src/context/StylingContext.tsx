import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Style } from "../types/domain";
import { readVersioned, writeVersioned } from "../persistence/versionedLocalStorage";
import { STYLE_STORAGE_VERSION } from "../config/dataVersions";

const STYLE_STORAGE_KEY = "style";

const DEFAULT_STYLE: Style = {
	ratio: "preserve",
	size: 80,
	quality: 100,
	pasteScaleMode: "preserve",
};

const normalizeStyle = (value: unknown): Style => {
	if (typeof value !== "object" || value === null) {
		return DEFAULT_STYLE;
	}

	const styleValue = value as Partial<Style>;

	return {
		ratio:
			styleValue.ratio === "preserve" || styleValue.ratio === "fit" || styleValue.ratio === "stretch"
				? styleValue.ratio
				: DEFAULT_STYLE.ratio,
		size: typeof styleValue.size === "number" ? styleValue.size : DEFAULT_STYLE.size,
		quality: typeof styleValue.quality === "number" ? styleValue.quality : DEFAULT_STYLE.quality,
		pasteScaleMode:
			styleValue.pasteScaleMode === "preserve" || styleValue.pasteScaleMode === "fixed"
				? styleValue.pasteScaleMode
				: DEFAULT_STYLE.pasteScaleMode,
	};
};

const readLegacyStyle = (): Style => {
	const raw = localStorage.getItem(STYLE_STORAGE_KEY);
	if (!raw) {
		return DEFAULT_STYLE;
	}

	try {
		return normalizeStyle(JSON.parse(raw));
	} catch {
		return normalizeStyle({ ratio: raw });
	}
};

const loadInitialStyle = (): Style => {
	const versioned = readVersioned<Style>(STYLE_STORAGE_KEY);
	return versioned ? normalizeStyle(versioned.data) : readLegacyStyle();
};

export interface StylingContextValue {
	style: Style;
	setStyle: React.Dispatch<React.SetStateAction<Style>>;
}

export const StylingContext = createContext<StylingContextValue>({} as StylingContextValue);

export const StylingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [style, setStyle] = useState<Style>(loadInitialStyle);

	useEffect(() => {
		writeVersioned(STYLE_STORAGE_KEY, STYLE_STORAGE_VERSION, style);
	}, [style]);

	return <StylingContext.Provider value={{ style, setStyle }}>{children}</StylingContext.Provider>;
};

export const useStyling = (): StylingContextValue => useContext(StylingContext);
