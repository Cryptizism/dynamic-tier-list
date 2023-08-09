// src/App.tsx
import React, {useState} from 'react';
import './index.css';
import TierList from './components/TierList';
import ImageHolder from './components/ImageHolder';
import Modal from './components/Modal';

const App = () => {
  const [modalOpen, setModalOpen] = useState(true);

  const openModal = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  return (
    <div className="p-8 min-h-[100vh] bg-stone-800">
      <TierList />
      <ImageHolder />
    </div>
  );
};

export default App;
