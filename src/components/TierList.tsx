import { useState, useContext } from "react";
import Tier from "./Tier";
import TierModal from "./TierModal";
import { ReactSortable } from "react-sortablejs";
import { TierContext } from "../App";

const TierList = () => {
	const { tiers, setTiers } = useContext(TierContext);

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
			<ReactSortable
				list={tiers}
				setList={setTiers}
				tag="div"
				className="flex flex-col gap-[2px] p-[2px] bg-black resize-x overflow-x-auto min-w-[8rem]"
				handle=".handle"
				id="tierlist"
			>
				{tiers.map((tier, index) => (
					<Tier
						key={index}
						color={tier.color}
						name={tier.id}
						onDelete={() => deleteTier(index)}
					/>
				))}
			</ReactSortable>
			<button onClick={openModal} className="ml-[2px] w-24 bg-green-300">
				+
			</button>
			<TierModal
				isOpen={isModalOpen}
				onClose={closeModal}
				onAddTier={addTier}
			/>
		</>
	);
};

export default TierList;
