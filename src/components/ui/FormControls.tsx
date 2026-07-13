import React, { ReactNode } from "react";

export const textInputClass =
	"w-full rounded-md border border-zinc-600 bg-zinc-900 p-2 text-sm text-white placeholder:text-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40";

interface FieldLabelProps {
	icon?: ReactNode;
	htmlFor?: string;
	className?: string;
	children: ReactNode;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ icon, htmlFor, className = "", children }) => (
	<label
		htmlFor={htmlFor}
		className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400 ${className}`}
	>
		{icon}
		{children}
	</label>
);

interface SegmentedControlOption {
	id: string;
	value: string;
	label: string;
}

interface SegmentedControlProps {
	name: string;
	value: string;
	options: SegmentedControlOption[];
	onChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ name, value, options, onChange }) => (
	<div className="flex gap-1 rounded-lg border border-zinc-700 bg-zinc-900/60 p-1">
		{options.map((option) => (
			<label
				key={option.id}
				htmlFor={option.id}
				className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${
					value === option.value
						? "bg-indigo-600 text-white shadow-sm"
						: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
				}`}
			>
				<input
					type="radio"
					id={option.id}
					name={name}
					className="sr-only"
					checked={value === option.value}
					onChange={() => onChange(option.value)}
				/>
				{option.label}
			</label>
		))}
	</div>
);
