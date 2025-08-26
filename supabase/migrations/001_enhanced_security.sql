-- Enhanced Security Migration for YCCC Nursing Inventory
-- This migration implements comprehensive security measures

-- Enable Row Level Security on all tables
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create email whitelist table
CREATE TABLE IF NOT EXISTS email_whitelist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT
);

-- Enable RLS on whitelist table
ALTER TABLE email_whitelist ENABLE ROW LEVEL SECURITY;

-- Insert initial whitelisted emails
INSERT INTO email_whitelist (email, domain, notes) VALUES 
('john.barr@mainecc.edu', 'mainecc.edu', 'Initial system administrator'),
('*@mainecc.edu', 'mainecc.edu', 'All YCCC staff emails')
ON CONFLICT (email) DO NOTHING;

-- Create audit log table for security monitoring
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create function to check if email is whitelisted
CREATE OR REPLACE FUNCTION is_email_whitelisted(email_address TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check for exact email match
  IF EXISTS (
    SELECT 1 FROM email_whitelist 
    WHERE email = LOWER(email_address) 
    AND is_active = TRUE
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check for domain wildcard match
  IF EXISTS (
    SELECT 1 FROM email_whitelist 
    WHERE email = '*@' || SPLIT_PART(LOWER(email_address), '@', 2)
    AND is_active = TRUE
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0')::inet
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for inventory_items table
DROP POLICY IF EXISTS "Verified users can view inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Verified users can insert inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Verified users can update inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Verified users can delete inventory items" ON inventory_items;

-- Only allow whitelisted, verified users to access inventory
CREATE POLICY "Verified users can view inventory items" ON inventory_items
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  );

CREATE POLICY "Verified users can insert inventory items" ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
    AND auth.uid() = user_id
  );

CREATE POLICY "Verified users can update inventory items" ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
    AND auth.uid() = user_id -- Added ownership check
  )
  WITH CHECK (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
    AND auth.uid() = user_id -- Added ownership check
  );

CREATE POLICY "Verified users can delete inventory items" ON inventory_items
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
    AND auth.uid() = user_id -- Added ownership check
  );

-- RLS Policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    auth.uid() = id
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  );

-- RLS Policies for email_whitelist (admin only)
CREATE POLICY "Only admins can view whitelist" ON email_whitelist
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'john.barr@mainecc.edu'
  );

CREATE POLICY "Only admins can modify whitelist" ON email_whitelist
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'john.barr@mainecc.edu'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'john.barr@mainecc.edu'
  );

-- RLS Policies for audit_log (admin only)
CREATE POLICY "Only admins can view audit log" ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' = 'john.barr@mainecc.edu'
  );

CREATE POLICY "System can insert audit log" ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Create triggers for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'INSERT',
      TG_TABLE_NAME,
      NEW.id::TEXT,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event(
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id::TEXT,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'DELETE',
      TG_TABLE_NAME,
      OLD.id::TEXT,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add audit triggers to inventory_items
DROP TRIGGER IF EXISTS audit_inventory_items ON inventory_items;
CREATE TRIGGER audit_inventory_items
  AFTER INSERT OR UPDATE OR DELETE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function to validate user registration
CREATE OR REPLACE FUNCTION validate_user_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email is whitelisted
  IF NOT is_email_whitelisted(NEW.email) THEN
    RAISE EXCEPTION 'Email domain not authorized for registration: %', NEW.email;
  END IF;
  
  -- Log registration attempt
  PERFORM log_audit_event(
    'USER_REGISTRATION_ATTEMPT',
    'auth.users',
    NEW.id::TEXT,
    NULL,
    jsonb_build_object('email', NEW.email, 'created_at', NEW.created_at)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for user registration validation
DROP TRIGGER IF EXISTS validate_user_registration_trigger ON auth.users;
CREATE TRIGGER validate_user_registration_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION validate_user_registration();

-- Create security monitoring views (admin only)
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
  'failed_logins' as metric,
  COUNT(*) as count,
  DATE_TRUNC('hour', created_at) as time_bucket
FROM audit_log 
WHERE action = 'FAILED_LOGIN'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
UNION ALL
SELECT 
  'inventory_changes' as metric,
  COUNT(*) as count,
  DATE_TRUNC('hour', created_at) as time_bucket
FROM audit_log 
WHERE table_name = 'inventory_items'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY time_bucket DESC;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_items TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON email_whitelist TO authenticated;
GRANT INSERT ON audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_whitelisted(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_whitelist_email ON email_whitelist(email);
CREATE INDEX IF NOT EXISTS idx_email_whitelist_domain ON email_whitelist(domain);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Add comments for documentation
COMMENT ON TABLE email_whitelist IS 'Stores whitelisted email addresses and domains for system access';
COMMENT ON TABLE audit_log IS 'Comprehensive audit log for security monitoring and compliance';
COMMENT ON FUNCTION is_email_whitelisted(TEXT) IS 'Checks if an email address is authorized for system access';
COMMENT ON FUNCTION log_audit_event(TEXT, TEXT, TEXT, JSONB, JSONB) IS 'Logs security and audit events for monitoring';
