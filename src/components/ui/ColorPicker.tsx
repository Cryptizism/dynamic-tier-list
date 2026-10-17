import React from "react";
import { SketchPicker, ColorResult } from "react-color";

export const TIER_PRESET_COLORS = ["#FF7F7F", "#FFBF7F", "#FFDF80", "#FFFF7F", "#BFFF7F", "#7FFF7F"];

interface ColorPickerProps {
	color: string;
	onChange: (color: string) => void;
	presetColors?: string[];
	disableAlpha?: boolean;
}

const toCssColor = ({ hex, rgb }: ColorResult): string => rgb.a === undefined || rgb.a === 1 ? hex : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;

export const ColorPicker: React.FC<ColorPickerProps> = ({
	color,
	onChange,
	presetColors = TIER_PRESET_COLORS,
	disableAlpha = true,
}) => (
	<SketchPicker
		className="color-picker"
		color={color}
		onChange={(result) => onChange(disableAlpha ? result.hex : toCssColor(result))}
		disableAlpha={disableAlpha}
		presetColors={presetColors}
		styles={{
			default: {
				picker: {
					background: "#18181b",
					border: "1px solid #3f3f46",
					boxShadow: "none",
					borderRadius: "0.5rem",
					width: "auto",
				},
			},
		}}
	/>
);
