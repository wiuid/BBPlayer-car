import { describe, expect, it, jest, beforeEach } from '@jest/globals'
import { act, fireEvent, render } from '@testing-library/react-native'
import { BackHandler, Text } from 'react-native'

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
	usePathname: () => mockSegments.join('/'),
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
jest.mock('@/features/player/components/lyrics/PlayerLyrics', () => {
	const { View } =
		jest.requireActual<typeof import('react-native')>('react-native')
	return function MockLyrics() {
		return <View testID='lyrics' />
	}
})
jest.mock('@/features/player/components/main/PlayerDock', () => {
	const { useEffect } = jest.requireActual<typeof import('react')>('react')
	const { View, Pressable } =
		jest.requireActual<typeof import('react-native')>('react-native')
	return function MockDock({
		maximized,
		onToggleMaximized,
	}: {
		maximized: boolean
		onToggleMaximized: () => void
	}) {
		useEffect(() => {
			mockMount()
			return () => {
				mockUnmount()
			}
		}, [])
		return (
			<View testID='dock'>
				<Pressable
					accessibilityLabel={maximized ? 'Restore split' : 'Maximize'}
					onPress={onToggleMaximized}
				/>
			</View>
		)
	}
})

describe('player workspace navigation', () => {
	beforeEach(() => {
		jest.restoreAllMocks()
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
	it('switches to cover and lyrics without remounting the player or losing browsing content', async () => {
		const view = await render(
			<PlayerWorkspace>
				<Text>Playlist</Text>
			</PlayerWorkspace>,
		)
		await fireEvent.press(view.getByLabelText('Maximize'))
		expect(view.getByTestId('maximized-lyrics-pane')).toBeTruthy()
		expect(view.queryByText('Playlist')).toBeNull()
		expect(
			view.getByText('Playlist', { includeHiddenElements: true }),
		).toBeTruthy()
		await fireEvent.press(view.getByLabelText('Restore split'))
		expect(view.queryByTestId('maximized-lyrics-pane')).toBeNull()
		expect(view.getByText('Playlist')).toBeTruthy()
		expect(mockMount).toHaveBeenCalledTimes(1)
		expect(mockUnmount).not.toHaveBeenCalled()
	})
	it('clears maximized mode when rotating to portrait', async () => {
		const view = await render(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		await fireEvent.press(view.getByLabelText('Maximize'))
		mockWindow = { width: 390, height: 800 }
		await view.rerender(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		expect(view.queryByTestId('maximized-lyrics-pane')).toBeNull()
		mockWindow = { width: 800, height: 360 }
		await view.rerender(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		expect(view.getByLabelText('Maximize')).toBeTruthy()
		expect(view.getByText('Home')).toBeTruthy()
	})
	it('restores browsing when an action opens another route', async () => {
		const view = await render(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		await fireEvent.press(view.getByLabelText('Maximize'))
		mockSegments = ['comments', 'BV123']
		await view.rerender(
			<PlayerWorkspace>
				<Text>Comments</Text>
			</PlayerWorkspace>,
		)
		expect(view.queryByTestId('maximized-lyrics-pane')).toBeNull()
		expect(view.getByText('Comments')).toBeTruthy()
		expect(mockMount).toHaveBeenCalledTimes(1)
	})
	it('uses Android back to restore split mode', async () => {
		const addListener = jest.spyOn(BackHandler, 'addEventListener')
		const view = await render(
			<PlayerWorkspace>
				<Text>Home</Text>
			</PlayerWorkspace>,
		)
		await fireEvent.press(view.getByLabelText('Maximize'))
		await act(() => {
			expect(
				addListener.mock.calls.at(-1)?.[1]({
					type: 'hardwareBackPress',
					timeStamp: 0,
				}),
			).toBe(true)
		})
		expect(view.queryByTestId('maximized-lyrics-pane')).toBeNull()
		expect(view.getByText('Home')).toBeTruthy()
	})
})
