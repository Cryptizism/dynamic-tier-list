import React from "react";
import "./index.css";
import TierList from "./components/TierList";
import ImageHolder from "./components/ImageHolder";
import { AddTierButton } from "./components/TierModal";
import { AddImageButton } from "./components/ImageModal";
import { StylingProvider } from "./context/StylingContext";
import { TierProvider } from "./context/TierContext";
import { ImageHolderProvider } from "./context/ImageHolderContext";

const App: React.FC = () => {
	return (
		<div className="p-8 min-h-[100vh] bg-stone-800">
			<StylingProvider>
				<TierProvider>
					<ImageHolderProvider>
						<TierList />
						<div className="my-4 flex gap-2">
							<AddTierButton />
							<AddImageButton />
						</div>
						<ImageHolder />
					</ImageHolderProvider>
				</TierProvider>
			</StylingProvider>
		</div>
	);
};

export default App;
