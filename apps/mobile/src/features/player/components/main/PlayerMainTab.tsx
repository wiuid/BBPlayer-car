import { Show } from '@legendapp/state/react'
import type { ImageRef } from 'expo-image'
import { useRouter } from 'expo-router'
import { memo, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PlayerControls } from '@/features/player/components/controls/PlayerControls'
import { getPlayerLayout } from '@/features/player/utils/layout'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { playbackContextStore$ } from '@/hooks/stores/playbackContextStore'
import { usePlayerQueueSheetStore } from '@/hooks/stores/usePlayerQueueSheetStore'
import * as Haptics from '@/utils/haptics'

import { PlayerSlider } from './PlayerSlider'
import { TrackInfo } from './PlayerTrackInfo'

interface PlayerMainTabProps {
	jumpTo: (key: string) => void
	imageRef: ImageRef | null
	onPresent: () => void
}

const PlayerMainTab = memo(function PlayerMainTab({
	jumpTo,
	imageRef,
	onPresent,
}: PlayerMainTabProps) {
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const currentTrack = useCurrentTrack()
	const window = useWindowDimensions()
	const [viewport, setViewport] = useState({ width: 0, height: 0 })
	const layout = getPlayerLayout(
		viewport.width || window.width,
		viewport.height || window.height,
	)
	const TrackInfoContainer = layout.isCompact ? ScrollView : View

	if (!currentTrack) return null
	return (
		<Show if={playbackContextStore$.ready}>
			<ScrollView
				style={styles.scrollView}
				onLayout={({ nativeEvent }) => {
					const { width, height } = nativeEvent.layout
					setViewport((previous) =>
						previous.width === width && previous.height === height
							? previous
							: { width, height },
					)
				}}
				contentContainerStyle={[
					styles.container,
					layout.isWide && styles.wideContainer,
				]}
				showsVerticalScrollIndicator={false}
			>
				<TrackInfoContainer
					style={
						layout.isWide
							? {
									width: layout.trackInfoWidth,
									flexGrow: 0,
									...(layout.isCompact
										? {
												maxHeight: Math.max(
													1,
													(viewport.height || window.height) - 16,
												),
											}
										: {}),
								}
							: undefined
					}
				>
					<TrackInfo
						rectCoverSize={layout.rectCoverSize}
						circleCoverSize={layout.circleCoverSize}
						onArtistPress={() =>
							currentTrack.artist?.remoteId
								? router.push({
										pathname: '/playlist/remote/uploader/[mid]',
										params: { mid: currentTrack.artist?.remoteId },
									})
								: void 0
						}
						onPressCover={() => {
							void Haptics.performHaptics(Haptics.AndroidHaptics.Context_Click)
							jumpTo('lyrics')
						}}
						coverRef={imageRef}
					/>
				</TrackInfoContainer>

				<View
					style={[
						{ paddingBottom: Math.max(insets.bottom + 20, 20) },
						styles.controlsContainer,
						layout.isWide && styles.wideControls,
						layout.isCompact && {
							paddingHorizontal: 12,
							paddingBottom: Math.max(insets.bottom, 8),
						},
					]}
				>
					<PlayerSlider />
					<PlayerControls
						compact={layout.isCompact}
						onOpenQueue={() => {
							onPresent()
							void usePlayerQueueSheetStore.getState().open()
						}}
					/>
				</View>
			</ScrollView>
		</Show>
	)
})

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
	},
	container: {
		flexGrow: 1,
		justifyContent: 'space-between',
	},
	controlsContainer: {
		paddingHorizontal: 24,
	},
	wideContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
	},
	wideControls: {
		flex: 1,
		minWidth: 0,
	},
})

PlayerMainTab.displayName = 'PlayerMainTab'
export default PlayerMainTab
