import React, { useState } from 'react';
import { ReactSortable } from 'react-sortablejs';
import Tier from './Tier';
import Modal from './Modal';

const TierList = () => {
  const [tiers, setTiers] = useState([
    { color: '#FF7F7F', id: 'S' },
    { color: '#FFBF7F', id: 'A' },
    { color: '#FFDF80', id: 'B' },
    { color: '#FFFF7F', id: 'C' },
    { color: '#BFFF7F', id: 'D' },
  ]);

  const addTier = (color: string, id: string) => {
    const newTier = { color, id };
    setTiers((prevTiers) => [...prevTiers, newTier]);
  };

  const deleteTier = (index: number) => {
    const updatedTiers = tiers.filter((_, i) => i !== index);
    setTiers(updatedTiers);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <ReactSortable list={tiers} setList={setTiers} className='flex flex-col gap-[2px] p-[2px] bg-black resize-x overflow-x-auto min-w-[8rem]' delay={10}>
        {tiers.map((tier, index) => (
            <Tier
              key={index}
              color={tier.color}
              id={tier.id}
              onDelete={() => deleteTier(index)}
            />
          ))}
      </ReactSortable>
      <button onClick={openModal} className='ml-[2px] w-24 bg-green-300'>+</button>
      <Modal isOpen={isModalOpen} onClose={closeModal} onAddTier={addTier} />
    </>
  );
};

export default TierList;
