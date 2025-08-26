-- Migration to clear and repopulate inventory_items table
-- This script addresses issues with existing items being uneditable/undeletable
-- by completely clearing the inventory and re-adding items from a provided CSV.

-- IMPORTANT: This migration assumes that the user 'john.barr@mainecc.edu' exists in the auth.users table.
-- If not, the INSERT statements will fail due to a foreign key constraint violation on 'user_id'.

-- Disable RLS temporarily for the 'inventory_items' table to allow deletion and insertion
-- by the migration process, which typically runs with elevated privileges.
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;

-- Get the user_id for 'john.barr@mainecc.edu'
-- This assumes the user 'john.barr@mainecc.edu' already exists in the auth.users table.
DO $$
DECLARE
    john_barr_user_id UUID;
BEGIN
    SELECT id INTO john_barr_user_id FROM auth.users WHERE email = 'john.barr@mainecc.edu';

    -- 1. Delete all existing items from the inventory_items table
    DELETE FROM inventory_items;

    -- 2. Insert new items from the CSV, associating them with john.barr@mainecc.edu's user_id
    INSERT INTO inventory_items (item, description, location, shelf_drawer, tub_number, quantity, user_id) VALUES
    ('ABD Pads', NULL, 'Storage Shelf # 1', 'Shelf # 2', '7', '2', john_barr_user_id),
    ('ABD Pads', NULL, 'Storage Shelf # 1', 'Shelf # 4', '13', '24', john_barr_user_id),
    ('ABD Pads', '8" X 10"', 'Wound Care Cart', 'Right Drawer # 6', NULL, '5', john_barr_user_id),
    ('ABD Pads', '5" X 9"', 'Wound Care Cart', 'Right Drawer # 6', NULL, '1', john_barr_user_id),
    ('Abdominal Binder', NULL, 'Storage Shelf # 2', 'Under Bottom Shelf', '22', '1', john_barr_user_id),
    ('Adhesive Bandage', 'Wound Closure', 'Wound Care Cart', 'Right Drawer # 1', NULL, '19', john_barr_user_id),
    ('Adhesive Tape Removal Pads', NULL, 'Wound Care Cart', 'Left Drawer # 2', NULL, '48', john_barr_user_id),
    ('Alcohol Pads', 'Pred Pads', 'Assessment Cart', 'Top Drawer', NULL, '6 boxes', john_barr_user_id),
    ('Bandaids', 'Misc', 'Sink Counter', 'Top Left Cabinet', NULL, NULL, john_barr_user_id),
    ('Central Line Dressing Kits', NULL, 'Storage Shelf # 1', 'Shelf # 3', '10', '23', john_barr_user_id),
    ('Cohesive Elastic Banadges', 'Coban Wrap', 'Wound Care Cart', 'Left Drawer # 3', NULL, '6', john_barr_user_id),
    ('Cotton Balls', NULL, 'Sink Counter', 'Top Left Cabinet', NULL, NULL, john_barr_user_id),
    ('Cotton Balls', NULL, 'Sink Counter', 'Top Right Cabinet', NULL, NULL, john_barr_user_id),
    ('Cotton Sleeve', 'bandage holder', 'Wound Care Cart', 'Right Drawer # 3', NULL, '2', john_barr_user_id),
    ('Cotton tip applicators', NULL, 'Sink Counter', 'Top Left Cabinet', NULL, NULL, john_barr_user_id),
    ('Cotton Tip Swabs', 'Short - Steri Pack', 'Under Nurses Station Counter', NULL, NULL, 'thousands!', john_barr_user_id),
    ('Cotton Tip Swabs', 'Sterile  - 2 per pkg', 'Storage Shelf # 1', 'Shelf # 4', '13', '59 pkgs', john_barr_user_id),
    ('Cotton Tip Swabs', 'Sterile - 2 per pkg', 'Wound Care Cart', 'Left Drawer # 1', NULL, '13', john_barr_user_id),
    ('Cotton Tip Swabs', 'Short - Steri Pack', 'Wound Care Cart', 'Left Drawer # 1', NULL, '9', john_barr_user_id),
    ('Drain', 'Hemovac', 'Storage Shelf # 1', 'Top of shelving', NULL, '2', john_barr_user_id),
    ('Drain', 'JP', 'Storage Shelf # 1', 'Top of shelving', NULL, '2', john_barr_user_id),
    ('Drain', 'Penrose', 'Storage Shelf # 1', 'Top of shelving', NULL, '3', john_barr_user_id),
    ('Drain Sponge', '4 X 4', 'Wound Care Cart', 'Left Drawer # 5', NULL, '5', john_barr_user_id),
    ('Dressing Change Trays', NULL, 'Nurses Station', 'Under Counter', NULL, '20', john_barr_user_id),
    ('Dressing Change Trays', NULL, 'Wound Care Cart', 'Right Drawer # 5', NULL, '5', john_barr_user_id),
    ('Dressings', 'Thin Hydrocolloid 4 X 4', 'Storage Shelf # 1', 'Top', NULL, '3', john_barr_user_id),
    ('Dressings', 'Oil Emulsion 3 X 3', 'Storage Shelf # 1', 'Top', NULL, '50', john_barr_user_id),
    ('Elastic Retention Netting', 'Nonnet 11 - large', 'Storage Shelf # 1', 'Shelf # 2', '7', '1 roll', john_barr_user_id),
    ('Elastic Retention Netting', 'Nonnet 02 - small', 'Storage Shelf # 1', 'Shelf # 2', 'top of # 7', '2 rolls', john_barr_user_id),
    ('Elastic Wraps', '3"', 'Wound Care Cart', 'Right Drawer # 4', NULL, '8', john_barr_user_id),
    ('Eye Pads', 'Large 2 1/8 X 2 5/8', 'Wound Care Cart', 'Left Drawer #4', NULL, '13', john_barr_user_id),
    ('Foam Dressings', 'Mult. Sizes/types', 'Storage Shelf # 2', 'Under Bottom Shelf', '22', NULL, john_barr_user_id),
    ('Foam Dressings', 'Tegaderm Adhesive 3.5X3.5', 'Storage Shelf # 1', 'Top', NULL, '4', john_barr_user_id),
    ('Foam Dressings', 'Hydrocellular 3 X 3', 'Storage Shelf # 1', 'Top', NULL, '1', john_barr_user_id),
    ('Gauze', '4 X 4 Boat', 'Storage Shelf # 1', 'Shelf # 4', '13', '1', john_barr_user_id),
    ('Gauze Dressings', '2 X 2 bulk non-sterile', 'Storage Shelf # 1', 'Shelf # 3', '10', '400', john_barr_user_id),
    ('Gauze Pads', '3 X 3', 'Storage Shelf # 1', 'Shelf # 4', '13', '175', john_barr_user_id),
    ('Gauze Pads', '3 X 3', 'Wound Care Cart', 'Left Drawer # 5', NULL, '42', john_barr_user_id),
    ('Gauze Pads', '2 X 2 bulk non-sterile', 'Wound Care Cart', 'Right Drawer # 1', NULL, '100', john_barr_user_id),
    ('Gauze Pads', '2 X 2 non-sterile', 'Sink Counter', 'Top Left Cabinet', NULL, NULL, john_barr_user_id),
    ('Gauze Rolls - Conforming', '3" X 4.1 yds', 'Storage Shelf # 1', 'Shelf # 4', '13', '19', john_barr_user_id),
    ('Gauze Rolls - Conforming', '2" open non-sterile', 'Wound Care Cart', 'Left Drawer # 5', NULL, '8', john_barr_user_id),
    ('Gauze Rolls - Conforming', '2" non-sterile open', 'Wound Care Cart', 'Right Drawer # 4', NULL, '7', john_barr_user_id),
    ('Gauze Rolls - Conforming', '6"', 'Wound Care Cart', 'Right Drawer # 6', NULL, '1', john_barr_user_id),
    ('Gauze Wrap', '6"', 'Wound Care Cart', 'Right Drawer # 2', NULL, '1', john_barr_user_id),
    ('Irrigation Tray', 'w/piston syringe', 'Storage Shelf # 1', 'Top of shelving', NULL, '1', john_barr_user_id),
    ('Kerlix Gauze Rolls', 'Large', 'Storage Shelf # 1', 'Shelf # 4', '14', '5', john_barr_user_id),
    ('Kerlix Gauze Rolls', 'Small', 'Storage Shelf # 1', 'Shelf # 4', '14', '24', john_barr_user_id),
    ('Kerlix Gauze Rolls', '4.5" (lg)', 'Wound Care Cart', 'Right Drawer # 6', NULL, '9', john_barr_user_id),
    ('Kerlix Super Sponge', '4 X 4', 'Storage Shelf # 1', 'Shelf # 2', '7', '1', john_barr_user_id),
    ('Kerlix Super Sponge', '4 X 4', 'Storage Shelf # 1', 'Shelf # 4', '13', '19', john_barr_user_id),
    ('Kerlix Super Sponge', '6 X 6 3/4', 'Wound Care Cart', 'Right Drawer # 5', NULL, '3', john_barr_user_id),
    ('Measuring Devices', 'Retractable', 'Wound Care Cart', 'Left Drawer # 1', NULL, '3', john_barr_user_id),
    ('Measuring Devices', 'Flexible', 'Wound Care Cart', 'Left Drawer # 1', NULL, '1', john_barr_user_id),
    ('Measuring Devices', 'Wound Guides', 'Wound Care Cart', 'Left Drawer # 1', NULL, '14', john_barr_user_id),
    ('Montgomery Straps', NULL, 'Wound Care Cart', 'Left Drawer # 2', NULL, '3', john_barr_user_id),
    ('Non-Adherent Pad', '3 X 4', 'Wound Care Cart', 'Right Drawer # 1', NULL, '4', john_barr_user_id),
    ('Packing Strip', 'Plain 1/2" ', 'Storage Shelf # 1', 'Top of shelving', NULL, '4', john_barr_user_id),
    ('Packing Strip', 'Plain 1/2" ', 'Wound Care Cart', 'Left Drawer # 5', NULL, '3', john_barr_user_id),
    ('Scissors', 'small', 'Wound Care Cart', 'Left Drawer # 1', NULL, '4', john_barr_user_id),
    ('Scissors', 'small', 'Sink Counter', 'Top Left Cabinet', NULL, NULL, john_barr_user_id),
    ('Skin Prep Pads', 'Derma Rite', 'Wound Care Cart', 'Left Drawer # 2', NULL, '26', john_barr_user_id),
    ('Skin Prep Swab', NULL, 'Wound Care Cart', 'Right Drawer # 1', NULL, '1', john_barr_user_id),
    ('Skin Stapler', NULL, 'Storage Shelf # 1', 'Shelf # 3', '10', '3', john_barr_user_id),
    ('Solution Bowls', 'Sterile', 'Storage Shelf # 1', 'Shelf # 4', '14', '10', john_barr_user_id),
    ('Solution Bowls', 'Sterile', 'Wound Care Cart', 'Left Drawer # 6', NULL, '1', john_barr_user_id),
    ('Solution Bowls', 'open - non-sterile', 'Sink Counter', 'Top Right Cabinet', NULL, '4', john_barr_user_id),
    ('Staple Removal Kits', NULL, 'Storage Shelf # 1', 'Shelf # 3', '10', '9', john_barr_user_id),
    ('Staple Removal Kits', NULL, 'Wound Care Cart', 'Right Drawer # 3', NULL, '4', john_barr_user_id),
    ('Steri Strip', NULL, 'Wound Care Cart', 'Right Drawer # 1', NULL, '2 pkgs', john_barr_user_id),
    ('Sterile Gloves', 'Size 6', 'Wound Care Cart', 'Right Drawer # 5', NULL, '3', john_barr_user_id),
    ('Sterile Saline', '100 ml for wounds', 'Storage Shelf # 1', 'Top of shelving', NULL, '12', john_barr_user_id),
    ('Sterile Saline', '100 ml for wounds', 'Wound Care Cart', 'Left Drawer # 6', NULL, '8', john_barr_user_id),
    ('Sterile Towel Drapes', NULL, 'Storage Shelf # 1', 'Shelf # 4', '14', '50', john_barr_user_id),
    ('Sterile Towel Drapes', '18" X 26"', 'Wound Care Cart', 'Left Drawer # 6', NULL, '3', john_barr_user_id),
    ('Surgical Scrub', 'Example - opened', 'Wound Care Cart', 'Right Drawer # 1', NULL, '1', john_barr_user_id),
    ('Surgical Sponge', '4 X 4', 'Storage Shelf # 1', 'Shelf # 2', '7', '12', john_barr_user_id),
    ('Surgical Sponge', '2 X 2', 'Wound Care Cart', 'Left Drawer # 5', NULL, '22', john_barr_user_id),
    ('Surgical Sponge', '4 X 4 (2pk)', 'Wound Care Cart', 'Right Drawer # 5', NULL, '20', john_barr_user_id),
    ('Suture Removal Kits', NULL, 'Storage Shelf # 1', 'Shelf # 3', '10', '5', john_barr_user_id),
    ('Swab Sampling', '15 cm oropharyngeal', 'Under Nurses Station Counter', NULL, NULL, '5000', john_barr_user_id),
    ('Tape', 'Misc', 'Storage Shelf # 1', 'Shelf # 4', '13', NULL, john_barr_user_id),
    ('Tape', 'Misc', 'Storage Shelf # 1', 'Shelf # 4', '14', NULL, john_barr_user_id),
    ('Tape', 'Misc', 'Sink Counter', 'Top Left Cabinet', NULL, NULL, john_barr_user_id),
    ('Tape Medipore', '2 "', 'Storage Shelf # 1', 'Shelf # 4', '13', '8 rolls', john_barr_user_id),
    ('Tape Medipore', '4"', 'Storage Shelf # 1', 'Shelf # 4', '13', '1 roll', john_barr_user_id),
    ('Tape Surgical Paper', '1"', 'Storage Shelf # 1', 'Shelf # 4', '13', '33 rolls', john_barr_user_id),
    ('Tape Surgical Paper', '1/2 "', 'Storage Shelf # 1', 'Shelf # 4', '13', '24 rolls', john_barr_user_id),
    ('Tape Surgical Paper', '1" medium length rolls', 'Wound Care Cart', 'Left Drawer # 3', NULL, '10', john_barr_user_id),
    ('Tape Surgical Paper', '1" short length rolls', 'Wound Care Cart', 'Left Drawer # 3', NULL, '8', john_barr_user_id),
    ('Tape Surgical Paper', '1/2" ', 'Wound Care Cart', 'Left Drawer # 3', NULL, '1', john_barr_user_id),
    ('Tape Surgical Paper', '2"', 'Wound Care Cart', 'Left Drawer # 4', NULL, '12', john_barr_user_id),
    ('Tape Surgical Paper', '3"', 'Wound Care Cart', 'Left Drawer # 4', NULL, '8', john_barr_user_id),
    ('Tape Surgical Paper', '4"', 'Wound Care Cart', 'Left Drawer # 4', NULL, '1', john_barr_user_id),
    ('Tefla - non adherent', '3 X 4', 'Storage Shelf # 1', 'Shelf # 4', '13', '100', john_barr_user_id),
    ('Tefla - non adherent', '4 X 3 w/measuring guide', 'Wound Care Cart', 'Right Drawer # 1', NULL, '8', john_barr_user_id),
    ('Transparent Dressings', '4 X 4 Derm View II', 'Storage Shelf # 2', 'Under Bottom Shelf', '22', '1 box of 50', john_barr_user_id),
    ('Transparent Dressings', '4 X 4.5 Derm View II', 'Wound Care Cart', 'Left Drawer # 2', NULL, '6', john_barr_user_id),
    ('Transparent Dressings', 'View Guard 2 3/8 X 2 3/4', 'Wound Care Cart', 'Left Drawer # 5', NULL, '66', john_barr_user_id),
    ('Una Boot', '4" w/elastic wrap', 'Wound Care Cart', 'Right Drawer # 2', NULL, '1', john_barr_user_id),
    ('Una Boot', '3"', 'Wound Care Cart', 'Right Drawer # 2', NULL, '1', john_barr_user_id),
    ('View Guard Transparent', '2 3/8 X 2 3/4', 'Storage Shelf # 1', 'Shelf # 2', '7', '100', john_barr_user_id),
    ('View Guard Transparent', '2 3/8 X 2 3/4', 'Storage Shelf # 1', 'Shelf # 4', '13', '175', john_barr_user_id),
    ('Wound Culture Swabs', NULL, 'Storage Shelf # 1', 'Shelf # 4', '14', '31', john_barr_user_id),
    ('Wound Culture Swabs', NULL, 'Wound Care Cart', 'Right Drawer # 2', NULL, '10', john_barr_user_id),
    ('Wound Cuture Swabs', NULL, 'Storage Shelf # 1', 'Shelf # 3', '10', '44', john_barr_user_id),
    ('Wound Vac', 'Supplies/dressings', 'Storage Shelf # 2', 'Under Bottom Shelf', '22', NULL, john_barr_user_id),
    ('Woven Gauze Sponge', '4 X 4', 'Storage Shelf # 1', 'Shelf # 2', '7', '23', john_barr_user_id),
    ('Woven Gauze Sponge', '4 X 4 bulk non-sterile', 'Storage Shelf # 1', 'Shelf # 3', '10', '600', john_barr_user_id);
END $$;

-- Re-enable RLS for the 'inventory_items' table
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;