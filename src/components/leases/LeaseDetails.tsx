import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { LeaseWithDetails } from './LeasesPage'

// Import the new hook
import { useLeaseCalculations } from '../../hooks/useLeaseCalculations'; 

// Import child components
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

export function LeaseDetails({ lease, onClose, onUpdated }: LeaseDetailsProps) {
  // === LOGIC IS REPLACED BY THIS SINGLE HOOK CALL ===
  const { loading, calculations, recordPayment, processRefund } = useLeaseCalculations({ lease, onUpdated });

  // State for forms is kept in the UI component, as it's purely a UI concern
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

  // The handlers now just call the functions returned from the hook
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecordingPayment(true)
    setPaymentError('')
    
    try {
      const data = await recordPayment(paymentFormData);
      if (data?.success) {
        setShowPaymentForm(false)
        setPaymentFormData({ amount: '', payment_date: new Date().toISOString().split('T')[0], notes: '' })
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
      const data = await processRefund(refundFormData);
      if (data?.success) {
        setShowRefundForm(false)
        setRefundFormData({ payment_id: '', amount: '', reason: '' })
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
    // Loading UI remains the same
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (<div key={i} className="h-20 bg-gray-200 rounded"></div>))}
              </div>
            </div>
          </div>
      </div>
    )
  }

  // === THE JSX REMAINS VIRTUALLY UNCHANGED ===
  // It just uses the 'calculations' object returned from the hook
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          {/* ... Header ... */}
           <div>
            <h2 className="text-2xl font-semibold text-gray-900">Lease Details</h2>
            <p className="text-gray-600">{lease.property?.name} - {lease.tenant?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
            <LeaseInfoHeader
              tenantName={lease.tenant?.name} tenantEmail={lease.tenant?.email}
              propertyName={lease.property?.name} propertyAddress={lease.property?.address}
              startDate={lease.start_date} endDate={lease.end_date}
              periodCount={lease.period_count} periodType={lease.property?.period_type}
              monthlyRent={lease.monthly_rent} securityDeposit={lease.security_deposit}
              status={lease.status} autoCalculateEndDate={lease.auto_calculate_end_date}
            />

          {calculations && (
             <FinancialSummary
                calculations={calculations}
                leaseStatus={lease.status}
                onRecordPaymentClick={() => setShowPaymentForm(true)}
              />
          )}

          {calculations && <PaymentSchedule paymentDueList={calculations.paymentDueList} />}

          {calculations && calculations.paymentHistory.length > 0 && (
            <PaymentHistory
              paymentHistory={calculations.paymentHistory}
              leaseStatus={lease.status}
              onProcessRefundClick={() => setShowRefundForm(true)}
            />
          )}

          {lease.terms && Object.keys(lease.terms).length > 0 && (
            <LeaseTerms terms={lease.terms} />
          )}
        </div>

        {showPaymentForm && (
          <RecordPaymentModal
            isOpen={showPaymentForm}
            onClose={() => { setShowPaymentForm(false); setPaymentError(''); }}
            onSubmit={handleRecordPayment}
            formData={paymentFormData} setFormData={setPaymentFormData}
            isRecording={recordingPayment} paymentError={paymentError}
            defaultRentAmount={lease.monthly_rent}
          />
        )}
      </div> 
        {showRefundForm && (
          <ProcessRefundModal
            isOpen={showRefundForm}
            onClose={() => { setShowRefundForm(false); setRefundError(''); }}
            onSubmit={handleRefund}
            formData={refundFormData} setFormData={setRefundFormData}
            isProcessing={processingRefund} refundError={refundError}
            calculations={calculations}
          />
        )}
    </div>
  )
}