import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Shield, Users, Plus, Edit, Trash2, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import type { RpcResponse } from '../../lib/types'

interface StaffAccount {
  name: string
  created_at?: string
}

export function PersonaManagement() {
  const { persona } = useAuth()
  const [activeTab, setActiveTab] = useState<'admin' | 'staff'>('admin')
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Admin password update state
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminForm, setAdminForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  })

  // Staff management state
  const [showStaffForm, setShowStaffForm] = useState(false)
  const [staffForm, setStaffForm] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  })
  const [editingStaff, setEditingStaff] = useState<string | null>(null)
  const [showStaffPassword, setShowStaffPassword] = useState(false)

  // Only allow admin access
  if (persona !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">Only administrators can access persona management.</p>
        </div>
      </div>
    )
  }

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffAccounts()
    }
  }, [activeTab])

  const fetchStaffAccounts = async () => {
    try {
      setLoading(true)
      // Since we don't have a direct function to list staff, we'll simulate it
      // In a real implementation, you'd need a function to list staff accounts
      setStaffAccounts([])
    } catch (error) {
      console.error('Error fetching staff accounts:', error)
      setError('Failed to fetch staff accounts')
    } finally {
      setLoading(false)
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  // Admin password update
  const handleAdminPasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (adminForm.newPassword !== adminForm.confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (adminForm.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase.rpc('update_rent_admin_password_with_old', {
        p_old_password: adminForm.oldPassword,
        p_new_password: adminForm.newPassword
      }) as { data: RpcResponse }

      if (data?.success) {
        setSuccess('Admin password updated successfully')
        setShowAdminForm(false)
        setAdminForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setError(data?.message || 'Failed to update admin password')
      }
    } catch (err) {
      console.error('Error updating admin password:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Staff account creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (staffForm.password !== staffForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (staffForm.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase.rpc('create_rent_staff_account', {
        p_name: staffForm.name,
        p_password: staffForm.password
      }) as { data: RpcResponse }

      console.log(data?.success);
      if (data?.success) {
        setSuccess('Staff account created successfully')
        setShowStaffForm(false)
        setStaffForm({ name: '', password: '', confirmPassword: '' })
        fetchStaffAccounts()
      } else {
        setError(data?.message || 'Failed to create staff account')
      }
    } catch (err) {
      console.error('Error creating staff account:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
 
  // Staff password update
  const handleUpdateStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (staffForm.password !== staffForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (staffForm.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      const { data } = await supabase.rpc('update_rent_staff_password', {
        p_name: editingStaff!,
        p_new_password: staffForm.password
      }) as { data: RpcResponse }

      if (data?.success) {
        setSuccess('Staff password updated successfully')
        setEditingStaff(null)
        setStaffForm({ name: '', password: '', confirmPassword: '' })
      } else {
        setError(data?.message || 'Failed to update staff password')
      }
    } catch (err) {
      console.error('Error updating staff password:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Staff account deletion
  const handleDeleteStaff = async (staffName: string) => {
    if (!confirm(`Are you sure you want to delete the staff account "${staffName}"? This action cannot be undone.`)) {
      return
    }

    clearMessages()
    setLoading(true)
    try {
      const { data } = await supabase.rpc('delete_rent_staff_account', {
        p_name: staffName
      }) as { data: RpcResponse }

      if (data?.success) {
        setSuccess('Staff account deleted successfully')
        fetchStaffAccounts()
      } else {
        setError(data?.message || 'Failed to delete staff account')
      }
    } catch (err) {
      console.error('Error deleting staff account:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Persona Management</h1>
        <p className="text-gray-600">Manage administrator and staff account credentials</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg border border-green-200">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'admin'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-5 h-5 inline mr-2" />
            Administrator
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'staff'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Staff Accounts
          </button>
        </nav>
      </div>

      {/* Admin Tab */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Administrator Settings</h3>
              <button
                onClick={() => setShowAdminForm(!showAdminForm)}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </button>
            </div>

            {showAdminForm && (
              <form onSubmit={handleAdminPasswordUpdate} className="space-y-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.old ? 'text' : 'password'}
                      required
                      value={adminForm.oldPassword}
                      onChange={(e) => setAdminForm({ ...adminForm, oldPassword: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.old ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={adminForm.newPassword}
                        onChange={(e) => setAdminForm({ ...adminForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={adminForm.confirmPassword}
                        onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminForm(false)
                      setAdminForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                      clearMessages()
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Staff Accounts</h3>
            <button
              onClick={() => setShowStaffForm(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Staff Account
            </button>
          </div>

          {/* Staff List */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            {staffAccounts.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Staff Accounts</h3>
                <p className="text-gray-600">Create your first staff account to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {staffAccounts.map((staff) => (
                  <div key={staff.name} className="p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{staff.name}</h4>
                      {staff.created_at && (
                        <p className="text-sm text-gray-600">
                          Created: {new Date(staff.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingStaff(staff.name)
                          setStaffForm({ name: staff.name, password: '', confirmPassword: '' })
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Change Password"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Form Modal */}
      {(showStaffForm || editingStaff) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingStaff ? 'Update Staff Password' : 'Create Staff Account'}
              </h3>
              <button
                onClick={() => {
                  setShowStaffForm(false)
                  setEditingStaff(null)
                  setStaffForm({ name: '', password: '', confirmPassword: '' })
                  clearMessages()
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>

            <form onSubmit={editingStaff ? handleUpdateStaffPassword : handleCreateStaff} className="p-6 space-y-4">
              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Staff Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter staff name"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showStaffPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showStaffPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={staffForm.confirmPassword}
                  onChange={(e) => setStaffForm({ ...staffForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Confirm password"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowStaffForm(false)
                    setEditingStaff(null)
                    setStaffForm({ name: '', password: '', confirmPassword: '' })
                    clearMessages()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (editingStaff ? 'Updating...' : 'Creating...') : (editingStaff ? 'Update Password' : 'Create Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}