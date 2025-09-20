/*
# RPC Functions for Rent Management

This migration creates all the required RPC functions that return standardized responses.

## 1. Tenant Management Functions
- create_tenant(tenant_data jsonb)
- update_tenant(tenant_id uuid, tenant_data jsonb)
- delete_tenant(tenant_id uuid)

## 2. Property Management Functions
- create_property(property_data jsonb)
- update_property(property_id uuid, property_data jsonb)

## 3. Lease Management Functions
- create_lease(tenant_id uuid, property_id uuid, lease_terms jsonb)
- terminate_lease(lease_id uuid, termination_date date)

## 4. Maintenance Management Functions
- create_maintenance_request(property_id uuid, request_details jsonb)
- update_maintenance_status(request_id uuid, status text, notes text)

## 5. Payment Management Functions
- collect_payment(lease_id uuid, amount decimal, payment_date date)
- process_refund(payment_id uuid, refund_amount decimal, reason text)
- get_due_payments(landlord_id uuid)
*/

-- Tenant Management Functions
CREATE OR REPLACE FUNCTION create_tenant(tenant_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_tenant_id uuid;
  result jsonb;
BEGIN
  -- Validate required fields
  IF NOT (tenant_data ? 'name') OR (tenant_data->>'name') = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant name is required');
  END IF;

  -- Check for duplicate email if provided
  IF tenant_data ? 'email' AND (tenant_data->>'email') != '' THEN
    IF EXISTS (SELECT 1 FROM tenants WHERE email = (tenant_data->>'email')) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Tenant with this email already exists');
    END IF;
  END IF;

  -- Insert new tenant
  INSERT INTO tenants (landlord_id, name, email, data)
  VALUES (
    auth.uid(),
    tenant_data->>'name',
    NULLIF(tenant_data->>'email', ''),
    tenant_data - 'name' - 'email'
  )
  RETURNING id INTO new_tenant_id;

  result := jsonb_build_object(
    'success', true,
    'message', 'Tenant created successfully',
    'tenant_id', new_tenant_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error creating tenant: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION update_tenant(tenant_id uuid, tenant_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_exists boolean;
BEGIN
  -- Check if tenant exists and belongs to current user
  SELECT EXISTS(
    SELECT 1 FROM tenants 
    WHERE id = tenant_id AND landlord_id = auth.uid()
  ) INTO tenant_exists;

  IF NOT tenant_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant not found or access denied');
  END IF;

  -- Check for duplicate email if provided and different
  IF tenant_data ? 'email' AND (tenant_data->>'email') != '' THEN
    IF EXISTS (
      SELECT 1 FROM tenants 
      WHERE email = (tenant_data->>'email') 
      AND id != tenant_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'Another tenant with this email already exists');
    END IF;
  END IF;

  -- Update tenant
  UPDATE tenants 
  SET 
    name = COALESCE(tenant_data->>'name', name),
    email = CASE 
      WHEN tenant_data ? 'email' THEN NULLIF(tenant_data->>'email', '')
      ELSE email
    END,
    data = tenant_data - 'name' - 'email'
  WHERE id = tenant_id AND landlord_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'message', 'Tenant updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error updating tenant: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION delete_tenant(tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_exists boolean;
  active_leases_count integer;
BEGIN
  -- Check if tenant exists and belongs to current user
  SELECT EXISTS(
    SELECT 1 FROM tenants 
    WHERE id = tenant_id AND landlord_id = auth.uid()
  ) INTO tenant_exists;

  IF NOT tenant_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant not found or access denied');
  END IF;

  -- Check for active leases
  SELECT COUNT(*) INTO active_leases_count
  FROM leases 
  WHERE tenant_id = delete_tenant.tenant_id AND status = 'active';

  IF active_leases_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot delete tenant with active leases');
  END IF;

  -- Delete tenant
  DELETE FROM tenants WHERE id = tenant_id AND landlord_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'message', 'Tenant deleted successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error deleting tenant: ' || SQLERRM);
END;
$$;

-- Property Management Functions
CREATE OR REPLACE FUNCTION create_property(property_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_property_id uuid;
  result jsonb;
BEGIN
  -- Validate required fields
  IF NOT (property_data ? 'name') OR (property_data->>'name') = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property name is required');
  END IF;

  IF NOT (property_data ? 'address') OR (property_data->>'address') = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property address is required');
  END IF;

  -- Insert new property
  INSERT INTO properties (landlord_id, name, address, monthly_rent, data)
  VALUES (
    auth.uid(),
    property_data->>'name',
    property_data->>'address',
    COALESCE((property_data->>'monthly_rent')::decimal, 0),
    property_data - 'name' - 'address' - 'monthly_rent'
  )
  RETURNING id INTO new_property_id;

  result := jsonb_build_object(
    'success', true,
    'message', 'Property created successfully',
    'property_id', new_property_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error creating property: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION update_property(property_id uuid, property_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  property_exists boolean;
BEGIN
  -- Check if property exists and belongs to current user
  SELECT EXISTS(
    SELECT 1 FROM properties 
    WHERE id = property_id AND landlord_id = auth.uid()
  ) INTO property_exists;

  IF NOT property_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property not found or access denied');
  END IF;

  -- Update property
  UPDATE properties 
  SET 
    name = COALESCE(property_data->>'name', name),
    address = COALESCE(property_data->>'address', address),
    monthly_rent = COALESCE((property_data->>'monthly_rent')::decimal, monthly_rent),
    data = property_data - 'name' - 'address' - 'monthly_rent'
  WHERE id = property_id AND landlord_id = auth.uid();

  RETURN jsonb_build_object('success', true, 'message', 'Property updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error updating property: ' || SQLERRM);
END;
$$;

-- Lease Management Functions
CREATE OR REPLACE FUNCTION create_lease(tenant_id uuid, property_id uuid, lease_terms jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_lease_id uuid;
  property_rent decimal;
  result jsonb;
BEGIN
  -- Validate tenant belongs to landlord
  IF NOT EXISTS (
    SELECT 1 FROM tenants 
    WHERE id = tenant_id AND landlord_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tenant not found or access denied');
  END IF;

  -- Validate property belongs to landlord
  SELECT monthly_rent INTO property_rent
  FROM properties 
  WHERE id = property_id AND landlord_id = auth.uid();

  IF property_rent IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property not found or access denied');
  END IF;

  -- Check for existing active lease on property
  IF EXISTS (
    SELECT 1 FROM leases 
    WHERE property_id = create_lease.property_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property already has an active lease');
  END IF;

  -- Insert new lease
  INSERT INTO leases (
    tenant_id, 
    property_id, 
    start_date, 
    end_date, 
    monthly_rent, 
    security_deposit, 
    terms
  )
  VALUES (
    tenant_id,
    property_id,
    COALESCE((lease_terms->>'start_date')::date, CURRENT_DATE),
    (lease_terms->>'end_date')::date,
    COALESCE((lease_terms->>'monthly_rent')::decimal, property_rent),
    COALESCE((lease_terms->>'security_deposit')::decimal, 0),
    lease_terms - 'start_date' - 'end_date' - 'monthly_rent' - 'security_deposit'
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
$$;

CREATE OR REPLACE FUNCTION terminate_lease(lease_id uuid, termination_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lease_exists boolean;
BEGIN
  -- Check if lease exists and belongs to landlord's property
  SELECT EXISTS (
    SELECT 1 FROM leases l
    JOIN properties p ON l.property_id = p.id
    WHERE l.id = lease_id 
    AND p.landlord_id = auth.uid()
    AND l.status = 'active'
  ) INTO lease_exists;

  IF NOT lease_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Active lease not found or access denied');
  END IF;

  -- Update lease status and end date
  UPDATE leases 
  SET 
    status = 'terminated',
    end_date = termination_date
  WHERE id = lease_id;

  RETURN jsonb_build_object('success', true, 'message', 'Lease terminated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error terminating lease: ' || SQLERRM);
END;
$$;

-- Maintenance Management Functions
CREATE OR REPLACE FUNCTION create_maintenance_request(property_id uuid, request_details jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_request_id uuid;
  result jsonb;
BEGIN
  -- Validate property belongs to landlord
  IF NOT EXISTS (
    SELECT 1 FROM properties 
    WHERE id = property_id AND landlord_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Property not found or access denied');
  END IF;

  -- Validate required fields
  IF NOT (request_details ? 'title') OR (request_details->>'title') = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maintenance request title is required');
  END IF;

  -- Insert new maintenance request
  INSERT INTO maintenance_requests (
    property_id, 
    title, 
    description, 
    priority, 
    details
  )
  VALUES (
    property_id,
    request_details->>'title',
    request_details->>'description',
    COALESCE(request_details->>'priority', 'medium'),
    request_details - 'title' - 'description' - 'priority'
  )
  RETURNING id INTO new_request_id;

  result := jsonb_build_object(
    'success', true,
    'message', 'Maintenance request created successfully',
    'request_id', new_request_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error creating maintenance request: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION update_maintenance_status(request_id uuid, new_status text, notes text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_exists boolean;
BEGIN
  -- Check if request exists and belongs to landlord's property
  SELECT EXISTS (
    SELECT 1 FROM maintenance_requests mr
    JOIN properties p ON mr.property_id = p.id
    WHERE mr.id = request_id 
    AND p.landlord_id = auth.uid()
  ) INTO request_exists;

  IF NOT request_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maintenance request not found or access denied');
  END IF;

  -- Validate status
  IF new_status NOT IN ('pending', 'in_progress', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid status. Must be pending, in_progress, or completed');
  END IF;

  -- Update maintenance request
  UPDATE maintenance_requests 
  SET 
    status = new_status,
    details = COALESCE(details, '{}'::jsonb) || jsonb_build_object('notes', notes),
    updated_at = now()
  WHERE id = request_id;

  RETURN jsonb_build_object('success', true, 'message', 'Maintenance request updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error updating maintenance request: ' || SQLERRM);
END;
$$;

-- Payment Management Functions
CREATE OR REPLACE FUNCTION collect_payment(lease_id uuid, amount decimal, payment_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  lease_exists boolean;
  new_payment_id uuid;
  result jsonb;
BEGIN
  -- Check if lease exists and belongs to landlord's property
  SELECT EXISTS (
    SELECT 1 FROM leases l
    JOIN properties p ON l.property_id = p.id
    WHERE l.id = lease_id 
    AND p.landlord_id = auth.uid()
    AND l.status = 'active'
  ) INTO lease_exists;

  IF NOT lease_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Active lease not found or access denied');
  END IF;

  -- Validate amount
  IF amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment amount must be greater than 0');
  END IF;

  -- Insert payment record
  INSERT INTO payments (lease_id, amount, payment_date, type, status)
  VALUES (lease_id, amount, payment_date, 'rent', 'paid')
  RETURNING id INTO new_payment_id;

  -- Update any matching due dates to paid
  UPDATE due_dates 
  SET status = 'paid'
  WHERE lease_id = collect_payment.lease_id 
  AND due_date <= payment_date 
  AND status = 'pending';

  result := jsonb_build_object(
    'success', true,
    'message', 'Payment collected successfully',
    'payment_id', new_payment_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error collecting payment: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION process_refund(payment_id uuid, refund_amount decimal, reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_exists boolean;
  original_amount decimal;
  new_refund_id uuid;
  result jsonb;
BEGIN
  -- Check if payment exists and belongs to landlord's lease
  SELECT p.amount INTO original_amount
  FROM payments p
  JOIN leases l ON p.lease_id = l.id
  JOIN properties pr ON l.property_id = pr.id
  WHERE p.id = payment_id 
  AND pr.landlord_id = auth.uid()
  AND p.status = 'paid';

  IF original_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment not found or access denied');
  END IF;

  -- Validate refund amount
  IF refund_amount <= 0 OR refund_amount > original_amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid refund amount');
  END IF;

  -- Create refund record
  INSERT INTO payments (
    lease_id, 
    amount, 
    payment_date, 
    type, 
    status, 
    notes
  )
  SELECT 
    lease_id,
    -refund_amount,
    CURRENT_DATE,
    'refund',
    'paid',
    COALESCE(reason, 'Refund processed')
  FROM payments 
  WHERE id = payment_id
  RETURNING id INTO new_refund_id;

  result := jsonb_build_object(
    'success', true,
    'message', 'Refund processed successfully',
    'refund_id', new_refund_id
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error processing refund: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION get_due_payments(landlord_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check authorization
  IF landlord_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Access denied');
  END IF;

  -- Get due payments with tenant and property information
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Due payments retrieved successfully',
    'data', COALESCE(jsonb_agg(
      jsonb_build_object(
        'due_date_id', dd.id,
        'due_date', dd.due_date,
        'amount_due', dd.amount_due,
        'status', dd.status,
        'tenant_name', t.name,
        'property_name', p.name,
        'property_address', p.address,
        'days_overdue', CASE 
          WHEN dd.due_date < CURRENT_DATE AND dd.status = 'pending' 
          THEN CURRENT_DATE - dd.due_date 
          ELSE 0 
        END
      )
    ), '[]'::jsonb)
  ) INTO result
  FROM due_dates dd
  JOIN leases l ON dd.lease_id = l.id
  JOIN tenants t ON l.tenant_id = t.id
  JOIN properties p ON l.property_id = p.id
  WHERE p.landlord_id = landlord_id
  AND dd.status IN ('pending', 'overdue')
  ORDER BY dd.due_date ASC;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Error retrieving due payments: ' || SQLERRM);
END;
$$;

-- Function to automatically update overdue payments
CREATE OR REPLACE FUNCTION update_overdue_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE due_dates 
  SET status = 'overdue'
  WHERE due_date < CURRENT_DATE 
  AND status = 'pending';
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_tenant(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_tenant(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_property(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_property(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION create_lease(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION terminate_lease(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION create_maintenance_request(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_maintenance_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION collect_payment(uuid, decimal, date) TO authenticated;
GRANT EXECUTE ON FUNCTION process_refund(uuid, decimal, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_due_payments(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_overdue_payments() TO authenticated;