import { addMinutes, addHours, addDays, addWeeks, addMonths, addYears } from 'date-fns'

export type PeriodType = 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface PeriodOption {
  value: PeriodType
  label: string
  shortLabel: string
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'minutes', label: 'Minutes', shortLabel: 'min' },
  { value: 'hourly', label: 'Hourly', shortLabel: 'hr' },
  { value: 'daily', label: 'Daily', shortLabel: 'day' },
  { value: 'weekly', label: 'Weekly', shortLabel: 'wk' },
  { value: 'monthly', label: 'Monthly', shortLabel: 'mo' },
  { value: 'yearly', label: 'Yearly', shortLabel: 'yr' }
]

export function calculateEndDate(
  startDate: Date,
  periodCount: number,
  periodType: PeriodType
): Date {
  switch (periodType) {
    case 'minutes':
      return addMinutes(startDate, periodCount)
    case 'hourly':
      return addHours(startDate, periodCount)
    case 'daily':
      return addDays(startDate, periodCount)
    case 'weekly':
      return addWeeks(startDate, periodCount)
    case 'monthly':
      return addMonths(startDate, periodCount)
    case 'yearly':
      return addYears(startDate, periodCount)
    default:
      throw new Error(`Unsupported period type: ${periodType}`)
  }
}

export function formatPeriodDuration(
  periodCount: number,
  periodType: PeriodType
): string {
  const option = PERIOD_OPTIONS.find(opt => opt.value === periodType)
  if (!option) return `${periodCount} periods`
  
  const label = periodCount === 1 
    ? option.label.slice(0, -1) // Remove 's' for singular
    : option.label.toLowerCase()
  
  return `${periodCount} ${label}`
}

export function getPeriodLabel(periodType: PeriodType): string {
  const option = PERIOD_OPTIONS.find(opt => opt.value === periodType)
  return option?.label || 'Period'
}

export function getRentLabel(periodType: PeriodType): string {
  switch (periodType) {
    case 'minutes':
      return 'per minute'
    case 'hourly':
      return 'per hour'
    case 'daily':
      return 'per day'
    case 'weekly':
      return 'per week'
    case 'monthly':
      return 'per month'
    case 'yearly':
      return 'per year'
    default:
      return 'per period'
  }
}