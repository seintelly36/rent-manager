import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Calendar, DollarSign, User, MapPin, Clock, TrendingUp, CheckCircle, Plus, AlertCircle, RotateCcw } from 'lucide-react'
import { format, differenceInDays, addDays, addWeeks, addMonths, addYears, addHours, addMinutes } from 'date-fns'
import { formatPeriodDuration, getRentLabel } from '../../lib/periodCalculations'
import type { LeaseWithDetails } from './LeasesPage'
import type { Payment, RpcResponse } from '../../lib/types'
import { useLeaseCalculations } from '../../hooks/useLeaseCalculations'; // Adjust path

import { LeaseInfoHeader } from './components/LeaseInfoHeader';
import { FinancialSummary } from './components/FinancialSummary'; 
import { PaymentSchedule } from './components/PaymentSchedule';
import { PaymentHistory } from './components/PaymentHistory';
import { LeaseTerms } from './components/LeaseTerms';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { ProcessRefundModal } from './components/ProcessRefundModal';

interface LeaseDetailsProps {
  lease: LeaseWithDetails
  onClose: () => void
  onUpdated: () => void
}

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

interface LeaseCalculations {
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

export function LeaseDetails({ lease, onClose, onUpdated }: LeaseDetailsProps) {
  const [calculations, setCalculations] = useState<LeaseCalculations | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundFormData, setRefundFormData] = useState({
    payment_id: '',
    amount: '',
    reason: ''
  })
  const [processingRefund, setProcessingRefund] = useState(false)
  const [refundError, setRefundError] = useState('')

  useEffect(() => {
    calculateLeaseMetrics()
  }, [lease])

  const calculateLeaseMetrics = async () => {
    try {
      setLoading(true)
      
      // Fetch all payments for this lease
      const { data: payments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('lease_id', lease.id)
        .order('payment_date', { ascending: true })

      if (error) throw error

      const paymentHistory = payments || []
      const currentDate = new Date()
      const startDate = new Date(lease.start_date)
      const endDate = lease.end_date ? new Date(lease.end_date) : null
      const periodType = lease.property?.period_type || 'monthly'

      // Calculate total periods and generate complete payment schedule
      let totalPeriods = 0
      let periodsElapsed = 0
      let paymentDueList: PaymentDue[] = []

      // Determine total periods based on lease configuration
      if (lease.period_count && lease.auto_calculate_end_date) {
        totalPeriods = lease.period_count
      } else if (endDate) {
        const totalDays = differenceInDays(endDate, startDate)
        switch (periodType) {
          case 'minutes':
            totalPeriods = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60))
            break
          case 'hourly':
            totalPeriods = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
            break
          case 'daily':
            totalPeriods = Math.ceil(totalDays)
            break
          case 'weekly':
            totalPeriods = Math.ceil(totalDays / 7)
            break
          case 'monthly':
            totalPeriods = Math.ceil(totalDays / 30)
            break
          case 'yearly':
            totalPeriods = Math.ceil(totalDays / 365)
            break
          default:
            totalPeriods = Math.ceil(totalDays / 30)
        }
      }

      // Calculate elapsed periods from start date
      const daysSinceStart = differenceInDays(currentDate, startDate)
      switch (periodType) {
        case 'minutes':
          periodsElapsed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60))
          break
        case 'hourly':
          periodsElapsed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
          break
        case 'daily':
          periodsElapsed = Math.max(0, daysSinceStart)
          break
        case 'weekly':
          periodsElapsed = Math.floor(daysSinceStart / 7)
          break
        case 'monthly':
          periodsElapsed = Math.floor(daysSinceStart / 30)
          break
        case 'yearly':
          periodsElapsed = Math.floor(daysSinceStart / 365)
          break
        default:
          periodsElapsed = Math.floor(daysSinceStart / 30)
      }

      periodsElapsed = Math.max(0, periodsElapsed)
      if (totalPeriods > 0) {
        periodsElapsed = Math.min(periodsElapsed, totalPeriods)
      }

      // Calculate net payments (rent payments minus refunds)
      const rentPayments = paymentHistory.filter(p => p.type === 'rent' && p.status === 'paid')
      const refunds = paymentHistory.filter(p => p.type === 'refund' && p.status === 'paid')
      const totalRefundAmount = refunds.reduce((sum, p) => sum + Math.abs(p.amount), 0)
      let netPaidAmount = rentPayments.reduce((sum, p) => sum + p.amount, 0) - totalRefundAmount

      // Calculate refunded amounts for each payment
      const paymentRefunds = new Map<string, number>()
      refunds.forEach(refund => {
        if (refund.notes) {
          // Extract payment ID from refund notes (assuming format includes payment ID)
          const paymentIdMatch = refund.notes.match(/payment[_\s]id[:\s]*([a-f0-9-]+)/i)
          if (paymentIdMatch) {
            const paymentId = paymentIdMatch[1]
            const currentRefunded = paymentRefunds.get(paymentId) || 0
            paymentRefunds.set(paymentId, currentRefunded + Math.abs(refund.amount))
          }
        }
      })

      // Generate complete payment schedule
      const maxPeriodsToCalculate = totalPeriods > 0 ? totalPeriods : Math.max(periodsElapsed + 12, 24)
      let remainingPaidAmount = netPaidAmount
      let calculatedTotalPaid = 0

      for (let period = 1; period <= maxPeriodsToCalculate; period++) {
        // Due date equals start date for first period, then increments by period type
        let dueDate: Date
        
        if (period === 1) {
          // First period due date = start date
          dueDate = new Date(startDate)
        } else {
          // Subsequent periods increment from start date
          switch (periodType) {
            case 'minutes':
              dueDate = addMinutes(startDate, period - 1)
              break
            case 'hourly':
              dueDate = addHours(startDate, period - 1)
              break
            case 'daily':
              dueDate = addDays(startDate, period - 1)
              break
            case 'weekly':
              dueDate = addWeeks(startDate, period - 1)
              break
            case 'monthly':
              dueDate = addMonths(startDate, period - 1)
              break
            case 'yearly':
              dueDate = addYears(startDate, period - 1)
              break
            default:
              dueDate = addMonths(startDate, period - 1)
          }
        }

        const isPeriodElapsed = period <= periodsElapsed
        const isOverdue = isPeriodElapsed && dueDate < currentDate && remainingPaidAmount < lease.monthly_rent

        // Check if this period is paid
        let isPaid = false
        let paymentDate: Date | undefined
        let paymentAmount: number | undefined
        let isAdvance = false

        if (remainingPaidAmount >= lease.monthly_rent) {
          isPaid = true
          remainingPaidAmount -= lease.monthly_rent
          calculatedTotalPaid += lease.monthly_rent
          
          // Find the actual payment for this period
          const payment = rentPayments.find(p => {
            const pDate = new Date(p.payment_date)
            return pDate <= dueDate || (!isPeriodElapsed && pDate <= currentDate)
          })
          
          if (payment) {
            paymentDate = new Date(payment.payment_date)
            paymentAmount = payment.amount
            
            // Check if this is an advance payment (paid before due date)
            if (paymentDate < dueDate) {
              isAdvance = true
            }
          }
        }

        paymentDueList.push({
          periodNumber: period,
          dueDate,
          amount: lease.monthly_rent,
          isPaid,
          paymentDate,
          paymentAmount,
          isOverdue: !isPaid && isOverdue,
          isAdvance
        })

        // For ongoing leases, continue until all payments are accounted for
        if (totalPeriods === 0 && remainingPaidAmount < lease.monthly_rent && period > periodsElapsed + 6) {
          break
        }
      }

      // Calculate financial metrics
      const periodsRemaining = Math.max(0, totalPeriods - periodsElapsed)
      const totalAmountDue = periodsElapsed * lease.monthly_rent
      const totalPaid = rentPayments.reduce((sum, p) => sum + p.amount, 0) - totalRefundAmount
      const amountDue = Math.max(0, totalAmountDue - totalPaid)

      // Find next due date
      const nextUnpaidPeriod = paymentDueList.find(p => !p.isPaid && p.dueDate >= currentDate)
      const nextDueDate = nextUnpaidPeriod?.dueDate || null
      const daysUntilNextPayment = nextDueDate ? differenceInDays(nextDueDate, currentDate) : 0

      await new Promise(resolve => setTimeout(resolve, 100)) // Simulate async calculation

      setCalculations({
        totalPeriods,
        periodsElapsed,
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
  }

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
        setPaymentFormData({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          notes: ''
        })
        await calculateLeaseMetrics() // Recalculate after payment
        onUpdated() // Update parent component
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
        setRefundFormData({
          payment_id: '',
          amount: '',
          reason: ''
        })
        await calculateLeaseMetrics() // Recalculate after refund
        onUpdated() // Update parent component
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Lease Details</h2>
            <p className="text-gray-600">{lease.property?.name} - {lease.tenant?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Information */}
            <LeaseInfoHeader
              tenantName={lease.tenant?.name}
              tenantEmail={lease.tenant?.email}
              propertyName={lease.property?.name}
              propertyAddress={lease.property?.address}
              startDate={lease.start_date}
              endDate={lease.end_date}
              periodCount={lease.period_count}
              periodType={lease.property?.period_type}
              monthlyRent={lease.monthly_rent}
              securityDeposit={lease.security_deposit}
              status={lease.status}
              autoCalculateEndDate={lease.auto_calculate_end_date}
            />

          {/* Financial Summary */}
          {calculations && (
             <FinancialSummary
                calculations={calculations}
                leaseStatus={lease.status}
                onRecordPaymentClick={() => setShowPaymentForm(true)}
              />
          )}

          {/* Complete Payment Schedule */}
          {calculations && (
             <PaymentSchedule paymentDueList={calculations.paymentDueList} />
          )}

          {/* Payment History */}
          {calculations && calculations.paymentHistory.length > 0 && (
            <PaymentHistory
              paymentHistory={calculations.paymentHistory}
              leaseStatus={lease.status}
              onProcessRefundClick={() => setShowRefundForm(true)}
            />
          )}

          {/* Lease Terms */}
          {lease.terms && Object.keys(lease.terms).length > 0 && (
            <LeaseTerms terms={lease.terms} />
          )}
        </div>

        {/* Payment Recording Form */}
        {showPaymentForm && (
          <RecordPaymentModal
            isOpen={showPaymentForm}
            onClose={() => {
              setShowPaymentForm(false);
              setPaymentError('');
            }}
            onSubmit={handleRecordPayment}
            formData={paymentFormData}
            setFormData={setPaymentFormData}
            isRecording={recordingPayment}
            paymentError={paymentError}
            defaultRentAmount={lease.monthly_rent}
          />
        )}
      </div>
        {/* Refund Form Modal */}
        {showRefundForm && (
          <ProcessRefundModal
            isOpen={showRefundForm}
            onClose={() => {
              setShowRefundForm(false);
              setRefundError('');
            }}
            onSubmit={handleRefund}
            formData={refundFormData}
            setFormData={setRefundFormData}
            isProcessing={processingRefund}
            refundError={refundError}
            calculations={calculations}
          />
        )}
    </div>
  )
}