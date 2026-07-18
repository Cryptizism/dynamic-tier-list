import React, { ReactNode, useRef, useState } from "react";

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
	hoverElement?: ReactNode;
}

interface SegmentedControlProps {
	name: string;
	value: string;
	options: SegmentedControlOption[];
	onChange: (value: string) => void;
}

const HOVER_DEBOUNCE_MS = 100;

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

export const SegmentedControlWithHover: React.FC<SegmentedControlProps> = ({ name, value, options, onChange }) => {
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const hoverTimeoutRef = useRef<number | undefined>(undefined);

	const handleMouseEnter = (id: string) => {
		window.clearTimeout(hoverTimeoutRef.current);
		hoverTimeoutRef.current = window.setTimeout(() => setHoveredId(id), HOVER_DEBOUNCE_MS);
	};

	const handleMouseLeave = () => {
		window.clearTimeout(hoverTimeoutRef.current);
		hoverTimeoutRef.current = window.setTimeout(() => setHoveredId(null), HOVER_DEBOUNCE_MS);
	};

	const hoveredOption = options.find((option) => option.id === hoveredId);

	return (
		<div className="relative flex gap-1 rounded-lg border border-zinc-700 bg-zinc-900/60 p-1">
			{options.map((option) => (
				<label
					key={option.id}
					htmlFor={option.id}
					className={`flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors ${
						value === option.value
							? "bg-indigo-600 text-white shadow-sm"
							: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
					}`}
					onMouseEnter={() => handleMouseEnter(option.id)}
					onMouseLeave={handleMouseLeave}
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
			{hoveredOption?.hoverElement && (
				<div className="absolute left-0 top-full z-10 mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800/80 backdrop-blur-[2px] shadow-black/80 shadow-2xl p-1">
					<div className="mb-1 text-center text-lg font-semibold text-zinc-400">
						{hoveredOption.label}
					</div>
					{hoveredOption.hoverElement}
				</div>
			)}
		</div>
	);
};