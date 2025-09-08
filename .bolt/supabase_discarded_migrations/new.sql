CREATE OR REPLACE FUNCTION public.create_lease(p_tenant_id uuid, p_property_id uuid, p_lease_terms jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_lease_id uuid;
  v_property_rent decimal;
  result jsonb;
BEGIN
  -- Validate tenant belongs to landlord
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = p_tenant_id AND landlord_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant not found or access denied');
  END IF;

  -- Validate property belongs to landlord
  SELECT monthly_rent INTO v_property_rent
  FROM properties 
  WHERE id = p_property_id AND landlord_id = auth.uid();

  IF v_property_rent IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property not found or access denied');
  END IF;

  -- Check for existing active lease on property
  IF EXISTS (
    SELECT 1 FROM leases 
    WHERE p_property_id = create_lease.property_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property already has an active lease');
  END IF;

  -- Insert new lease
  INSERT INTO leases (
    p_tenant_id, 
    p_property_id, 
    start_date, 
    end_date, 
    monthly_rent, 
    security_deposit, 
    terms
  )
  VALUES (
    p_tenant_id,
    p_property_id,
    COALESCE((p_lease_terms->>'start_date')::date, CURRENT_DATE),
    (p_lease_terms->>'end_date')::date,
    COALESCE((p_lease_terms->>'monthly_rent')::decimal, v_property_rent),
    COALESCE((p_lease_terms->>'security_deposit')::decimal, 0),
    p_lease_terms - 'start_date' - 'end_date' - 'monthly_rent' - 'security_deposit'
  )
  RETURNING id INTO new_lease_id;

  result := jsonb_build_object(
    'success', true,
    'message', 'Lease created successfully',
    'lease_id', new_lease_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error creating lease: ' || SQLERRM);
END;
$function$