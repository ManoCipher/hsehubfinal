-- ============================================
-- RBAC SEED DATA FOR LOCAL/DEV TESTING
-- Run this in Supabase SQL Editor to seed roles
-- ============================================

-- First, find your company_id (replace with actual or query)
-- SELECT id, name FROM companies LIMIT 5;

-- ============================================
-- OPTION 1: Insert for a SPECIFIC company
-- Replace 'YOUR_COMPANY_ID_HERE' with actual UUID
-- ============================================

/*
-- Employee Role: Minimal access (dashboard + documents only)
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
VALUES (
  'YOUR_COMPANY_ID_HERE',
  'Employee',
  '{
    "dashboard": true,
    "employees": false,
    "healthCheckups": false,
    "documents": true,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  true
)
ON CONFLICT (company_id, role_name) 
DO UPDATE SET permissions = EXCLUDED.permissions;

-- User Role: Same as Employee (alias)
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
VALUES (
  'YOUR_COMPANY_ID_HERE',
  'User',
  '{
    "dashboard": true,
    "employees": false,
    "healthCheckups": false,
    "documents": true,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  true
)
ON CONFLICT (company_id, role_name) 
DO UPDATE SET permissions = EXCLUDED.permissions;

-- Doctor Role: Health checkups + documents access
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
VALUES (
  'YOUR_COMPANY_ID_HERE',
  'Doctor',
  '{
    "dashboard": true,
    "employees": true,
    "healthCheckups": true,
    "documents": true,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  true
)
ON CONFLICT (company_id, role_name) 
DO UPDATE SET permissions = EXCLUDED.permissions;

-- Line Manager Role: Team oversight + reports
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
VALUES (
  'YOUR_COMPANY_ID_HERE',
  'Line Manager',
  '{
    "dashboard": true,
    "employees": true,
    "healthCheckups": false,
    "documents": true,
    "reports": true,
    "audits": true,
    "settings": false
  }'::jsonb,
  true
)
ON CONFLICT (company_id, role_name) 
DO UPDATE SET permissions = EXCLUDED.permissions;
*/

-- ============================================
-- OPTION 2: Insert for ALL existing companies
-- This is safer for dev/testing
-- ============================================

-- Employee Role for all companies
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
SELECT 
  c.id,
  'Employee',
  '{
    "dashboard": true,
    "employees": false,
    "healthCheckups": false,
    "documents": true,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = c.id AND cr.role_name = 'Employee'
);

-- User Role for all companies (same as Employee)
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
SELECT 
  c.id,
  'User',
  '{
    "dashboard": true,
    "employees": false,
    "healthCheckups": false,
    "documents": true,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = c.id AND cr.role_name = 'User'
);

-- Doctor Role for all companies
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
SELECT 
  c.id,
  'Doctor',
  '{
    "dashboard": true,
    "employees": true,
    "healthCheckups": true,
    "documents": true,
    "reports": false,
    "audits": false,
    "settings": false
  }'::jsonb,
  true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = c.id AND cr.role_name = 'Doctor'
);

-- Line Manager Role for all companies
INSERT INTO public.custom_roles (company_id, role_name, permissions, is_predefined)
SELECT 
  c.id,
  'Line Manager',
  '{
    "dashboard": true,
    "employees": true,
    "healthCheckups": false,
    "documents": true,
    "reports": true,
    "audits": true,
    "settings": false
  }'::jsonb,
  true
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = c.id AND cr.role_name = 'Line Manager'
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check what roles exist
SELECT 
  cr.role_name,
  c.name as company_name,
  cr.permissions,
  cr.is_predefined
FROM public.custom_roles cr
JOIN public.companies c ON c.id = cr.company_id
ORDER BY c.name, cr.role_name;

-- Check team members and their roles
SELECT 
  tm.first_name,
  tm.last_name,
  tm.role,
  c.name as company_name
FROM public.team_members tm
JOIN public.companies c ON c.id = tm.company_id
ORDER BY c.name, tm.role;
