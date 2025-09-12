import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = 'rent-manager-secret-key-2024'

export interface PersonaData {
  email: string
  persona: 'admin' | 'staff'
  loginName?: string // For staff accounts
  timestamp: number
}

export const encryptionUtils = {
  encrypt: (data: PersonaData): string => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString()
  },

  decrypt: (encryptedData: string): PersonaData | null => {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY)
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8)
      return JSON.parse(decryptedData)
    } catch (error) {
      console.error('Decryption failed:', error)
      return null
    }
  },

  generateStorageKey: (email: string): string => {
    return `rent_manager_persona_${CryptoJS.MD5(email).toString()}`
  }
}