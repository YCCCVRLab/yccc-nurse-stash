-- Migration to update RLS policies for shared inventory access
-- This allows any authenticated, whitelisted user to edit/delete items added by any other user

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Verified users can update inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Verified users can delete inventory items" ON inventory_items;

-- Create new shared access policies for UPDATE
CREATE POLICY "Verified users can update any inventory items" ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  );

-- Create new shared access policies for DELETE
CREATE POLICY "Verified users can delete any inventory items" ON inventory_items
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
  );

-- Keep the INSERT policy as is (users can still only insert with their own user_id)
-- But update it to be more explicit about the naming
DROP POLICY IF EXISTS "Verified users can insert inventory items" ON inventory_items;

CREATE POLICY "Verified users can insert inventory items" ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email_confirmed_at' IS NOT NULL
    AND is_email_whitelisted(auth.jwt() ->> 'email')
    AND auth.uid() = user_id
  );