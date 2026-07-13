import React, { ReactNode } from "react";

interface SectionProps {
	title: string;
	description?: string;
	icon: ReactNode;
	children: ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, description, icon, children }) => (
	<div className="mb-3 rounded-lg border border-zinc-700/60 bg-zinc-900/40 p-4">
		<div className="mb-1 flex items-center gap-2">
			<span className="text-zinc-400">{icon}</span>
			<h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
		</div>
		{description && <p className="mb-3 text-xs font-light text-zinc-400">{description}</p>}
		<div className={description ? "" : "mt-3"}>{children}</div>
	</div>
);
