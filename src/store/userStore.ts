import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabaseClient'
import { User, Profile } from '@/types'

interface UserState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  error: string | null
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  login: (lineUserId: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  checkAdmin: () => boolean
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: false,
      error: null,
      
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      login: async (lineUserId: string, displayName: string) => {
        set({ isLoading: true, error: null })
        
        try {
          // Check if user exists in profiles
          const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('line_user_id', lineUserId)
            .single()
          
          if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError
          }
          
          if (existingProfile) {
            // Update last login
            await supabase
              .from('profiles')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', existingProfile.id)
            
            set({ 
              profile: existingProfile,
              user: { id: existingProfile.id, line_user_id: lineUserId }
            })
          } else {
            // Create new profile
            const newProfile = {
              line_user_id: lineUserId,
              display_name: displayName,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
            
            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert(newProfile)
              .select()
              .single()
            
            if (createError) throw createError
            
            set({ 
              profile: createdProfile,
              user: { id: createdProfile.id, line_user_id: lineUserId }
            })
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Login failed' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      logout: async () => {
        try {
          await supabase.auth.signOut()
          set({ user: null, profile: null, error: null })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Logout failed' })
        }
      },
      
      updateProfile: async (updates: Partial<Profile>) => {
        const { profile } = get()
        if (!profile) throw new Error('No profile to update')
        
        set({ isLoading: true, error: null })
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .update({
              ...updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id)
            .select()
            .single()
          
          if (error) throw error
          
          set({ profile: data })
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Update failed' })
          throw error
        } finally {
          set({ isLoading: false })
        }
      },
      
      checkAdmin: () => {
        const { profile } = get()
        return profile?.is_admin || false
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ 
        user: state.user,
        profile: state.profile 
      }),
    }
  )
)
