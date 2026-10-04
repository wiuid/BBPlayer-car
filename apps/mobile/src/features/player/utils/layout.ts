export function getPlayerLayout(width: number, height: number) {
	const isCompact = width > height && height < 450
	const isWide = width >= 480 && width > height
	const trackInfoWidth = isWide ? Math.min(width * 0.42, width - 288) : width
	const coverLimit = isCompact
		? Math.max(48, height - 160)
		: isWide
			? Math.max(80, height - 140)
			: 480

	return {
		isWide,
		isCompact,
		trackInfoWidth,
		rectCoverSize: Math.max(1, Math.min(trackInfoWidth - 80, coverLimit)),
		circleCoverSize: Math.max(1, Math.min(trackInfoWidth - 120, coverLimit)),
	}
}
