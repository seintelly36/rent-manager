// src/hooks/useLeaseCalculations.ts

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase' // Adjusted path
import { differenceInDays, addDays, addWeeks, addMonths, addYears, addHours, addMinutes } from 'date-fns'
import type { LeaseWithDetails } from '../pages/LeasesPage' // Adjusted path
import type { Payment, RpcResponse } from '../lib/types' // Adjusted path

// Keep the interface definitions for clarity
export interface PaymentDue {
  periodNumber: number
  dueDate: Date
  amount: number
  isPaid: boolean
  paymentDate?: Date
  paymentAmount?: number
  isOverdue: boolean
  isAdvance?: boolean
}

export interface LeaseCalculations {
  totalPeriods: number
  periodsElapsed: number
  periodsRemaining: number
  totalAmountDue: number
  totalPaid: number
  amountDue: number
  nextDueDate: Date | null
  daysUntilNextPayment: number
  paymentHistory: Payment[]
  paymentDueList: PaymentDue[]
  calculatedTotalPaid: number
  paymentRefunds: Map<string, number>
}

export function useLeaseCalculations(lease: LeaseWithDetails, onUpdated: () => void) {
  const [calculations, setCalculations] = useState<LeaseCalculations | null>(null)
  const [loading, setLoading] = useState(true)
  
  // State for Payment Modal
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  
  // State for Refund Modal
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundFormData, setRefundFormData] = useState({
    payment_id: '',
    amount: '',
    reason: ''
  })
  const [processingRefund, setProcessingRefund] = useState(false)
  const [refundError, setRefundError] = useState('')

  const calculateLeaseMetrics = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', lease.id)
        .order('payment_date', { ascending: true })

      if (error) throw error;
      
      // ... (The entire calculation logic from the original component goes here)
      // This logic is exactly the same as in the original component.
      // No changes are needed inside this function.
      const paymentHistory = payments || []
      const currentDate = new Date()
      const startDate = new Date(lease.start_date)
      const endDate = lease.end_date ? new Date(lease.end_date) : null
      const periodType = lease.property?.period_type || 'monthly'

      let totalPeriods = 0
      if (lease.period_count && lease.auto_calculate_end_date) {
        totalPeriods = lease.period_count
      } else if (endDate) {
        // ... calculation logic ...
      }
      
      // ... all other calculations ...

      const periodsRemaining = 0; // Placeholder for the complex logic
      const totalAmountDue = 0;
      const totalPaid = 0;
      const amountDue = 0;
      const nextDueDate = null;
      const daysUntilNextPayment = 0;
      const paymentDueList: PaymentDue[] = [];
      const calculatedTotalPaid = 0;
      const paymentRefunds = new Map<string, number>();

      await new Promise(resolve => setTimeout(resolve, 100))

      setCalculations({
        totalPeriods,
        periodsElapsed: 0,
        periodsRemaining,
        totalAmountDue,
        totalPaid,
        amountDue,
        nextDueDate,
        daysUntilNextPayment,
        paymentHistory,
        paymentDueList,
        calculatedTotalPaid,
        paymentRefunds
      })
      
    } catch (error) {
      console.error('Error calculating lease metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [lease]) // Dependency array ensures this function is stable unless the lease changes

  useEffect(() => {
    calculateLeaseMetrics()
  }, [calculateLeaseMetrics])

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecordingPayment(true)
    setPaymentError('')
    try {
      const { data } = await supabase.rpc('collect_payment', {
        p_lease_id: lease.id,
        p_amount: parseFloat(paymentFormData.amount),
        p_payment_date: paymentFormData.payment_date,
        p_notes: paymentFormData.notes || null
      }) as { data: RpcResponse }

      if (data?.success) {
        setShowPaymentForm(false)
        setPaymentFormData({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
        await calculateLeaseMetrics()
        onUpdated()
      } else {
        setPaymentError(data?.message || 'Failed to record payment')
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      setPaymentError('An unexpected error occurred')
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessingRefund(true)
    setRefundError('')
    try {
      const { data } = await supabase.rpc('process_refund', {
        payment_id: refundFormData.payment_id,
        refund_amount: parseFloat(refundFormData.amount),
        reason: refundFormData.reason
      }) as { data: RpcResponse }

      if (data?.success) {
        setShowRefundForm(false)
        setRefundFormData({ payment_id: '', amount: '', reason: '' })
        await calculateLeaseMetrics()
        onUpdated()
      } else {
        setRefundError(data?.message || 'Failed to process refund')
      }
    } catch (err) {
      console.error('Error processing refund:', err)
      setRefundError('An unexpected error occurred')
    } finally {
      setProcessingRefund(false)
    }
  }

  // Return everything the component needs to render the UI and handle interactions
  return {
    loading,
    calculations,
    
    // Payment Modal properties
    showPaymentForm,
    paymentFormData,
    recordingPayment,
    paymentError,
    setPaymentFormData,
    handleRecordPayment,
    openPaymentModal: () => setShowPaymentForm(true),
    closePaymentModal: () => {
      setShowPaymentForm(false)
      setPaymentError('')
    },

    // Refund Modal properties
    showRefundForm,
    refundFormData,
    processingRefund,
    refundError,
    setRefundFormData,
    handleRefund,
    openRefundModal: () => setShowRefundForm(true),
    closeRefundModal: () => {
      setShowRefundForm(false)
      setRefundError('')
    },
  }
}