import React, { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { imageRepository } from "../persistence/ImageRepository";
import { ImageStorageUsage } from "../types/domain";
import { Section } from "./ui/Section";

const MB = 1024 * 1024;

const STORAGE_LEVELS = [
	{ label: "Low", maxBytes: 50 * MB, barClass: "bg-green-500", textClass: "text-green-400" },
	{ label: "Moderate", maxBytes: 200 * MB, barClass: "bg-yellow-500", textClass: "text-yellow-400" },
	{ label: "High", maxBytes: 500 * MB, barClass: "bg-orange-500", textClass: "text-orange-400" },
	{ label: "Very High", maxBytes: 1024 * MB, barClass: "bg-red-500", textClass: "text-red-400" },
];

const getStorageLevel = (bytes: number) =>
	STORAGE_LEVELS.find((level) => bytes < level.maxBytes) ?? STORAGE_LEVELS[STORAGE_LEVELS.length - 1];

const getSegmentFillPercent = (bytes: number, segmentIndex: number): number => {
	const min = segmentIndex === 0 ? 0 : STORAGE_LEVELS[segmentIndex - 1].maxBytes;
	const max = STORAGE_LEVELS[segmentIndex].maxBytes;
	return Math.min(100, Math.max(0, ((bytes - min) / (max - min)) * 100));
};

const formatBytes = (bytes: number): string => {
	if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
	if (bytes < 1024 * MB) return `${(bytes / MB).toFixed(1)} MB`;
	return `${(bytes / (1024 * MB)).toFixed(2)} GB`;
};

const StorageUsageSection: React.FC = () => {
	const [usage, setUsage] = useState<ImageStorageUsage | null>(null);
	const [hasFailed, setHasFailed] = useState(false);

	useEffect(() => {
		let isMounted = true;

		imageRepository
			.getStorageUsage()
			.then((nextUsage) => {
				if (isMounted) setUsage(nextUsage);
			})
			.catch((error) => {
				console.error("Failed to read storage usage:", error);
				if (isMounted) setHasFailed(true);
			});

		return () => {
			isMounted = false;
		};
	}, []);

	const level = usage && getStorageLevel(usage.bytes);

	return (
		<Section title="Storage Usage" icon={<HardDrive className="h-4 w-4" />}>
			{!usage || !level ? (
				<p className="text-sm text-zinc-400">{hasFailed ? "Storage usage is unavailable." : "Calculating..."}</p>
			) : (
				<>
					<div className="mb-2 flex items-center justify-between gap-2 text-sm">
						<span className="text-zinc-200">
							{formatBytes(usage.bytes)}
							<span className="text-zinc-400">
								{" "}
								· {usage.imageCount} image{usage.imageCount === 1 ? "" : "s"}
							</span>
						</span>
						<span className={`font-medium ${level.textClass}`}>{level.label}</span>
					</div>
					<div className="flex gap-1">
						{STORAGE_LEVELS.map((storageLevel, index) => (
							<div key={storageLevel.label} className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-700">
								<div
									className={`h-full ${level.barClass}`}
									style={{ width: `${getSegmentFillPercent(usage.bytes, index)}%` }}
								/>
							</div>
						))}
					</div>
				</>
			)}
		</Section>
	);
};

export default StorageUsageSection;
