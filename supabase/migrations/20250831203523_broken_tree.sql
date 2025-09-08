/*
  # Fix get_due_payments function

  1. Updates
    - Remove reference to non-existent due_dates table
    - Calculate due payments directly from active leases
    - Use period calculations to determine payment schedules

  2. Logic
    - For each active lease, calculate how many periods have elapsed
    - Compare with actual payments to determine outstanding amounts
    - Return overdue and upcoming payments
*/

CREATE OR REPLACE FUNCTION public.get_due_payments(landlord_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_lease record;
  v_periods_elapsed integer;
  v_total_paid numeric;
  v_amount_due numeric;
  v_days_since_start integer;
  v_next_due_date date;
  v_days_overdue integer;
BEGIN
  -- Get all active leases for the landlord
  FOR v_lease IN
    SELECT 
      l.id as lease_id,
      l.start_date,
      l.end_date,
      l.monthly_rent,
      l.period_count,
      l.auto_calculate_end_date,
      p.name as property_name,
      p.address as property_address,
      p.period_type,
      t.name as tenant_name
    FROM leases l
    JOIN properties p ON l.property_id = p.id
    JOIN tenants t ON l.tenant_id = t.id
    WHERE l.status = 'active'
    AND p.landlord_id = get_due_payments.landlord_id
  LOOP
    -- Calculate days since lease start
    v_days_since_start := EXTRACT(DAY FROM (CURRENT_DATE - v_lease.start_date));
    
    -- Calculate periods elapsed based on period type
    CASE v_lease.period_type
      WHEN 'daily' THEN
        v_periods_elapsed := GREATEST(0, v_days_since_start);
        v_next_due_date := v_lease.start_date + (v_periods_elapsed + 1);
      WHEN 'weekly' THEN
        v_periods_elapsed := GREATEST(0, FLOOR(v_days_since_start / 7));
        v_next_due_date := v_lease.start_date + ((v_periods_elapsed + 1) * 7);
      WHEN 'monthly' THEN
        v_periods_elapsed := GREATEST(0, FLOOR(v_days_since_start / 30));
        v_next_due_date := v_lease.start_date + ((v_periods_elapsed + 1) * 30);
      WHEN 'yearly' THEN
        v_periods_elapsed := GREATEST(0, FLOOR(v_days_since_start / 365));
        v_next_due_date := v_lease.start_date + ((v_periods_elapsed + 1) * 365);
      ELSE
        -- Default to monthly
        v_periods_elapsed := GREATEST(0, FLOOR(v_days_since_start / 30));
        v_next_due_date := v_lease.start_date + ((v_periods_elapsed + 1) * 30);
    END CASE;

    -- Don't exceed the lease period if it has a defined end
    IF v_lease.period_count IS NOT NULL THEN
      v_periods_elapsed := LEAST(v_periods_elapsed, v_lease.period_count);
    END IF;

    -- Calculate total amount that should have been paid
    v_amount_due := v_periods_elapsed * v_lease.monthly_rent;

    -- Get total amount actually paid
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM payments
    WHERE lease_id = v_lease.lease_id
    AND status = 'paid'
    AND type != 'refund';

    -- Calculate days overdue
    v_days_overdue := GREATEST(0, EXTRACT(DAY FROM (CURRENT_DATE - v_next_due_date)));

    -- Only include if there's an outstanding balance or upcoming payment
    IF v_amount_due > v_total_paid OR v_days_overdue <= 7 THEN
      v_result := v_result || jsonb_build_object(
        'due_date_id', gen_random_uuid(),
        'due_date', v_next_due_date,
        'amount_due', GREATEST(0, v_amount_due - v_total_paid),
        'status', CASE 
          WHEN v_amount_due <= v_total_paid THEN 'paid'
          WHEN v_days_overdue > 0 THEN 'overdue'
          ELSE 'pending'
        END,
        'tenant_name', v_lease.tenant_name,
        'property_name', v_lease.property_name,
        'property_address', v_lease.property_address,
        'property_period_type', v_lease.period_type,
        'days_overdue', v_days_overdue
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'data', v_result
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error fetching due payments: ' || SQLERRM
    );
END;
$$;