import React from 'react'
import { supabase } from '../../lib/supabase'
import { useState } from 'react'
import { 
  CreditCard, 
  RefreshCw, 
  AlertTriangle, 
  User, 
  Building, 
  Mail, 
  MapPin,
  MessageSquareText,
  RotateCcw,
  Printer,
  Download,
  FileImage,
  ChevronDown
} from 'lucide-react'
import { useReceiptGenerator } from '../../hooks/useReceiptGenerator'
import type { RpcResponse } from '../../lib/types'

// Interface for the payment object, ensuring type safety
interface PaymentWithDetails {
  id: string
  amount: number
  payment_date: string
  type: 'rent' | 'deposit' | 'refund'
  status: 'paid' | 'pending' | 'failed'
  notes?: string | null
  tenant?: { name: string; email?: string }
  property?: { name: string; address: string }
  refunded_amount?: number
  is_refunded?: boolean
}

// Interface for the component's props
interface PaymentCardProps {
  payment: PaymentWithDetails
  onUpdated: () => void
}

// A map to get colors and icons for different statuses
const statusStyles = {
  paid: {
    icon: <CreditCard className="w-4 h-4 text-green-600" />,
    textColor: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  pending: {
    icon: <RefreshCw className="w-4 h-4 text-yellow-600" />,
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  failed: {
    icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    textColor: 'text-red-700',
    bgColor: 'bg-red-100',
  },
}

export function PaymentCard({ payment, onUpdated }: PaymentCardProps) {
  const { printReceipt, downloadReceiptPDF, downloadReceiptImage } = useReceiptGenerator()
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [showReceiptOptions, setShowReceiptOptions] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const canRefund = payment.status === 'paid' && payment.type !== 'refund' && !payment.is_refunded
  const maxRefundAmount = payment.amount - (payment.refunded_amount || 0)

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setError('')

    try {
      const { data } = await supabase.rpc('process_refund', {
        payment_id: payment.id,
        refund_amount: parseFloat(refundAmount),
        reason: refundReason
      }) as { data: RpcResponse }

      if (data?.success) {
        setShowRefundForm(false)
        setRefundAmount('')
        setRefundReason('')
        onUpdated()
      } else {
        setError(data?.message || 'Failed to process refund')
      }
    } catch (err) {
      console.error('Error processing refund:', err)
      setError('An unexpected error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrintReceipt = async () => {
    try {
      await printReceipt(payment)
      setShowReceiptOptions(false)
    } catch (error) {
      console.error('Error printing receipt:', error)
      alert('Failed to print receipt')
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await downloadReceiptPDF(payment)
      setShowReceiptOptions(false)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert('Failed to download PDF')
    }
  }

  const handleDownloadImage = async () => {
    try {
      await downloadReceiptImage(payment)
      setShowReceiptOptions(false)
    } catch (error) {
      console.error('Error downloading image:', error)
      alert('Failed to download image')
    }
  }
  return (
    <>
      <div className={`bg-white p-4 rounded-lg shadow border ${
        payment.is_refunded ? 'border-orange-200 bg-orange-50' : 'border-gray-100'
      }`}>
      {/* --- Main Content Area --- */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        
        {/* Left Side: Primary Info */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold ${
              payment.type === 'refund' ? 'text-red-600' : 'text-gray-800'
            }`}>
              {payment.type === 'refund' ? '-' : ''}${Math.abs(payment.amount).toLocaleString()}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[payment.status].bgColor} ${statusStyles[payment.status].textColor}`}>
              {statusStyles[payment.status].icon}
              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
            </span>
            {payment.is_refunded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                <RotateCcw className="w-3 h-3" />
                Refunded
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4 text-gray-400" />
            <span>Tenant:</span>
            <span className="font-medium text-gray-900">{payment.tenant?.name || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{payment.tenant?.email || 'No email'}</span>
          </div>
        </div>

        {/* Right Side: Secondary Info */}
        <div className="flex-1 space-y-2 text-left sm:text-right">
            <div className="text-sm text-gray-600">
                <span>Date: </span>
                <span className="font-medium">{new Date(payment.payment_date).toLocaleDateString()}</span>
            </div>
             <div className="text-xs text-gray-600">
                <span>Type: </span>
                <span className="font-semibold capitalize">{payment.type}</span>
            </div>
            {payment.refunded_amount && payment.refunded_amount > 0 && (
              <div className="text-xs text-orange-600">
                <span>Refunded: </span>
                <span className="font-semibold">${payment.refunded_amount.toLocaleString()}</span>
              </div>
            )}
           <div className="flex items-center gap-2 text-sm text-gray-700 sm:justify-end">
            <Building className="w-4 h-4 text-gray-400" />
            <span>Property:</span>
            <span className="font-medium text-gray-900">{payment.property?.name || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 sm:justify-end">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{payment.property?.address || 'No address'}</span>
          </div>
        </div>
      </div>

      {/* Refund Button */}
      {canRefund && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRefundForm(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Process Refund
            </button>
          </div>
        </div>
      )}

      {/* Receipt Actions */}
      {payment.status === 'paid' && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowReceiptOptions(!showReceiptOptions)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Receipt
              <ChevronDown className={`w-4 h-4 transition-transform ${showReceiptOptions ? 'rotate-180' : ''}`} />
            </button>
            
            {showReceiptOptions && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                <button
                  onClick={handlePrintReceipt}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                <button
                  onClick={handleDownloadImage}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                >
                  <FileImage className="w-4 h-4" />
                  Download Image
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Notes Section (Conditional) --- */}
      {payment.notes && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2 text-xs text-gray-600">
            <MessageSquareText className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="italic">{payment.notes}</p>
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
                setError('')
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleRefund} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-4">
                Original Payment: <span className="font-semibold">${payment.amount.toLocaleString()}</span>
                <br />
                Maximum Refund: <span className="font-semibold">${maxRefundAmount.toLocaleString()}</span>
              </p>
            </div>

            <div>
              <label htmlFor="refund_amount" className="block text-sm font-medium text-gray-700 mb-2">
                Refund Amount *
              </label>
              <input
                id="refund_amount"
                type="number"
                step="0.01"
                min="0.01"
                max={maxRefundAmount}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={maxRefundAmount.toString()}
              />
            </div>

            <div>
              <label htmlFor="refund_reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Refund *
              </label>
              <textarea
                id="refund_reason"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
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
                  setError('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? 'Processing...' : 'Process Refund'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}