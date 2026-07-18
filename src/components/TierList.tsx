import { ReactSortable } from "react-sortablejs";
import Tier from "./Tier";
import { useTiers } from "../context/TierContext";
import { ImageRepository, imageRepository } from "../persistence/ImageRepository";
import { Tier as TierModel } from "../types/domain";

const TierList = () => {
	const { tiers, setTiers } = useTiers();

	const deleteTier = (id: TierModel["id"]) => {
		const updatedTiers = tiers.filter((tier) => tier.id !== id);
		imageRepository.deleteList(ImageRepository.tierListKey(id)).catch((error) => {
			console.error("Failed to delete tier images from IndexedDB:", error);
		});
		setTiers(updatedTiers);
	};

	return (
		<ReactSortable
			scroll
			scrollSpeed={2}
			list={tiers}
			setList={setTiers}
			tag="div"
			className="flex flex-col gap-[2px] p-[2px] bg-black resize-x overflow-x-auto min-w-[8rem]"
			handle=".handle"
			id="tierlist"
		>
			{tiers.map((tier) => (
				<Tier
					key={tier.id}
					id={tier.id}
					color={tier.color}
					tierLabel={tier.tierLabel}
					onDelete={() => deleteTier(tier.id)}
				/>
			))}
		</ReactSortable>
	);
};

export default TierList;
