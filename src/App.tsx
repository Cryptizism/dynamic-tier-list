import React, { useState } from "react";
import './index.css';
import TierList from './components/TierList';
import ImageHolder from './components/ImageHolder';

interface styleState {
  style: string;
  setStyle: React.Dispatch<React.SetStateAction<string>>
}

export const StylingContext = React.createContext<styleState | null>(null);

const App = () => {
  const [style, setStyle] = useState("preserve");

  return (
    <div className="p-8 min-h-[100vh] bg-stone-800">
      <StylingContext.Provider value={{style, setStyle}}>
        <TierList />
        <ImageHolder />
      </StylingContext.Provider>
    </div>
  );
};

export default App;
