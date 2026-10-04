export function getWorkspaceLayout(width: number, height: number) {
	const isSplit = width >= 600 && width > height
	const playerWidth = isSplit ? Math.min(420, Math.max(280, width * 0.4)) : 0
	return { isSplit, playerWidth, navigationWidth: isSplit ? 56 : 0 }
}
