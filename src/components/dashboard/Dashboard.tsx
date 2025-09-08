import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Building2, Users, FileText, AlertTriangle, DollarSign, Calendar } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { getRentLabel } from '../../lib/periodCalculations'
import type { RpcResponse } from '../../lib/types'

interface DashboardStats {
  totalProperties: number
  totalTenants: number
  activeLeases: number
  pendingMaintenance: number
  monthlyRevenue: number
}

interface DuePayment {
  due_date_id: string
  due_date: string
  amount_due: number
  status: string
  tenant_name: string
  property_name: string
  property_address: string
  property_period_type: string
  days_overdue: number
}

export function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalTenants: 0,
    activeLeases: 0,
    pendingMaintenance: 0,
    monthlyRevenue: 0
  })
  const [duePayments, setDuePayments] = useState<DuePayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Get basic stats
      const [propertiesRes, tenantsRes, leasesRes, maintenanceRes] = await Promise.all([
        supabase.from('properties').select('id, monthly_rent').eq('landlord_id', user!.id),
        supabase.from('tenants').select('id').eq('landlord_id', user!.id),
        supabase.from('leases').select('id, monthly_rent').eq('status', 'active'),
        supabase.from('maintenance_requests').select('id').eq('status', 'pending')
      ])

      // Calculate monthly revenue
      const monthlyRevenue = leasesRes.data?.reduce((sum, lease) => sum + lease.monthly_rent, 0) || 0

      setStats({
        totalProperties: propertiesRes.data?.length || 0,
        totalTenants: tenantsRes.data?.length || 0,
        activeLeases: leasesRes.data?.length || 0,
        pendingMaintenance: maintenanceRes.data?.length || 0,
        monthlyRevenue
      })

      // Get due payments
      const { data: duePaymentsData } = await supabase.rpc('get_due_payments', {
        landlord_id: user!.id
      }) as { data: RpcResponse }

      if (duePaymentsData?.success) {
        setDuePayments(duePaymentsData.data || [])
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, icon: Icon, color }: {
    title: string
    value: string | number
    icon: React.ComponentType<any>
    color: string
  }) => (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your rental business.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          icon={Building2}
          color="bg-blue-600"
        />
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants}
          icon={Users}
          color="bg-green-600"
        />
        <StatCard
          title="Active Leases"
          value={stats.activeLeases}
          icon={FileText}
          color="bg-indigo-600"
        />
        <StatCard
          title="Pending Maintenance"
          value={stats.pendingMaintenance}
          icon={AlertTriangle}
          color="bg-yellow-600"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="bg-green-600"
        />
        <StatCard
          title="Due Payments"
          value={duePayments.filter(p => p.status === 'pending').length}
          icon={Calendar}
          color="bg-red-600"
        />
      </div>

      {/* Due Payments */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming & Overdue Payments</h2>
        </div>
        <div className="p-6">
          {duePayments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending payments</p>
          ) : (
            <div className="space-y-4">
              {duePayments.slice(0, 10).map((payment) => (
                <div
                  key={payment.due_date_id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    payment.days_overdue > 0
                      ? 'border-red-200 bg-red-50'
                      : new Date(payment.due_date) <= addDays(new Date(), 3)
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{payment.tenant_name}</h3>
                      {payment.days_overdue > 0 && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          {payment.days_overdue} days overdue
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{payment.property_name}</p>
                    <p className="text-xs text-gray-500">{payment.property_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">${payment.amount_due}</p>
                    <p className="text-sm text-gray-600">
                      Due: {format(new Date(payment.due_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRentLabel(payment.property_period_type as any || 'monthly')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}