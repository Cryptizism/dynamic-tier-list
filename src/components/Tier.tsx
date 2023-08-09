// src/components/Tier.tsx
import React, { useState, useEffect } from 'react';
import { ReactSortable } from 'react-sortablejs';

const Tier = ({ color, name }: { color: string, name: string }) => {

    interface ImageItem {
        id: number;
        url: string;
      }

    const [images, setImages] = useState<ImageItem[]>([]);

    return (
        <div className='flex bg-[#1A1A17] gap-[2px]'>
            <div className={`w-24 min-h-[5rem] ${color} flex justify-center items-center`}>
                <p className='text-center' style={{ overflowWrap: 'anywhere' }}>{name}</p>
            </div>
            <ReactSortable
            list={images}
            setList={setImages}
            tag="div"
            group="shared"
            className="react-sortablejs flex space-x-[2px] flex-1">
                {images.map((image) => (
                    <img src={image.url} key={image.id} className="h-20 w-auto" alt={`Image ${image.id}`} />
                ))}
            </ReactSortable>
        </div>
    );
};

export default Tier;
