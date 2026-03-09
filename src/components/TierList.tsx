import { useContext } from "react";
import Tier from "./Tier";
import { ReactSortable } from "react-sortablejs";
import { TierContext } from "../App";
import { deleteImageStore } from "../utils/imageStore";

const TierList = () => {
	const { tiers, setTiers } = useContext(TierContext);

	const deleteTier = (id: number) => {
		const updatedTiers = tiers.filter((tier) => tier.id !== id);
		deleteImageStore(`tierImages_${id}`).catch((error) => {
			console.error("Failed to delete tier images from IndexedDB:", error);
		});
		setTiers(updatedTiers);
	};

	return (
		<ReactSortable
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
