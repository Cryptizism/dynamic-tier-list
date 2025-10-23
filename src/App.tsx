import React, { useState, useEffect } from "react";
import './index.css';
import TierList from './components/TierList';
import ImageHolder from './components/ImageHolder';
import { AddTierButton } from "./components/TierModal";

interface Style {
  ratio: string;
  size: number;
}

interface StyleState {
  style: Style;
  setStyle: React.Dispatch<React.SetStateAction<Style>>;
}

interface Tier {
  id: number;
  color: string;
  tierLabel: string;
}

interface TierState {
  tiers: Tier[];
  setTiers: React.Dispatch<React.SetStateAction<Tier[]>>;
}

export const StylingContext = React.createContext<StyleState>({} as StyleState);
export const TierContext = React.createContext<TierState>({} as TierState);

const App = () => {
  const [style, setStyle] = useState<Style>(() => {
    const storedStyle = localStorage.getItem("style");
    if (storedStyle) {
      if (storedStyle.startsWith("{")) {
        return JSON.parse(storedStyle);
      } else {
        // MIGRATION: OLD STYLE FORMAT
        const ratio = storedStyle;
        return { ratio: ratio, size: 80 };
      }
    } else {
      return { ratio: "preserve", size: 80 };
    }
  });
  const [tiers, setTiers] = useState<Tier[]>(() => {
    const storedTiers = localStorage.getItem("tiers");

    if (storedTiers) {
      const parsedTiers: any[] = JSON.parse(storedTiers);

      // MIGRATION: ID USED TO REPRESENT TIER LABEL
      // IDENTIFIER USED COMBINATION OF COLOR AND LABEL
      // WE WILL MIMIC THE OLD BEHAVIOR FOR OLDER SAVES (OLD SAVES USE THIS FOR IMAGE LOOKUP)
      // FUTURE SAVES WILL USE NEW FORMAT OF DATE.NOW()
      // this is my first time writing migration code and writing comments about it :3
      // if you see this DM me I'm convinced nobody will ever read this
      const isOldFormat = parsedTiers.some(tier => !('tierLabel' in tier));
      if (isOldFormat) {
        return parsedTiers.map((tier, index) => ({
          color: tier.color,
          tierLabel: tier.id,
          id: `${tier.color}_${tier.id}`
        }));
      } else {
        return parsedTiers;
      }
    }

    return [
      { color: "#FF7F7F", tierLabel: "S", id: 1 },
      { color: "#FFBF7F", tierLabel: "A", id: 2 },
      { color: "#FFDF80", tierLabel: "B", id: 3 },
      { color: "#FFFF7F", tierLabel: "C", id: 4 },
      { color: "#BFFF7F", tierLabel: "D", id: 5 }
    ];
  });

  useEffect(() => {
    localStorage.setItem("tiers", JSON.stringify(tiers));
  }, [tiers]);

  useEffect(() => {
    localStorage.setItem("style", JSON.stringify(style));
  }, [style]);

  return (
    <div className="p-8 min-h-[100vh] bg-stone-800">
      <StylingContext.Provider value={{ style, setStyle }}>
        <TierContext.Provider value={{ tiers, setTiers }}>
          <TierList />
          <AddTierButton />
        </TierContext.Provider>
        <ImageHolder />
      </StylingContext.Provider>
    </div>
  );
};

export default App;
