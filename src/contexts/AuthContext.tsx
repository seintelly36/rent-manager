import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { usePersonaAuth } from '../hooks/usePersonaAuth'

interface AuthContextType {
  user: User | null
  persona: 'admin' | 'staff' | null
  loginName: string | null
  personaLoading: boolean
  isPersonaAuthenticated: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  validateAdminPassword: (password: string) => Promise<{ success: boolean; message: string }>
  validateStaffAccount: (loginName: string, password: string) => Promise<{ success: boolean; message: string }>
  setPersona: (persona: 'admin' | 'staff', loginName?: string) => void
  clearPersona: () => void
  switchPersona: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [personaState, personaActions] = usePersonaAuth(user?.email || null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // Clear persona data on sign out
    personaActions.clearPersona()
  }

  const value = {
    user,
    persona: personaState.persona,
    loginName: personaState.loginName,
    personaLoading: personaState.loading,
    isPersonaAuthenticated: personaState.isAuthenticated,
    loading,
    signIn,
    signUp,
    signOut,
    validateAdminPassword: personaActions.validateAdminPassword,
    validateStaffAccount: personaActions.validateStaffAccount,
    setPersona: personaActions.setPersona,
    clearPersona: personaActions.clearPersona,
    switchPersona: personaActions.switchPersona,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}