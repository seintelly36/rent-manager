// hooks/useLeaseCalculations.ts

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { differenceInDays, addDays, addWeeks, addMonths, addYears, addHours, addMinutes } from 'date-fns'
import type { LeaseWithDetails } from '../LeasesPage'
import type { Payment, RpcResponse } from '../../lib/types'

// Define the types for the hook's state and return values
// Note: These interfaces are the same as in the original component
interface PaymentDue {
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

// --- THE CUSTOM HOOK ---
export function useLeaseCalculations(lease: LeaseWithDetails, onUpdated: () => void) {
  const [calculations, setCalculations] = useState<LeaseCalculations | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [isProcessingRefund, setIsProcessingRefund] = useState(false)
  const [refundError, setRefundError] = useState('')

  const calculateLeaseMetrics = useCallback(async () => {
    try {
      setLoading(true)
      // --- All the calculation logic from the original component goes here ---
      // This function is identical to the one in your original code.
      // (For brevity, the large calculation block is omitted here, but you would paste it directly)
      const { data: payments, error } = await supabase.from('payments').select('*').eq('lease_id', lease.id).order('payment_date', { ascending: true });
      if (error) throw error;
      // ... a lot of calculation logic ...
      const paymentHistory = payments || [];
      // ... (the entire implementation of calculateLeaseMetrics) ...
      const calculatedData: LeaseCalculations = { /* ... results of calculation ... */ };
      setCalculations(calculatedData);

    } catch (error) {
      console.error('Error calculating lease metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [lease.id]) // Dependency on lease.id ensures recalculation if the lease itself changes

  useEffect(() => {
    calculateLeaseMetrics()
  }, [calculateLeaseMetrics])

  const recordPayment = async (paymentData: { amount: string; payment_date: string; notes: string }) => {
    setIsRecordingPayment(true)
    setPaymentError('')
    try {
      const { data } = await supabase.rpc('collect_payment', {
        p_lease_id: lease.id,
        p_amount: parseFloat(paymentData.amount),
        p_payment_date: paymentData.payment_date,
        p_notes: paymentData.notes || null
      }) as { data: RpcResponse }

      if (data?.success) {
        await calculateLeaseMetrics() // Recalculate after payment
        onUpdated() // Notify parent component
        return true // Indicate success
      } else {
        setPaymentError(data?.message || 'Failed to record payment')
        return false // Indicate failure
      }
    } catch (err) {
      console.error('Error recording payment:', err)
      setPaymentError('An unexpected error occurred')
      return false
    } finally {
      setIsRecordingPayment(false)
    }
  }

  const processRefund = async (refundData: { payment_id: string; amount: string; reason: string }) => {
    setIsProcessingRefund(true)
    setRefundError('')
    try {
      const { data } = await supabase.rpc('process_refund', {
        payment_id: refundData.payment_id,
        refund_amount: parseFloat(refundData.amount),
        reason: refundData.reason
      }) as { data: RpcResponse }

      if (data?.success) {
        await calculateLeaseMetrics() // Recalculate after refund
        onUpdated() // Notify parent component
        return true // Indicate success
      } else {
        setRefundError(data?.message || 'Failed to process refund')
        return false // Indicate failure
      }
    } catch (err) {
      console.error('Error processing refund:', err)
      setRefundError('An unexpected error occurred')
      return false
    } finally {
      setIsProcessingRefund(false)
    }
  }

  // Return the public "API" of this hook
  return {
    calculations,
    loading,
    isRecordingPayment,
    paymentError,
    isProcessingRefund,
    refundError,
    recordPayment,
    processRefund,
    refresh: calculateLeaseMetrics, // Expose a manual refresh function
    clearPaymentError: () => setPaymentError(''),
    clearRefundError: () => setRefundError(''),
  }
}