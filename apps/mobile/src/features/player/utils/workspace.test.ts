import { describe, expect, it } from '@jest/globals'

import { getWorkspaceLayout } from './workspace'

describe('persistent player workspace', () => {
	it('keeps portrait and narrow windows in a single pane', () => {
		for (const [width, height] of [
			[390, 800],
			[800, 1100],
			[599, 300],
		]) {
			expect(getWorkspaceLayout(width, height).isSplit).toBe(false)
		}
	})
	it('reserves usable space for both panes and the navigation rail', () => {
		for (const [width, height] of [
			[600, 280],
			[780, 360],
			[1024, 768],
			[1920, 720],
		]) {
			const layout = getWorkspaceLayout(width, height)
			expect(layout.isSplit).toBe(true)
			expect(layout.playerWidth).toBeGreaterThanOrEqual(280)
			expect(layout.playerWidth).toBeLessThanOrEqual(420)
			expect(
				width - layout.playerWidth - layout.navigationWidth,
			).toBeGreaterThanOrEqual(264)
		}
	})
	it('keeps the player width stable when the landscape keyboard opens', () => {
		expect(getWorkspaceLayout(800, 180)).toEqual(getWorkspaceLayout(800, 360))
	})
})
