import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Calendar, DollarSign, User, MapPin, Clock, TrendingUp, CheckCircle, Plus, AlertCircle, RotateCcw } from 'lucide-react'
import { format, differenceInDays, addDays, addWeeks, addMonths, addYears, addHours, addMinutes } from 'date-fns'
import { formatPeriodDuration, getRentLabel } from '../../lib/periodCalculations'
import type { LeaseWithDetails } from './LeasesPage'
import type { Payment, RpcResponse } from '../../lib/types'

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
          <div className="p-6 space-y-8">
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
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
                {lease.status === 'active' && (
                  <button
                    onClick={() => setShowPaymentForm(true)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Record Payment
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Periods Elapsed</p>
                      <p className="text-xl font-semibold text-blue-900">
                        {calculations.periodsElapsed} / {calculations.totalPeriods === 0 ? '∞' : calculations.totalPeriods}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Total Paid</p>
                      <p className="text-xl font-semibold text-green-900">${calculations.totalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Amount Due</p>
                      <p className="text-xl font-semibold text-yellow-900">${calculations.amountDue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-purple-800">Next Due</p>
                      <p className="text-sm font-semibold text-purple-900">
                        {calculations.nextDueDate 
                          ? `${calculations.daysUntilNextPayment} days`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-indigo-800">Calculated Total</p>
                      <p className="text-xl font-semibold text-indigo-900">${calculations.calculatedTotalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {calculations.nextDueDate && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Next payment due:</span> {format(calculations.nextDueDate, 'MMM dd, yyyy')}
                    {calculations.daysUntilNextPayment < 0 && (
                      <span className="ml-2 text-red-600 font-medium">
                        ({Math.abs(calculations.daysUntilNextPayment)} days overdue)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Complete Payment Schedule */}
          {calculations && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Payment Schedule</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {calculations.paymentDueList.map((due) => (
                        <tr key={due.periodNumber} className={`${
                          due.isOverdue ? 'bg-red-50' : 
                          due.isAdvance ? 'bg-indigo-50' : 
                          due.isPaid ? 'bg-green-50' : 'bg-white'
                        }`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            Period {due.periodNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(due.dueDate, 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${due.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {due.isPaid ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Paid
                                </span>
                              ) : due.isOverdue ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Overdue
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </span>
                              )}
                              {due.isAdvance && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  Advance
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {due.paymentDate ? (
                              <div>
                                <div>{format(due.paymentDate, 'MMM dd, yyyy')}</div>
                                {due.paymentAmount && due.paymentAmount !== due.amount && (
                                  <div className="text-xs text-gray-500">
                                    (${due.paymentAmount.toLocaleString()})
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          {calculations && calculations.paymentHistory.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                {lease.status === 'active' && (
                  <button
                    onClick={() => setShowRefundForm(true)}
                    className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Process Refund
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {calculations.paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      payment.type === 'refund' ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        payment.status === 'paid' ? 'bg-green-500' :
                        payment.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.type === 'refund' ? '-$' : '$'}{Math.abs(payment.amount).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy')} • {payment.type}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-gray-500">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                      {payment.type === 'refund' && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          REFUND
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lease Terms */}
          {lease.terms && Object.keys(lease.terms).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Terms</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lease.terms.lease_term && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Lease Term</p>
                      <p className="text-gray-900">{lease.terms.lease_term}</p>
                    </div>
                  )}
                  {lease.terms.notes && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-gray-700">Notes</p>
                      <p className="text-gray-900">{lease.terms.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Recording Form */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
                <button
                  onClick={() => {
                    setShowPaymentForm(false)
                    setPaymentError('')
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                {paymentError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {paymentError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payment_amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Amount *
                    </label>
                    <input
                      id="payment_amount"
                      type="number"
                      step="0.01"
                      required
                      value={paymentFormData.amount}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={lease.monthly_rent.toString()}
                    />
                  </div>

                  <div>
                    <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date *
                    </label>
                    <input
                      id="payment_date"
                      type="date"
                      required
                      value={paymentFormData.payment_date}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="payment_notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="payment_notes"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Payment method, reference number, etc."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false)
                      setPaymentError('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={recordingPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {recordingPayment ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
        {/* Refund Form Modal */}
        {showRefundForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Process Refund</h3>
                <button
                  onClick={() => {
                    setShowRefundForm(false)
                    setRefundError('')
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRefund} className="p-6 space-y-4">
                {refundError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {refundError}
                  </div>
                )}

                <div>
                  <label htmlFor="refund_payment" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Payment to Refund *
                  </label>
                  <select
                    id="refund_payment"
                    required
                    value={refundFormData.payment_id}
                    onChange={(e) => {
                      const payment = calculations?.paymentHistory.find(p => p.id === e.target.value)
                      const refundedAmount = calculations?.paymentRefunds?.get(e.target.value) || 0
                      const maxRefund = payment ? payment.amount - refundedAmount : 0
                      setRefundFormData({ 
                        ...refundFormData, 
                        payment_id: e.target.value,
                        amount: maxRefund > 0 ? maxRefund.toString() : ''
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a payment</option>
                    {calculations?.paymentHistory
                      .filter(p => {
                        if (p.type !== 'rent' || p.status !== 'paid') return false
                        const refundedAmount = calculations.paymentRefunds?.get(p.id) || 0
                        return refundedAmount < p.amount // Only show if not fully refunded
                      })
                      .map((payment) => (
                        <option key={payment.id} value={payment.id}>
                          ${payment.amount} - {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Refund Amount *
                  </label>
                  {refundFormData.payment_id && calculations?.paymentRefunds && (
                    <div className="mb-2 text-sm text-gray-600">
                      {(() => {
                        const payment = calculations.paymentHistory.find(p => p.id === refundFormData.payment_id)
                        const refundedAmount = calculations.paymentRefunds.get(refundFormData.payment_id) || 0
                        const maxRefund = payment ? payment.amount - refundedAmount : 0
                        return (
                          <>
                            Original: ${payment?.amount.toLocaleString() || 0} | 
                            Already Refunded: ${refundedAmount.toLocaleString()} | 
                            Max Refund: ${maxRefund.toLocaleString()}
                          </>
                        )
                      })()}
                    </div>
                  )}
                  <input
                    id="refund_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(() => {
                      if (!refundFormData.payment_id || !calculations?.paymentRefunds) return undefined
                      const payment = calculations.paymentHistory.find(p => p.id === refundFormData.payment_id)
                      const refundedAmount = calculations.paymentRefunds.get(refundFormData.payment_id) || 0
                      return payment ? payment.amount - refundedAmount : undefined
                    })()}
                    required
                    value={refundFormData.amount}
                    onChange={(e) => setRefundFormData({ ...refundFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="refund_reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Refund *
                  </label>
                  <textarea
                    id="refund_reason"
                    required
                    value={refundFormData.reason}
                    onChange={(e) => setRefundFormData({ ...refundFormData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Reason for processing this refund..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRefundForm(false)
                      setRefundError('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingRefund}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {processingRefund ? 'Processing...' : 'Process Refund'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )
}