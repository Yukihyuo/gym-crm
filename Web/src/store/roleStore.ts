import { create } from "zustand"

interface RoleState {
  /** `null` = aún sin resolver; `true` = rol "Super Admin". */
  isSuperAdmin: boolean | null
  setIsSuperAdmin: (value: boolean) => void
}

export const useRoleStore = create<RoleState>((set) => ({
  isSuperAdmin: null,
  setIsSuperAdmin: (isSuperAdmin) => set({ isSuperAdmin }),
}))
