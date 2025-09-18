import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { PersonaSelection } from './components/auth/PersonaSelection'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './components/dashboard/Dashboard'
import { TenantsPage } from './components/tenants/TenantsPage'
import { PropertiesPage } from './components/properties/PropertiesPage'
import { LeasesPage } from './components/leases/LeasesPage'
import { PaymentsPage } from './components/payments/PaymentsPage'
import { MaintenancePage } from './components/maintenance/MaintenancePage'
import { PersonaManagement } from './components/persona/PersonaManagement'

function AppContent() {
  const { 
    user, 
    persona, 
    loginName, 
    loading, 
    personaLoading, 
    isPersonaAuthenticated,
    validateAdminPassword,
    validateStaffAccount,
    setPersona,
    switchPersona
  } = useAuth()

  if (loading || personaLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  if (!isPersonaAuthenticated) {
    return (
      <PersonaSelection
        email={user.email!}
        onAdminSelect={validateAdminPassword}
        onStaffSelect={validateStaffAccount}
        onPersonaSet={setPersona}
        onBack={switchPersona}
      />
    )
  }
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/leases" element={<LeasesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/persona-management" element={<PersonaManagement />} />
        </Routes>
      </Layout>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App