/*
  # Remove due_dates table and fix lease creation

  1. Changes
    - Drop due_dates table and related policies
    - Update create_lease function to remove due_dates generation
    - Remove get_due_payments function dependency on due_dates
  2. Security
    - Clean up RLS policies for removed table
*/

-- Drop due_dates table and related objects
DROP TABLE IF EXISTS due_dates CASCADE;

-- Update create_lease function to remove due_dates generation
CREATE OR REPLACE FUNCTION public.create_lease(
  p_tenant_id uuid,
  p_property_id uuid,
  p_lease_terms jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_landlord_id uuid;
  v_lease_id uuid;
  v_start_date date;
  v_end_date date;
  v_monthly_rent numeric;
  v_security_deposit numeric;
  v_period_count integer;
  v_auto_calculate boolean;
BEGIN
  -- Get landlord_id from property
  SELECT landlord_id INTO v_landlord_id
  FROM properties
  WHERE id = p_property_id;

  -- Check if property belongs to current user
  IF v_landlord_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Property not found or access denied'
    );
  END IF;

  -- Check if tenant belongs to current user
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id AND landlord_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Tenant not found or access denied'
    );
  END IF;

  -- Extract lease terms
  v_start_date := (p_lease_terms->>'start_date')::date;
  v_end_date := CASE 
    WHEN p_lease_terms->>'end_date' IS NOT NULL 
    THEN (p_lease_terms->>'end_date')::date 
    ELSE NULL 
  END;
  v_monthly_rent := (p_lease_terms->>'monthly_rent')::numeric;
  v_security_deposit := COALESCE((p_lease_terms->>'security_deposit')::numeric, 0);
  v_period_count := CASE 
    WHEN p_lease_terms->>'period_count' IS NOT NULL 
    THEN (p_lease_terms->>'period_count')::integer 
    ELSE NULL 
  END;
  v_auto_calculate := COALESCE((p_lease_terms->>'auto_calculate_end_date')::boolean, false);

  -- Create lease
  INSERT INTO leases (
    tenant_id,
    property_id,
    start_date,
    end_date,
    monthly_rent,
    security_deposit,
    period_count,
    auto_calculate_end_date,
    terms
  ) VALUES (
    create_lease.p_tenant_id,
    create_lease.p_property_id,
    v_start_date,
    v_end_date,
    v_monthly_rent,
    v_security_deposit,
    v_period_count,
    v_auto_calculate,
    p_lease_terms
  ) RETURNING id INTO v_lease_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lease created successfully',
    'lease_id', v_lease_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error creating lease: ' || SQLERRM
    );
END;
$$;

-- Update get_due_payments function to work without due_dates table
CREATE OR REPLACE FUNCTION public.get_due_payments(landlord_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() != landlord_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Access denied'
    );
  END IF;

  -- Get upcoming payments based on active leases
  -- This is a simplified version that calculates based on lease start dates
  WITH lease_payments AS (
    SELECT 
      l.id as lease_id,
      l.start_date,
      l.monthly_rent as amount_due,
      t.name as tenant_name,
      p.name as property_name,
      p.address as property_address,
      p.period_type as property_period_type,
      CASE 
        WHEN CURRENT_DATE > l.start_date THEN 
          EXTRACT(DAY FROM CURRENT_DATE - l.start_date)::integer
        ELSE 0
      END as days_overdue
    FROM leases l
    JOIN tenants t ON l.tenant_id = t.id
    JOIN properties p ON l.property_id = p.id
    WHERE p.landlord_id = get_due_payments.landlord_id
      AND l.status = 'active'
      AND (l.end_date IS NULL OR l.end_date >= CURRENT_DATE)
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'due_date_id', gen_random_uuid(),
      'due_date', start_date,
      'amount_due', amount_due,
      'status', 'pending',
      'tenant_name', tenant_name,
      'property_name', property_name,
      'property_address', property_address,
      'property_period_type', property_period_type,
      'days_overdue', days_overdue
    )
  ) INTO v_result
  FROM lease_payments;

  RETURN jsonb_build_object(
    'success', true,
    'data', COALESCE(v_result, '[]'::jsonb)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error fetching due payments: ' || SQLERRM
    );
END;
$$;