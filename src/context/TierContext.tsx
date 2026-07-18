import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Tier } from "../types/domain";
import { readVersioned, writeVersioned } from "../persistence/versionedLocalStorage";
import { TIER_STORAGE_VERSION } from "../config/dataVersions";

const TIER_STORAGE_KEY = "tiers";

const DEFAULT_TIERS: Tier[] = [
	{ color: "#FF7F7F", tierLabel: "S", id: 1 },
	{ color: "#FFBF7F", tierLabel: "A", id: 2 },
	{ color: "#FFDF80", tierLabel: "B", id: 3 },
	{ color: "#FFFF7F", tierLabel: "C", id: 4 },
	{ color: "#BFFF7F", tierLabel: "D", id: 5 },
];

interface LegacyTierShape {
	id: number | string;
	color: string;
	tierLabel?: string;
}

// Checks if it's poopy old legacy and updates
const migrateLegacyTierShape = (tiers: LegacyTierShape[]): Tier[] => {
	const isAncientFormat = tiers.some((tier) => !("tierLabel" in tier));
	if (!isAncientFormat) {
		return tiers as Tier[];
	}

	return tiers.map((tier) => ({
		color: tier.color,
		tierLabel: String(tier.id),
		id: `${tier.color}_${tier.id}`,
	})) as unknown as Tier[];
};

const readLegacyTiers = (): Tier[] | null => {
	const raw = localStorage.getItem(TIER_STORAGE_KEY);
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? migrateLegacyTierShape(parsed) : null;
	} catch {
		return null;
	}
};

const loadInitialTiers = (): Tier[] => {
	const versioned = readVersioned<Tier[]>(TIER_STORAGE_KEY);
	if (versioned) {
		return versioned.data;
	}

	return readLegacyTiers() ?? DEFAULT_TIERS;
};

export interface TierContextValue {
	tiers: Tier[];
	setTiers: React.Dispatch<React.SetStateAction<Tier[]>>;
}

export const TierContext = createContext<TierContextValue>({} as TierContextValue);

export const TierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [tiers, setTiers] = useState<Tier[]>(loadInitialTiers);

	useEffect(() => {
		writeVersioned(TIER_STORAGE_KEY, TIER_STORAGE_VERSION, tiers);
	}, [tiers]);

	return <TierContext.Provider value={{ tiers, setTiers }}>{children}</TierContext.Provider>;
};

export const useTiers = (): TierContextValue => useContext(TierContext);
