import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { differenceInDays, addDays, addWeeks, addMonths, addYears, addHours, addMinutes } from 'date-fns'
import type { LeaseWithDetails } from '../pages/LeasesPage' // Adjust path as needed
import type { Payment, RpcResponse } from '../lib/types'

// Define the structure of the calculated data
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

interface UseLeaseCalculationsProps {
  lease: LeaseWithDetails
  onUpdated: () => void
}

// THE CUSTOM HOOK
export function useLeaseCalculations({ lease, onUpdated }: UseLeaseCalculationsProps) {
  const [calculations, setCalculations] = useState<LeaseCalculations | null>(null)
  const [loading, setLoading] = useState(true)

  const calculateLeaseMetrics = useCallback(async () => {
    if (!lease) return;
    
    try {
      setLoading(true)
      
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', lease.id)
        .order('payment_date', { ascending: true })

      if (error) throw error

      // --- ALL THE CALCULATION LOGIC FROM THE ORIGINAL COMPONENT GOES HERE ---
      // This logic remains identical, it's just been moved.
      const paymentHistory = payments || []
      const currentDate = new Date()
      // ... (The entire calculation block from the original component) ...
      const startDate = new Date(lease.start_date)
      const endDate = lease.end_date ? new Date(lease.end_date) : null
      const periodType = lease.property?.period_type || 'monthly'

      let totalPeriods = 0
      let periodsElapsed = 0
      let paymentDueList: PaymentDue[] = []

      if (lease.period_count && lease.auto_calculate_end_date) {
        totalPeriods = lease.period_count
      } else if (endDate) {
        // ... calculation of totalPeriods based on date diff
        const totalDays = differenceInDays(endDate, startDate)
        switch (periodType) {
          case 'minutes': totalPeriods = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60)); break
          case 'hourly': totalPeriods = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)); break
          case 'daily': totalPeriods = Math.ceil(totalDays); break
          case 'weekly': totalPeriods = Math.ceil(totalDays / 7); break
          case 'monthly': totalPeriods = Math.ceil(totalDays / 30); break
          case 'yearly': totalPeriods = Math.ceil(totalDays / 365); break
          default: totalPeriods = Math.ceil(totalDays / 30);
        }
      }

      const daysSinceStart = differenceInDays(currentDate, startDate)
      // ... calculation of periodsElapsed ...
      switch (periodType) {
        case 'minutes': periodsElapsed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60)); break
        case 'hourly': periodsElapsed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)); break
        case 'daily': periodsElapsed = Math.max(0, daysSinceStart); break
        case 'weekly': periodsElapsed = Math.floor(daysSinceStart / 7); break
        case 'monthly': periodsElapsed = Math.floor(daysSinceStart / 30); break
        case 'yearly': periodsElapsed = Math.floor(daysSinceStart / 365); break
        default: periodsElapsed = Math.floor(daysSinceStart / 30);
      }
      
      periodsElapsed = Math.max(0, periodsElapsed)
      if (totalPeriods > 0) { periodsElapsed = Math.min(periodsElapsed, totalPeriods) }

      const rentPayments = paymentHistory.filter(p => p.type === 'rent' && p.status === 'paid')
      const refunds = paymentHistory.filter(p => p.type === 'refund' && p.status === 'paid')
      const totalRefundAmount = refunds.reduce((sum, p) => sum + Math.abs(p.amount), 0)
      let netPaidAmount = rentPayments.reduce((sum, p) => sum + p.amount, 0) - totalRefundAmount

      const paymentRefunds = new Map<string, number>()
      refunds.forEach(refund => {
        if (refund.notes) {
          const paymentIdMatch = refund.notes.match(/payment[_\s]id[:\s]*([a-f0-9-]+)/i)
          if (paymentIdMatch) {
            const paymentId = paymentIdMatch[1]
            const currentRefunded = paymentRefunds.get(paymentId) || 0
            paymentRefunds.set(paymentId, currentRefunded + Math.abs(refund.amount))
          }
        }
      })

      const maxPeriodsToCalculate = totalPeriods > 0 ? totalPeriods : Math.max(periodsElapsed + 12, 24)
      let remainingPaidAmount = netPaidAmount
      let calculatedTotalPaid = 0

      for (let period = 1; period <= maxPeriodsToCalculate; period++) {
          // ... logic to build paymentDueList ...
          let dueDate: Date;
          if (period === 1) {
            dueDate = new Date(startDate)
          } else {
            switch (periodType) {
              case 'minutes': dueDate = addMinutes(startDate, period - 1); break
              case 'hourly': dueDate = addHours(startDate, period - 1); break
              case 'daily': dueDate = addDays(startDate, period - 1); break
              case 'weekly': dueDate = addWeeks(startDate, period - 1); break
              case 'monthly': dueDate = addMonths(startDate, period - 1); break
              case 'yearly': dueDate = addYears(startDate, period - 1); break
              default: dueDate = addMonths(startDate, period - 1);
            }
          }
          const isPeriodElapsed = period <= periodsElapsed
          const isOverdue = isPeriodElapsed && dueDate < currentDate && remainingPaidAmount < lease.monthly_rent
          let isPaid = false
          let paymentDate: Date | undefined
          let paymentAmount: number | undefined
          let isAdvance = false
          if (remainingPaidAmount >= lease.monthly_rent) {
            isPaid = true
            remainingPaidAmount -= lease.monthly_rent
            calculatedTotalPaid += lease.monthly_rent
            const payment = rentPayments.find(p => new Date(p.payment_date) <= dueDate || (!isPeriodElapsed && new Date(p.payment_date) <= currentDate))
            if (payment) {
              paymentDate = new Date(payment.payment_date)
              paymentAmount = payment.amount
              if (paymentDate < dueDate) isAdvance = true
            }
          }
          paymentDueList.push({ periodNumber: period, dueDate, amount: lease.monthly_rent, isPaid, paymentDate, paymentAmount, isOverdue: !isPaid && isOverdue, isAdvance })
          if (totalPeriods === 0 && remainingPaidAmount < lease.monthly_rent && period > periodsElapsed + 6) break
      }
      
      const periodsRemaining = Math.max(0, totalPeriods - periodsElapsed)
      const totalAmountDue = periodsElapsed * lease.monthly_rent
      const totalPaid = rentPayments.reduce((sum, p) => sum + p.amount, 0) - totalRefundAmount
      const amountDue = Math.max(0, totalAmountDue - totalPaid)
      const nextUnpaidPeriod = paymentDueList.find(p => !p.isPaid && p.dueDate >= currentDate)
      const nextDueDate = nextUnpaidPeriod?.dueDate || null
      const daysUntilNextPayment = nextDueDate ? differenceInDays(nextDueDate, currentDate) : 0
      
      // --- END OF MOVED LOGIC ---

      setCalculations({
        totalPeriods, periodsElapsed, periodsRemaining, totalAmountDue, totalPaid, amountDue,
        nextDueDate, daysUntilNextPayment, paymentHistory, paymentDueList, calculatedTotalPaid, paymentRefunds
      })
    } catch (error) {
      console.error('Error calculating lease metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [lease]);

  useEffect(() => {
    calculateLeaseMetrics()
  }, [calculateLeaseMetrics])

  const recordPayment = async (formData: { amount: string; payment_date: string; notes: string; }) => {
    const { data } = await supabase.rpc('collect_payment', {
        p_lease_id: lease.id,
        p_amount: parseFloat(formData.amount),
        p_payment_date: formData.payment_date,
        p_notes: formData.notes || null
      }) as { data: RpcResponse }

    if (data?.success) {
      await calculateLeaseMetrics() // Recalculate after payment
      onUpdated() // Notify parent
    }
    return data; // Return response to the component
  }

  const processRefund = async (formData: { payment_id: string; amount: string; reason: string; }) => {
     const { data } = await supabase.rpc('process_refund', {
        payment_id: formData.payment_id,
        refund_amount: parseFloat(formData.amount),
        reason: formData.reason
      }) as { data: RpcResponse }

      if (data?.success) {
        await calculateLeaseMetrics() // Recalculate after refund
        onUpdated() // Notify parent
      }
      return data; // Return response to the component
  }

  return { loading, calculations, recordPayment, processRefund }
}