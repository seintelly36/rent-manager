import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PersonaIndicator } from '../auth/PersonaIndicator'
import { 
  Building2, 
  Home, 
  Users, 
  FileText, 
  Wrench, 
  CreditCard, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, persona, loginName, signOut, switchPersona } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar when clicking outside on mobile/tablet
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const toggleButton = document.getElementById('sidebar-toggle')
      
      if (sidebarOpen && sidebar && toggleButton) {
        if (!sidebar.contains(event.target as Node) && !toggleButton.contains(event.target as Node)) {
          setSidebarOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sidebarOpen])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen])

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Properties', href: '/properties', icon: Building2 },
    { name: 'Tenants', href: '/tenants', icon: Users },
    { name: 'Leases', href: '/leases', icon: FileText },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    ...(persona === 'admin' ? [{ name: 'Persona Management', href: '/persona-management', icon: Settings }] : []),
  ]

  const isActive = (href: string) => {
    return location.pathname === href
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Sidebar Overlay */}
      <div 
        className={`fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity duration-300 z-40 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        id="sidebar"
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-700">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-white">RentManager</span>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white shadow-lg border-r-4 border-blue-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                } group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md hover:translate-x-1`}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <div className="flex items-center">
                  <item.icon className={`mr-3 h-5 w-5 ${
                    isActive(item.href) ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`} />
                  <span>{item.name}</span>
                </div>
                {isActive(item.href) && (
                  <ChevronRight className="h-4 w-4 text-blue-200" />
                )}
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-slate-700 p-4 space-y-4">
            {/* Persona Indicator */}
            {persona && (
              <PersonaIndicator
                persona={persona}
                loginName={loginName}
                onSwitchPersona={switchPersona}
              />
            )}
            
            {/* User Profile */}
            <div className="flex items-center bg-slate-800 rounded-xl p-3 hover:bg-slate-700 transition-colors">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email}
                </p>
                <button
                  onClick={signOut}
                  className="flex items-center text-xs text-slate-400 hover:text-slate-200 transition-colors mt-1"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center">
            <button
              id="sidebar-toggle"
              onClick={toggleSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">RentManager</span>
            </div>
          </div>

          {/* Mobile User Info */}
          <div className="flex items-center space-x-3">
            {persona && (
              <div className="hidden sm:flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  persona === 'admin' ? 'bg-red-500' : 'bg-green-500'
                }`} />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {persona}
                </span>
              </div>
            )}
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 transition-all duration-300 ease-in-out">
          {children}
        </main>
      </div>
    </div>
  )
}