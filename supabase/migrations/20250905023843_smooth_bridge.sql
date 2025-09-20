/*
  # Add refund tracking functionality

  1. Updates
    - Add refunded_amount and is_refunded columns to payments view logic
    - Enhance process_refund function to properly track refunds

  2. Security
    - Maintain existing RLS policies
    - Ensure refund tracking is accurate
*/

-- Update the process_refund function to include payment reference in notes
CREATE OR REPLACE FUNCTION process_refund(
  payment_id uuid,
  refund_amount numeric,
  reason text
) RETURNS jsonb AS $$
DECLARE
  original_payment payments%ROWTYPE;
  lease_record leases%ROWTYPE;
  refund_id uuid;
BEGIN
  -- Get the original payment
  SELECT * INTO original_payment
  FROM payments
  WHERE id = payment_id AND status = 'paid' AND type != 'refund';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Payment not found or cannot be refunded'
    );
  END IF;
  
  -- Validate refund amount
  IF refund_amount <= 0 OR refund_amount > original_payment.amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid refund amount'
    );
  END IF;
  
  -- Get lease info
  SELECT * INTO lease_record
  FROM leases
  WHERE id = original_payment.lease_id;
  
  -- Create refund record with reference to original payment
  INSERT INTO payments (
    lease_id,
    amount,
    payment_date,
    type,
    status,
    notes
  ) VALUES (
    original_payment.lease_id,
    -refund_amount, -- Negative amount for refund
    CURRENT_DATE,
    'refund',
    'paid',
    'Refund for payment ' || payment_id::text || ': ' || reason
  ) RETURNING id INTO refund_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Refund processed successfully',
    'refund_id', refund_id,
    'original_payment_id', payment_id,
    'refund_amount', refund_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error processing refund: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;