export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          landlord_id: string
          name: string
          email: string | null
          data: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          landlord_id: string
          name: string
          email?: string | null
          data?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          landlord_id?: string
          name?: string
          email?: string | null
          data?: Record<string, any>
          created_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          landlord_id: string
          name: string
          address: string
          monthly_rent: number
          period_type: 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
          data: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          landlord_id: string
          name: string
          address: string
          monthly_rent?: number
          period_type?: 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
          data?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          landlord_id?: string
          name?: string
          address?: string
          monthly_rent?: number
          period_type?: 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
          data?: Record<string, any>
          created_at?: string
        }
      }
      leases: {
        Row: {
          id: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date: string | null
          monthly_rent: number
          security_deposit: number
          status: 'active' | 'terminated'
          period_count?: number | null
          auto_calculate_end_date: boolean
          terms: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          property_id: string
          start_date: string
          end_date?: string | null
          monthly_rent: number
          security_deposit?: number
          status?: 'active' | 'terminated'
          period_count?: number | null
          auto_calculate_end_date?: boolean
          terms?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          property_id?: string
          start_date?: string
          end_date?: string | null
          monthly_rent?: number
          security_deposit?: number
          status?: 'active' | 'terminated'
          period_count?: number | null
          auto_calculate_end_date?: boolean
          terms?: Record<string, any>
          created_at?: string
        }
      }
      maintenance_requests: {
        Row: {
          id: string
          property_id: string
          title: string
          description: string | null
          priority: 'low' | 'medium' | 'high'
          status: 'pending' | 'in_progress' | 'completed'
          details: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_id: string
          title: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'in_progress' | 'completed'
          details?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          title?: string
          description?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'pending' | 'in_progress' | 'completed'
          details?: Record<string, any>
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          lease_id: string
          amount: number
          payment_date: string
          type: 'rent' | 'deposit' | 'refund'
          status: 'paid' | 'pending' | 'failed'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          amount: number
          payment_date: string
          type?: 'rent' | 'deposit' | 'refund'
          status?: 'paid' | 'pending' | 'failed'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          amount?: number
          payment_date?: string
          type?: 'rent' | 'deposit' | 'refund'
          status?: 'paid' | 'pending' | 'failed'
          notes?: string | null
          created_at?: string
        }
      }
      due_dates: {
        Row: {
          id: string
          lease_id: string
          due_date: string
          amount_due: number
          status: 'pending' | 'paid' | 'overdue'
          created_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          due_date: string
          amount_due: number
          status?: 'pending' | 'paid' | 'overdue'
          created_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          due_date?: string
          amount_due?: number
          status?: 'pending' | 'paid' | 'overdue'
          created_at?: string
        }
      }
    }
    Functions: {
      create_tenant: {
        Args: { tenant_data: Record<string, any> }
        Returns: Record<string, any>
      }
      update_tenant: {
        Args: { tenant_id: string; tenant_data: Record<string, any> }
        Returns: Record<string, any>
      }
      delete_tenant: {
        Args: { tenant_id: string }
        Returns: Record<string, any>
      }
      create_property: {
        Args: { property_data: Record<string, any> }
        Returns: Record<string, any>
      }
      update_property: {
        Args: { property_id: string; property_data: Record<string, any> }
        Returns: Record<string, any>
      }
      create_lease: {
        Args: { tenant_id: string; property_id: string; lease_terms: Record<string, any> }
        Returns: Record<string, any>
      }
      terminate_lease: {
        Args: { lease_id: string; termination_date: string }
        Returns: Record<string, any>
      }
      create_maintenance_request: {
        Args: { property_id: string; request_details: Record<string, any> }
        Returns: Record<string, any>
      }
      update_maintenance_status: {
        Args: { request_id: string; status: string; notes?: string }
        Returns: Record<string, any>
      }
      collect_payment: {
        Args: { p_lease_id: string; p_amount: number; p_payment_date: string; p_notes?: string }
        Returns: Record<string, any>
      }
      process_refund: {
        Args: { payment_id: string; refund_amount: number; reason: string }
        Returns: Record<string, any>
      }
      get_due_payments: {
        Args: { landlord_id: string }
        Returns: Record<string, any>
      }
    }
  }
}

export interface Tenant {
  id: string
  name: string
  email?: string | null
  data: Record<string, any>
  created_at: string
}

export interface Property {
  id: string
  name: string
  address: string
  monthly_rent: number
  period_type: 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  data: Record<string, any>
  created_at: string
}

export interface Lease {
  id: string
  tenant_id: string
  property_id: string
  start_date: string
  end_date?: string | null
  monthly_rent: number
  security_deposit: number
  status: 'active' | 'terminated'
  period_count?: number | null
  auto_calculate_end_date: boolean
  terms: Record<string, any>
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  property_id: string
  title: string
  description?: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  details: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  lease_id: string
  amount: number
  payment_date: string
  type: 'rent' | 'deposit' | 'refund'
  status: 'paid' | 'pending' | 'failed'
  notes?: string | null
  created_at: string
}

export interface DueDate {
  id: string
  lease_id: string
  due_date: string
  amount_due: number
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
}

export interface RpcResponse {
  success: boolean
  message: string
  [key: string]: any
}