// src/App.tsx
import React from 'react';
import './index.css';
import TierList from './components/TierList';
import ImageHolder from './components/ImageHolder';

const App = () => {
  return (
    <div className="p-8 min-h-[100vh] bg-stone-800">
      <TierList />
      <ImageHolder />
    </div>
  );
};

export default App;
