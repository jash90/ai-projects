import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { AdminStats, UserManagement, UserUsageStats, TokenLimitUpdate, AdminActivity } from '@/types'

interface AdminState {
  // Stats
  stats: AdminStats | null
  statsLoading: boolean
  
  // Users
  users: UserManagement[]
  usersLoading: boolean
  usersError: string | null
  usersPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // Token Limits
  globalTokenLimits: { global: number; monthly: number } | null
  tokenLimitsLoading: boolean
  
  // Activity Log
  activities: AdminActivity[]
  activitiesLoading: boolean
  activitiesPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // Filters
  usersFilter: {
    search: string
    role: 'user' | 'admin' | ''
    status: 'active' | 'inactive' | ''
  }
  
  activitiesFilter: {
    adminUserId: string
    actionType: string
  }
}

interface AdminActions {
  // Stats actions
  setStats: (stats: AdminStats) => void
  setStatsLoading: (loading: boolean) => void
  
  // Users actions
  setUsers: (users: UserManagement[]) => void
  setUsersLoading: (loading: boolean) => void
  setUsersError: (error: string | null) => void
  setUsersPagination: (pagination: Partial<AdminState['usersPagination']>) => void
  updateUser: (userId: string, updates: Partial<UserManagement>) => void
  
  // Token limits actions
  setGlobalTokenLimits: (limits: { global: number; monthly: number }) => void
  setTokenLimitsLoading: (loading: boolean) => void
  
  // Activity actions
  setActivities: (activities: AdminActivity[]) => void
  setActivitiesLoading: (loading: boolean) => void
  setActivitiesPagination: (pagination: Partial<AdminState['activitiesPagination']>) => void
  
  // Filter actions
  setUsersFilter: (filter: Partial<AdminState['usersFilter']>) => void
  setActivitiesFilter: (filter: Partial<AdminState['activitiesFilter']>) => void
  resetUsersFilter: () => void
  resetActivitiesFilter: () => void
  
  // Utility actions
  reset: () => void
}

type AdminStore = AdminState & AdminActions

const initialState: AdminState = {
  stats: null,
  statsLoading: false,
  
  users: [],
  usersLoading: false,
  usersError: null,
  usersPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  },
  
  globalTokenLimits: null,
  tokenLimitsLoading: false,
  
  activities: [],
  activitiesLoading: false,
  activitiesPagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  },
  
  usersFilter: {
    search: '',
    role: '',
    status: ''
  },
  
  activitiesFilter: {
    adminUserId: '',
    actionType: ''
  }
}

export const useAdminStore = create<AdminStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Stats actions
      setStats: (stats) => set({ stats }),
      setStatsLoading: (statsLoading) => set({ statsLoading }),

      // Users actions
      setUsers: (users) => set({ users }),
      setUsersLoading: (usersLoading) => set({ usersLoading }),
      setUsersError: (usersError) => set({ usersError }),
      setUsersPagination: (pagination) => set(state => ({
        usersPagination: { ...state.usersPagination, ...pagination }
      })),
      updateUser: (userId, updates) => set(state => ({
        users: state.users.map(user => 
          user.id === userId ? { ...user, ...updates } : user
        )
      })),

      // Token limits actions
      setGlobalTokenLimits: (globalTokenLimits) => set({ globalTokenLimits }),
      setTokenLimitsLoading: (tokenLimitsLoading) => set({ tokenLimitsLoading }),

      // Activity actions
      setActivities: (activities) => set({ activities }),
      setActivitiesLoading: (activitiesLoading) => set({ activitiesLoading }),
      setActivitiesPagination: (pagination) => set(state => ({
        activitiesPagination: { ...state.activitiesPagination, ...pagination }
      })),

      // Filter actions
      setUsersFilter: (filter) => set(state => ({
        usersFilter: { ...state.usersFilter, ...filter }
      })),
      setActivitiesFilter: (filter) => set(state => ({
        activitiesFilter: { ...state.activitiesFilter, ...filter }
      })),
      resetUsersFilter: () => set({
        usersFilter: { search: '', role: '', status: '' }
      }),
      resetActivitiesFilter: () => set({
        activitiesFilter: { adminUserId: '', actionType: '' }
      }),

      // Utility actions
      reset: () => set(initialState),
    }),
    { name: 'admin-store' }
  )
)

// Selectors
export const useAdminStats = () => useAdminStore(state => state.stats)
export const useAdminUsers = () => useAdminStore(state => state.users)
export const useAdminActivities = () => useAdminStore(state => state.activities)
export const useGlobalTokenLimits = () => useAdminStore(state => state.globalTokenLimits)
