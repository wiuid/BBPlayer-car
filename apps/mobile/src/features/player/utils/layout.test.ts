import { describe, expect, it } from '@jest/globals'

import { getPlayerLayout } from './layout'

describe('player window layout', () => {
	it('keeps phone portrait and narrow split windows in a single column', () => {
		for (const [width, height] of [
			[390, 720],
			[800, 1100],
		]) {
			expect(getPlayerLayout(width, height).isWide).toBe(false)
		}
	})

	it('fits covers into short landscape windows and leaves room for controls', () => {
		for (const [width, height] of [
			[600, 280],
			[800, 360],
			[1280, 600],
		]) {
			const layout = getPlayerLayout(width, height)
			expect(layout.isWide).toBe(true)
			expect(layout.rectCoverSize + 140).toBeLessThanOrEqual(height)
			expect(layout.rectCoverSize + 80).toBeLessThanOrEqual(
				layout.trackInfoWidth,
			)
			expect(
				width - layout.trackInfoWidth - (layout.isCompact ? 24 : 48),
			).toBeGreaterThanOrEqual(264)
		}
	})

	it('uses compact landscape controls even in narrow phone windows', () => {
		for (const width of [480, 500, 600, 800]) {
			const layout = getPlayerLayout(width, 280)
			expect(layout.isCompact).toBe(true)
			expect(layout.isWide).toBe(true)
			expect(width - layout.trackInfoWidth - 24).toBeGreaterThanOrEqual(264)
		}
		expect(getPlayerLayout(1280, 600).isCompact).toBe(false)
		expect(getPlayerLayout(390, 720).isCompact).toBe(false)
	})

	it('recomputes layout for rotation and caps large tablet covers', () => {
		const portrait = getPlayerLayout(800, 1100)
		const landscape = getPlayerLayout(1100, 800)
		expect(portrait.rectCoverSize).toBe(480)
		expect(landscape.isWide).toBe(true)
		expect(landscape.rectCoverSize).toBeLessThan(portrait.rectCoverSize)
	})
})
