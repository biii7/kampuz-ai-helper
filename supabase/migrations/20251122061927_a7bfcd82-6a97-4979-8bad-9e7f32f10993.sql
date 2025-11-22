-- Create permissions enum
CREATE TYPE public.permission_type AS ENUM (
  'view_tickets',
  'assign_tickets', 
  'forward_tickets',
  'manage_contacts',
  'manage_templates',
  'view_analytics',
  'manage_api_settings',
  'manage_admins'
);

-- Create admin_permissions table
CREATE TABLE public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission permission_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all permissions"
ON public.admin_permissions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert permissions"
ON public.admin_permissions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete permissions"
ON public.admin_permissions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission permission_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_permissions
    WHERE user_id = _user_id
      AND permission = _permission
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- Add index for better performance
CREATE INDEX idx_admin_permissions_user_id ON public.admin_permissions(user_id);
CREATE INDEX idx_admin_permissions_permission ON public.admin_permissions(permission);