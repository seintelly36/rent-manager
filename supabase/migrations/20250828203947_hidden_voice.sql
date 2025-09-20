/*
# Rent Management Database Schema

This migration creates the complete database structure for the rent management application.

## 1. New Tables

### tenants
- `id` (uuid, primary key)
- `landlord_id` (uuid, references auth.users)
- `name` (text, not null)
- `email` (text, unique)
- `data` (jsonb, flexible tenant information)
- `created_at` (timestamptz)

### properties
- `id` (uuid, primary key)
- `landlord_id` (uuid, references auth.users)
- `name` (text, not null)
- `address` (text, not null)
- `monthly_rent` (decimal)
- `data` (jsonb, flexible property details)
- `created_at` (timestamptz)

### leases
- `id` (uuid, primary key)
- `tenant_id` (uuid, references tenants)
- `property_id` (uuid, references properties)
- `start_date` (date, not null)
- `end_date` (date)
- `monthly_rent` (decimal, not null)
- `security_deposit` (decimal)
- `status` (text, active/terminated)
- `terms` (jsonb, lease terms and conditions)
- `created_at` (timestamptz)

### maintenance_requests
- `id` (uuid, primary key)
- `property_id` (uuid, references properties)
- `title` (text, not null)
- `description` (text)
- `priority` (text, low/medium/high)
- `status` (text, pending/in_progress/completed)
- `details` (jsonb, flexible request data)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### payments
- `id` (uuid, primary key)
- `lease_id` (uuid, references leases)
- `amount` (decimal, not null)
- `payment_date` (date, not null)
- `type` (text, rent/deposit/refund)
- `status` (text, paid/pending/failed)
- `notes` (text)
- `created_at` (timestamptz)

### due_dates
- `id` (uuid, primary key)
- `lease_id` (uuid, references leases)
- `due_date` (date, not null)
- `amount_due` (decimal, not null)
- `status` (text, pending/paid/overdue)
- `created_at` (timestamptz)

## 2. Security
- Enable RLS on all tables
- Add policies for landlord-only access to their data
- Ensure data isolation between different landlords

## 3. Indexes
- Add performance indexes on frequently queried columns
- Foreign key indexes for join performance
*/

-- Create tables
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  monthly_rent decimal(10,2) DEFAULT 0,
  data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date,
  monthly_rent decimal(10,2) NOT NULL,
  security_deposit decimal(10,2) DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'terminated')),
  terms jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  payment_date date NOT NULL,
  type text DEFAULT 'rent' CHECK (type IN ('rent', 'deposit', 'refund')),
  status text DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS due_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id uuid REFERENCES leases(id) ON DELETE CASCADE NOT NULL,
  due_date date NOT NULL,
  amount_due decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_dates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenants
CREATE POLICY "Landlords can manage their tenants"
  ON tenants
  FOR ALL
  TO authenticated
  USING (landlord_id = auth.uid());

-- Create RLS policies for properties
CREATE POLICY "Landlords can manage their properties"
  ON properties
  FOR ALL
  TO authenticated
  USING (landlord_id = auth.uid());

-- Create RLS policies for leases
CREATE POLICY "Landlords can manage leases for their properties"
  ON leases
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = leases.property_id 
      AND properties.landlord_id = auth.uid()
    )
  );

-- Create RLS policies for maintenance requests
CREATE POLICY "Landlords can manage maintenance for their properties"
  ON maintenance_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = maintenance_requests.property_id 
      AND properties.landlord_id = auth.uid()
    )
  );

-- Create RLS policies for payments
CREATE POLICY "Landlords can manage payments for their leases"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      JOIN properties p ON l.property_id = p.id
      WHERE l.id = payments.lease_id 
      AND p.landlord_id = auth.uid()
    )
  );

-- Create RLS policies for due dates
CREATE POLICY "Landlords can manage due dates for their leases"
  ON due_dates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leases l
      JOIN properties p ON l.property_id = p.id
      WHERE l.id = due_dates.lease_id 
      AND p.landlord_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_landlord_id ON tenants(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_due_dates_lease_id ON due_dates(lease_id);
CREATE INDEX IF NOT EXISTS idx_due_dates_due_date ON due_dates(due_date);