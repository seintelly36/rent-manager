/*
  # Update RPC Functions for Period Flexibility

  1. Function Updates
    - Update create_lease function to handle period_count and auto_calculate_end_date
    - Update create_property function to handle period_type
    - Update update_property function to handle period_type

  2. Backward Compatibility
    - Maintain existing functionality for properties without period_type
    - Handle leases with or without period_count gracefully
*/

-- Update create_property function
CREATE OR REPLACE FUNCTION public.create_property(property_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_property_id uuid;
    result jsonb;
BEGIN
    -- Validate required fields
    IF NOT (property_data ? 'name') OR NOT (property_data ? 'address') OR NOT (property_data ? 'monthly_rent') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Missing required fields: name, address, monthly_rent'
        );
    END IF;

    -- Validate period_type if provided
    IF property_data ? 'period_type' THEN
        IF NOT (property_data->>'period_type' = ANY(ARRAY['minutes', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'])) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Invalid period_type. Must be one of: minutes, hourly, daily, weekly, monthly, yearly'
            );
        END IF;
    END IF;

    -- Insert new property
    INSERT INTO public.properties (
        landlord_id,
        name,
        address,
        monthly_rent,
        period_type,
        data
    )
    VALUES (
        auth.uid(),
        property_data->>'name',
        property_data->>'address',
        (property_data->>'monthly_rent')::decimal,
        COALESCE(property_data->>'period_type', 'monthly'),
        COALESCE(property_data - 'name' - 'address' - 'monthly_rent' - 'period_type', '{}'::jsonb)
    )
    RETURNING id INTO new_property_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Property created successfully',
        'property_id', new_property_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error creating property: ' || SQLERRM
        );
END;
$$;

-- Update update_property function
CREATE OR REPLACE FUNCTION public.update_property(property_id uuid, property_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    property_exists boolean;
BEGIN
    -- Check if property exists and belongs to current user
    SELECT EXISTS(
        SELECT 1 FROM public.properties 
        WHERE id = update_property.property_id AND landlord_id = auth.uid()
    ) INTO property_exists;

    IF NOT property_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Property not found or access denied'
        );
    END IF;

    -- Validate period_type if provided
    IF property_data ? 'period_type' THEN
        IF NOT (property_data->>'period_type' = ANY(ARRAY['minutes', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'])) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Invalid period_type. Must be one of: minutes, hourly, daily, weekly, monthly, yearly'
            );
        END IF;
    END IF;

    -- Update property
    UPDATE public.properties
    SET
        name = COALESCE(property_data->>'name', name),
        address = COALESCE(property_data->>'address', address),
        monthly_rent = COALESCE((property_data->>'monthly_rent')::decimal, monthly_rent),
        period_type = COALESCE(property_data->>'period_type', period_type),
        data = COALESCE(property_data - 'name' - 'address' - 'monthly_rent' - 'period_type', data)
    WHERE id = update_property.property_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Property updated successfully'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error updating property: ' || SQLERRM
        );
END;
$$;

-- Update create_lease function with period support
CREATE OR REPLACE FUNCTION public.create_lease(p_tenant_id uuid, p_property_id uuid, p_lease_terms jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    tenant_exists boolean;
    property_exists boolean;
    new_lease_id uuid;
    calculated_end_date date;
BEGIN
    -- Validate tenant exists and belongs to current user
    SELECT EXISTS(
        SELECT 1 FROM public.tenants 
        WHERE id = p_tenant_id AND landlord_id = auth.uid()
    ) INTO tenant_exists;

    IF NOT tenant_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Tenant not found or access denied'
        );
    END IF;

    -- Validate property exists and belongs to current user
    SELECT EXISTS(
        SELECT 1 FROM public.properties 
        WHERE id = p_property_id AND landlord_id = auth.uid()
    ) INTO property_exists;

    IF NOT property_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Property not found or access denied'
        );
    END IF;

    -- Validate required lease terms
    IF NOT (p_lease_terms ? 'start_date') OR NOT (p_lease_terms ? 'monthly_rent') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Missing required lease terms: start_date, monthly_rent'
        );
    END IF;

    -- Insert new lease
    INSERT INTO public.leases (
        tenant_id,
        property_id,
        start_date,
        end_date,
        monthly_rent,
        security_deposit,
        period_count,
        auto_calculate_end_date,
        terms
    )
    VALUES (
        p_tenant_id,
        p_property_id,
        (p_lease_terms->>'start_date')::date,
        CASE 
            WHEN p_lease_terms ? 'end_date' AND p_lease_terms->>'end_date' != '' 
            THEN (p_lease_terms->>'end_date')::date 
            ELSE NULL 
        END,
        (p_lease_terms->>'monthly_rent')::decimal,
        COALESCE((p_lease_terms->>'security_deposit')::decimal, 0),
        CASE 
            WHEN p_lease_terms ? 'period_count' 
            THEN (p_lease_terms->>'period_count')::integer 
            ELSE NULL 
        END,
        COALESCE((p_lease_terms->>'auto_calculate_end_date')::boolean, false),
        p_lease_terms - 'start_date' - 'end_date' - 'monthly_rent' - 'security_deposit' - 'period_count' - 'auto_calculate_end_date'
    )
    RETURNING id INTO new_lease_id;

    -- Generate initial due dates for the lease
    PERFORM public.generate_due_dates_for_lease(new_lease_id);

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Lease created successfully',
        'lease_id', new_lease_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error creating lease: ' || SQLERRM
        );
END;
$$;