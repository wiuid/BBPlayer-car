import { createContext, useContext } from 'react'

export const WorkspaceLayoutContext = createContext(false)

export function useSplitWorkspace() {
	return useContext(WorkspaceLayoutContext)
}
