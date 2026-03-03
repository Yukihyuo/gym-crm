import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClientProfile {
	names?: string
	lastNames?: string
	phone?: string
}

interface ClientUser {
	id: string
	username: string
	email: string
	profile?: ClientProfile
	brandId?: string
	storeId?: string
}

interface ClientAccess {
	brandId?: string
	storeId?: string
}

interface UserStoreState {
	token: string | null
	user: ClientUser | null
	access: ClientAccess | null
	isAuthenticated: boolean
	setSession: (params: { token: string; user: ClientUser; access?: ClientAccess }) => void
	clearSession: () => void
}

export const useUserStore = create<UserStoreState>()(
	persist(
		(set) => ({
			token: null,
			user: null,
			access: null,
			isAuthenticated: false,

			setSession: ({ token, user, access }) =>
				set({
					token,
					user,
					access: access || { brandId: user.brandId, storeId: user.storeId },
					isAuthenticated: true,
				}),

			clearSession: () =>
				set({
					token: null,
					user: null,
					access: null,
					isAuthenticated: false,
				}),
		}),
		{
			name: 'client-user-session',
		}
	)
)
