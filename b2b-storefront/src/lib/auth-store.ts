import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AuthState {
  isAuthenticated: boolean
  customer: any | null
  companyId: string | null
  companyRole: "owner" | "admin" | "buyer" | "viewer" | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setCustomer: (customer: any) => void
  setCompany: (companyId: string, role: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      customer: null,
      companyId: null,
      companyRole: null,
      loading: false,
      login: async (email: string, password: string) => {
        set({ loading: true })
        try {
          const { login, sdk } = await import("./medusa")
          await login(email, password)
          const customer = await sdk.store.customer.retrieve()
          set({
            isAuthenticated: true,
            customer: customer,
            loading: false,
          })
        } catch (error) {
          set({ loading: false })
          throw error
        }
      },
      logout: () => {
        set({
          isAuthenticated: false,
          customer: null,
          companyId: null,
          companyRole: null,
        })
      },
      setCustomer: (customer) => set({ customer }),
      setCompany: (companyId, role) =>
        set({
          companyId,
          companyRole: role as AuthState["companyRole"],
        }),
    }),
    { name: "fenster-auth" }
  )
)