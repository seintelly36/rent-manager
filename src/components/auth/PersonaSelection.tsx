import React, { useState } from 'react'
import { Shield, Users, Lock, User, Eye, EyeOff } from 'lucide-react'

interface PersonaSelectionProps {
  email: string
  onAdminSelect: (password: string) => Promise<{ success: boolean; message: string }>
  onStaffSelect: (loginName: string, password: string) => Promise<{ success: boolean; message: string }>
  onPersonaSet: (persona: 'admin' | 'staff', loginName?: string) => void
  onBack: () => void
}

export function PersonaSelection({ 
  email, 
  onAdminSelect, 
  onStaffSelect, 
  onPersonaSet, 
  onBack 
}: PersonaSelectionProps) {
  const [selectedPersona, setSelectedPersona] = useState<'admin' | 'staff' | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [staffLoginName, setStaffLoginName] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await onAdminSelect(adminPassword)
      if (result.success) {
        onPersonaSet('admin')
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await onStaffSelect(staffLoginName, staffPassword)
      if (result.success) {
        onPersonaSet('staff', staffLoginName)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedPersona(null)
    setAdminPassword('')
    setStaffLoginName('')
    setStaffPassword('')
    setError('')
    setShowPassword(false)
  }

  if (!selectedPersona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Select Your Role</h1>
            <p className="text-gray-600 mt-2">
              Choose your access level for RentManager
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Signed in as: {email}
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setSelectedPersona('admin')}
              className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Administrator</h3>
                  <p className="text-sm text-gray-600">Full system access and management</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedPersona('staff')}
              className="w-full p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Staff Member</h3>
                  <p className="text-sm text-gray-600">Limited access for daily operations</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
            >
              Back to Account Selection
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            selectedPersona === 'admin' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {selectedPersona === 'admin' ? (
              <Shield className="w-8 h-8 text-white" />
            ) : (
              <Users className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedPersona === 'admin' ? 'Administrator Access' : 'Staff Access'}
          </h1>
          <p className="text-gray-600 mt-2">
            {selectedPersona === 'admin' 
              ? 'Enter admin password to continue' 
              : 'Enter your staff credentials'
            }
          </p>
        </div>

        {selectedPersona === 'admin' ? (
          <form onSubmit={handleAdminSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validating...' : 'Access as Administrator'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleStaffSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="staff-login" className="block text-sm font-medium text-gray-700 mb-2">
                Staff Login Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="staff-login"
                  type="text"
                  required
                  value={staffLoginName}
                  onChange={(e) => setStaffLoginName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your login name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="staff-password" className="block text-sm font-medium text-gray-700 mb-2">
                Staff Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Validating...' : 'Access as Staff'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={resetForm}
            className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
          >
            Choose Different Role
          </button>
        </div>
      </div>
    </div>
  )
}