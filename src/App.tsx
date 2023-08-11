import React, { useState, useEffect } from "react";
import './index.css';
import TierList from './components/TierList';
import ImageHolder from './components/ImageHolder';

interface StyleState {
  style: string;
  setStyle: React.Dispatch<React.SetStateAction<string>>;
}

interface Tier {
  color: string;
  id: string;
}

interface TierState {
  tiers: Tier[];
  setTiers: React.Dispatch<React.SetStateAction<Tier[]>>;
}

export const StylingContext = React.createContext<StyleState>({} as StyleState);
export const TierContext = React.createContext<TierState>({} as TierState);

const App = () => {
  const [style, setStyle] = useState(() =>{
    const storedRatio = localStorage.getItem("ratio");
    return storedRatio ? storedRatio : "preserve";
  });
  const [tiers, setTiers] = useState<Tier[]>(() => {
    const storedTiers = localStorage.getItem("tiers");
    return storedTiers ? JSON.parse(storedTiers) : [
      { color: "#FF7F7F", id: "S" },
      { color: "#FFBF7F", id: "A" },
      { color: "#FFDF80", id: "B" },
      { color: "#FFFF7F", id: "C" },
      { color: "#BFFF7F", id: "D" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("tiers", JSON.stringify(tiers));
  }, [tiers]);

  useEffect(() => {
    localStorage.setItem("ratio", style);
  }, [style]);

  return (
    <div className="p-8 min-h-[100vh] bg-stone-800">
      <StylingContext.Provider value={{ style, setStyle }}>
        <TierContext.Provider value={{ tiers, setTiers }}>
          <TierList />
        </TierContext.Provider>
        <ImageHolder />
      </StylingContext.Provider>
    </div>
  );
};

export default App;
