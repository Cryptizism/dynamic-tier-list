// src/components/TierList.tsx
import React, { useState } from 'react';
import Tier from './Tier';

const TierList = () => {
  const [tiers, setTiers] = useState([
    { color: 'red', name: 'S' },
    { color: 'orange', name: 'A' },
    { color: 'gold', name: 'B' },
    { color: 'yellow', name: 'C' },
    { color: 'green', name: 'D' },
  ]);

  return (
    <div className="flex flex-col gap-[2px] p-[2px] bg-black resize-x overflow-x-auto min-w-[8rem]">
      {tiers.map((tier, index) => (
        <Tier key={index} color={tier.color} name={tier.name} />
      ))}
    </div>
  );
};

export default TierList;
