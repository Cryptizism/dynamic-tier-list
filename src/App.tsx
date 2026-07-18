import React from "react";
import "./index.css";
import TierList from "./components/TierList";
import ImageHolder from "./components/ImageHolder";
import { AddTierButton } from "./components/TierModal";
import { StylingProvider } from "./context/StylingContext";
import { TierProvider } from "./context/TierContext";

const App: React.FC = () => {
	return (
		<div className="p-8 min-h-[100vh] bg-stone-800">
			<StylingProvider>
				<TierProvider>
					<TierList />
					<AddTierButton />
					<ImageHolder />
				</TierProvider>
			</StylingProvider>
		</div>
	);
};

export default App;
