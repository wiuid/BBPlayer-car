import { router, useSegments } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import IconButton from '@/components/common/IconButton'
import PlayerDock from '@/features/player/components/main/PlayerDock'
import { getWorkspaceLayout } from '@/features/player/utils/workspace'
import { WorkspaceLayoutContext } from '@/hooks/ui/useWorkspaceLayout'

export default function PlayerWorkspace({ children }: { children: ReactNode }) {
	const window = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const { colors } = useTheme()
	const segments = useSegments()
	const layout = getWorkspaceLayout(
		window.width - insets.left - insets.right,
		window.height,
	)
	const isSplit = layout.isSplit && segments[0] !== 'onboarding'
	const active = segments.at(1)

	return (
		<WorkspaceLayoutContext.Provider value={isSplit}>
			<View style={[styles.workspace, { backgroundColor: colors.background }]}>
				{isSplit && (
					<View
						style={[
							styles.navigation,
							{
								paddingTop: insets.top,
								paddingLeft: insets.left,
								width: 56 + insets.left,
								borderRightColor: colors.outlineVariant,
							},
						]}
					>
						<IconButton
							icon='home'
							size={28}
							style={styles.navigationButton}
							accessibilityLabel='主页'
							iconColor={
								active === 'index' ? colors.primary : colors.onSurfaceVariant
							}
							onPress={() => router.navigate('/(tabs)')}
						/>
						<IconButton
							icon='bookshelf'
							size={28}
							style={styles.navigationButton}
							accessibilityLabel='音乐库'
							iconColor={
								active === 'library' ? colors.primary : colors.onSurfaceVariant
							}
							onPress={() =>
								router.navigate({
									pathname: '/(tabs)/library/[tab]',
									params: { tab: '0' },
								})
							}
						/>
						<IconButton
							icon='cog'
							size={28}
							style={styles.navigationButton}
							accessibilityLabel='设置'
							iconColor={
								active === 'settings' ? colors.primary : colors.onSurfaceVariant
							}
							onPress={() => router.navigate('/(tabs)/settings')}
						/>
					</View>
				)}
				<View style={styles.content}>{children}</View>
				{isSplit && <PlayerDock width={layout.playerWidth + insets.right} />}
			</View>
		</WorkspaceLayoutContext.Provider>
	)
}

const styles = StyleSheet.create({
	workspace: { flex: 1, flexDirection: 'row' },
	content: { flex: 1, minWidth: 0, overflow: 'hidden' },
	navigation: {
		borderRightWidth: StyleSheet.hairlineWidth,
		alignItems: 'center',
		gap: 8,
	},
	navigationButton: { width: 48, height: 48, margin: 0 },
})
