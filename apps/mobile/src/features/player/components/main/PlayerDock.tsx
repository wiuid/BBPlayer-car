import { Show } from '@legendapp/state/react'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import IconButton from '@/components/common/IconButton'
import { MainPlaybackControls } from '@/features/player/components/controls/PlayerControlContent'
import { PlayerControls } from '@/features/player/components/controls/PlayerControls'
import useCurrentTrack from '@/hooks/player/useCurrentTrack'
import { playbackContextStore$ } from '@/hooks/stores/playbackContextStore'
import { usePlayerQueueSheetStore } from '@/hooks/stores/usePlayerQueueSheetStore'
import { resolveBilibiliImageUrl, resolveTrackCover } from '@/utils/imageUrl'

import { PlayerSlider } from './PlayerSlider'

export default function PlayerDock({ width }: { width: number }) {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const track = useCurrentTrack()
	const [height, setHeight] = useState(0)
	const compact = height < 440
	const minimal = height - insets.top - insets.bottom < 260
	const cover = track
		? resolveBilibiliImageUrl(
				resolveTrackCover(track.uniqueKey, track.coverUrl),
			)
		: null

	return (
		<View
			testID='persistent-player'
			onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
			style={[
				styles.dock,
				{
					width,
					paddingTop: insets.top + 8,
					paddingBottom: insets.bottom + 8,
					paddingRight: insets.right + 8,
					backgroundColor: colors.elevation.level1,
					borderLeftColor: colors.outlineVariant,
				},
			]}
		>
			{track ? (
				<Show if={playbackContextStore$.ready}>
					<View style={[styles.track, compact && styles.compactTrack]}>
						{(!compact || height >= 320) && (
							<Image
								source={cover ? { uri: cover } : undefined}
								contentFit='cover'
								style={[
									styles.cover,
									compact
										? styles.smallCover
										: {
												width: Math.min(
													width - insets.right - 40,
													Math.max(
														80,
														height - insets.top - insets.bottom - 310,
													),
												),
												aspectRatio: 1,
											},
								]}
							/>
						)}
						<View style={styles.trackText}>
							<Text
								variant='titleMedium'
								numberOfLines={minimal ? 1 : 2}
							>
								{track.title}
							</Text>
							<Text
								variant='bodySmall'
								numberOfLines={1}
								style={{ color: colors.onSurfaceVariant }}
							>
								{track.artist?.name}
							</Text>
						</View>
						<IconButton
							icon={minimal ? 'format-list-bulleted' : 'text-box-outline'}
							size={24}
							style={styles.detailsButton}
							accessibilityLabel={minimal ? '播放队列' : '查看歌词'}
							onPress={() => {
								if (minimal) {
									void usePlayerQueueSheetStore.getState().open()
								} else {
									router.navigate('/player')
								}
							}}
						/>
					</View>
					<View style={styles.controls}>
						{height - insets.top - insets.bottom >= 180 && <PlayerSlider />}
						{minimal ? (
							<MainPlaybackControls size='compact' />
						) : (
							<PlayerControls
								compact
								onOpenQueue={() => {
									void usePlayerQueueSheetStore.getState().open()
								}}
							/>
						)}
					</View>
				</Show>
			) : (
				<View style={styles.empty}>
					<Text
						variant='titleMedium'
						style={{ color: colors.onSurfaceVariant }}
					>
						暂无播放歌曲
					</Text>
				</View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	dock: {
		paddingLeft: 8,
		borderLeftWidth: StyleSheet.hairlineWidth,
		justifyContent: 'space-between',
	},
	track: {
		flex: 1,
		minHeight: 0,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		overflow: 'hidden',
	},
	compactTrack: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'flex-start',
		gap: 8,
	},
	cover: { borderRadius: 8, backgroundColor: '#777777' },
	smallCover: { width: 48, height: 48 },
	trackText: { flexShrink: 1, minWidth: 0 },
	detailsButton: { width: 48, height: 48, margin: 0 },
	controls: { flexShrink: 0 },
	empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
