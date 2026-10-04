import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { Text } from 'react-native'

import PlayerWorkspace from './PlayerWorkspace'

let mockWindow = { width: 800, height: 360 }
let mockSegments = ['(tabs)', 'index']
const mockMount = jest.fn()
const mockUnmount = jest.fn()

jest.mock('react-native', () => {
	const native =
		jest.requireActual<typeof import('react-native')>('react-native')
	return Object.defineProperty(native, 'useWindowDimensions', {
		configurable: true,
		value: () => mockWindow,
	})
})
jest.mock('expo-router', () => ({
	useSegments: () => mockSegments,
	router: { navigate: jest.fn() },
}))
jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('react-native-paper', () => ({
	useTheme: () => ({
		colors: { background: '#ffffff', outlineVariant: '#cccccc' },
	}),
}))
jest.mock('@/components/common/IconButton', () => {
	const { View } =
		jest.requireActual<typeof import('react-native')>('react-native')
	return function MockIconButton() {
		return <View />
	}
})
jest.mock('@/features/player/components/main/PlayerDock', () => {
	const { useEffect } = jest.requireActual<typeof import('react')>('react')
	const { View } =
		jest.requireActual<typeof import('react-native')>('react-native')
	return function MockDock() {
		useEffect(() => {
			mockMount()
			return () => {
				mockUnmount()
			}
		}, [])
		return <View testID='dock' />
	}
})

describe('player workspace navigation', () => {
	beforeEach(() => {
		mockWindow = { width: 800, height: 360 }
		mockSegments = ['(tabs)', 'index']
		mockMount.mockClear()
		mockUnmount.mockClear()
	})
	it('keeps the same player mounted while browsing another page', async () => {
		const view = await render(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		expect(view.getByTestId('dock')).toBeTruthy()
		mockSegments = ['playlist', 'local']
		await view.rerender(
			<PlayerWorkspace>
				<Text>Playlist</Text>
			</PlayerWorkspace>,
		)
		expect(view.getByText('Playlist')).toBeTruthy()
		expect(mockMount).toHaveBeenCalledTimes(1)
		expect(mockUnmount).not.toHaveBeenCalled()
	})
	it('restores a single pane when the phone rotates to portrait', async () => {
		const view = await render(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		mockWindow = { width: 390, height: 800 }
		await view.rerender(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		expect(view.queryByTestId('dock')).toBeNull()
		expect(view.getByText('Home')).toBeTruthy()
	})
})
