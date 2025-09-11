import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
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
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Properties', href: '/properties', icon: Building2 },
    { name: 'Tenants', href: '/tenants', icon: Users },
    { name: 'Leases', href: '/leases', icon: FileText },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Payments', href: '/payments', icon: CreditCard },
  ]

  const isActive = (href: string) => {
    return location.pathname === href
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex flex-col w-full max-w-xs bg-gradient-to-b from-slate-900 to-slate-800 shadow-xl">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-6 mb-8">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl shadow-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-white">RentManager</span>
            </div>
            <nav className="px-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  } group flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200`}
                  onClick={() => setSidebarOpen(false)}
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
          </div>
          <div className="flex-shrink-0 border-t border-slate-700 p-4">
            <button
              onClick={signOut}
              className="flex items-center w-full px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-gradient-to-b from-slate-900 to-slate-800 shadow-xl">
          <div className="flex items-center flex-shrink-0 px-6 py-8">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl shadow-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold text-white">RentManager</span>
          </div>
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-4 pb-4 space-y-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isActive(item.href)
                      ? 'bg-blue-600 text-white shadow-lg border-r-4 border-blue-400'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  } group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md hover:translate-x-1`}
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
            <div className="flex-shrink-0 border-t border-slate-700 p-4">
              <div className="flex items-center bg-slate-800 rounded-xl p-3 hover:bg-slate-700 transition-colors">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-sm font-bold text-white">
                      {user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
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
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">RentManager</span>
            </div>
          </div>
        </div>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}