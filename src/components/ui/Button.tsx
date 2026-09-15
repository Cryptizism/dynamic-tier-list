import React, { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "info" | "warning" | "accent";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
	success: "bg-green-600 text-white shadow-sm hover:bg-green-700",
	info: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
	warning: "bg-amber-600 text-white shadow-sm hover:bg-amber-700",
	accent: "bg-violet-600 text-white shadow-sm hover:bg-violet-700",
	danger: "border border-red-500/40 text-red-400 hover:bg-red-500/10",
	ghost: "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
	secondary: "bg-zinc-700 text-zinc-200 hover:bg-zinc-600",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	icon?: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
	variant = "secondary",
	icon,
	className = "",
	type = "button",
	children,
	...rest
}) => (
	<button
		type={type}
		className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
		{...rest}
	>
		{icon}
		{children}
	</button>
);
