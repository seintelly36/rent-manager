import React from 'react';
import { Plus, Clock, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { MetricCard } from './MetricCard'; // Adjust path as needed

// This type should be imported from your custom hook or types file
interface LeaseCalculations {
  periodsElapsed: number;
  totalPeriods: number;
  totalPaid: number;
  amountDue: number;
  nextDueDate: Date | null;
  daysUntilNextPayment: number;
  calculatedTotalPaid: number;
}

interface FinancialSummaryProps {
  calculations: LeaseCalculations;
  leaseStatus: 'active' | 'terminated' | string;
  onRecordPaymentClick: () => void;
}

/**
 * A component that displays a financial overview of the lease, including
 * key metrics and a call-to-action to record a payment.
 */
export function FinancialSummary({ calculations, leaseStatus, onRecordPaymentClick }: FinancialSummaryProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Financial Summary</h3>
        {leaseStatus === 'active' && (
          <button
            onClick={onRecordPaymentClick}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<Clock className="w-5 h-5 text-blue-600" />}
          title="Periods Elapsed"
          value={`${calculations.periodsElapsed} / ${calculations.totalPeriods === 0 ? '∞' : calculations.totalPeriods}`}
          color="blue"
        />
        <MetricCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          title="Total Paid"
          value={`$${calculations.totalPaid.toLocaleString()}`}
          color="green"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5 text-yellow-600" />}
          title="Amount Due"
          value={`$${calculations.amountDue.toLocaleString()}`}
          color="yellow"
        />
        <MetricCard
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
          title="Next Due"
          value={calculations.nextDueDate ? `${calculations.daysUntilNextPayment} days` : 'N/A'}
          color="purple"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          title="Calculated Total"
          value={`$${calculations.calculatedTotalPaid.toLocaleString()}`}
          color="indigo"
        />
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
  );
}