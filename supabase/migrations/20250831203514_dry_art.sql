/*
  # Fix collect_payment function

  1. Updates
    - Remove reference to non-existent due_dates table
    - Simplify payment collection to just insert payment record
    - Remove due date status updates since we removed the due_dates table

  2. Security
    - Maintain existing RLS policies
    - Ensure only landlords can collect payments for their properties
*/

CREATE OR REPLACE FUNCTION public.collect_payment(
  p_lease_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lease_exists boolean;
  v_payment_id uuid;
BEGIN
  -- Verify lease exists and belongs to the current user
  SELECT EXISTS(
    SELECT 1 
    FROM leases l
    JOIN properties p ON l.property_id = p.id
    WHERE l.id = collect_payment.p_lease_id 
    AND p.landlord_id = auth.uid()
  ) INTO v_lease_exists;

  IF NOT v_lease_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Lease not found or access denied'
    );
  END IF;

  -- Insert payment record
  INSERT INTO public.payments (
    lease_id,
    amount,
    payment_date,
    type,
    status,
    notes
  ) VALUES (
    collect_payment.p_lease_id,
    collect_payment.p_amount,
    collect_payment.p_payment_date,
    'rent',
    'paid',
    collect_payment.p_notes
  ) RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment recorded successfully',
    'payment_id', v_payment_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error recording payment: ' || SQLERRM
    );
END;
$$;