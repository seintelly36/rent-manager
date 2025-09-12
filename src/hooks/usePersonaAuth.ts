import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { encryptionUtils, PersonaData } from '../lib/encryption'

interface PersonaAuthState {
  isAuthenticated: boolean
  persona: 'admin' | 'staff' | null
  email: string | null
  loginName: string | null
  loading: boolean
}

interface PersonaAuthActions {
  validateAdminPassword: (password: string) => Promise<{ success: boolean; message: string }>
  validateStaffAccount: (loginName: string, password: string) => Promise<{ success: boolean; message: string }>
  setPersona: (persona: 'admin' | 'staff', loginName?: string) => void
  clearPersona: () => void
  switchPersona: () => void
}

export function usePersonaAuth(userEmail: string | null): [PersonaAuthState, PersonaAuthActions] {
  const [state, setState] = useState<PersonaAuthState>({
    isAuthenticated: false,
    persona: null,
    email: null,
    loginName: null,
    loading: true
  })

  // Load persona from localStorage on mount
  useEffect(() => {
    if (!userEmail) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    const storageKey = encryptionUtils.generateStorageKey(userEmail)
    const encryptedData = localStorage.getItem(storageKey)

    if (encryptedData) {
      const personaData = encryptionUtils.decrypt(encryptedData)
      if (personaData && personaData.email === userEmail) {
        setState({
          isAuthenticated: true,
          persona: personaData.persona,
          email: personaData.email,
          loginName: personaData.loginName || null,
          loading: false
        })
        return
      }
    }

    setState(prev => ({ ...prev, email: userEmail, loading: false }))
  }, [userEmail])

  const validateAdminPassword = useCallback(async (password: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_rent_manager_admin_password', {
        p_account_password: password
      })

      if (error) throw error

      return {
        success: data?.[0]?.success || false,
        message: data?.[0]?.message || 'Validation failed'
      }
    } catch (error) {
      console.error('Admin validation error:', error)
      return {
        success: false,
        message: 'An error occurred during validation'
      }
    }
  }, [])

  const validateStaffAccount = useCallback(async (loginName: string, password: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_rent_manager_staff_account', {
        p_login_name: loginName,
        p_login_password: password
      })

      if (error) throw error

      return {
        success: data?.[0]?.success || false,
        message: data?.[0]?.message || 'Validation failed'
      }
    } catch (error) {
      console.error('Staff validation error:', error)
      return {
        success: false,
        message: 'An error occurred during validation'
      }
    }
  }, [])

  const setPersona = useCallback((persona: 'admin' | 'staff', loginName?: string) => {
    if (!userEmail) return

    const personaData: PersonaData = {
      email: userEmail,
      persona,
      loginName,
      timestamp: Date.now()
    }

    const encryptedData = encryptionUtils.encrypt(personaData)
    const storageKey = encryptionUtils.generateStorageKey(userEmail)
    
    localStorage.setItem(storageKey, encryptedData)

    setState({
      isAuthenticated: true,
      persona,
      email: userEmail,
      loginName: loginName || null,
      loading: false
    })
  }, [userEmail])

  const clearPersona = useCallback(() => {
    if (!userEmail) return

    const storageKey = encryptionUtils.generateStorageKey(userEmail)
    localStorage.removeItem(storageKey)

    setState({
      isAuthenticated: false,
      persona: null,
      email: userEmail,
      loginName: null,
      loading: false
    })
  }, [userEmail])

  const switchPersona = useCallback(() => {
    clearPersona()
  }, [clearPersona])

  return [
    state,
    {
      validateAdminPassword,
      validateStaffAccount,
      setPersona,
      clearPersona,
      switchPersona
    }
  ]
}