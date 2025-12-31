import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Permissions {
  dashboard: boolean;
  employees: boolean;
  healthCheckups: boolean;
  documents: boolean;
  reports: boolean;
  audits: boolean;
  settings: boolean;
  // Extended permissions for specific features
  riskAssessments: boolean;
  investigations: boolean;
  incidents: boolean;
  trainings: boolean;
}

const DEFAULT_PERMISSIONS: Permissions = {
  dashboard: false,
  employees: false,
  healthCheckups: false,
  documents: false,
  reports: false,
  audits: false,
  settings: false,
  riskAssessments: false,
  investigations: false,
  incidents: false,
  trainings: false,
};

// Admin has all permissions
const ADMIN_PERMISSIONS: Permissions = {
  dashboard: true,
  employees: true,
  healthCheckups: true,
  documents: true,
  reports: true,
  audits: true,
  settings: true,
  riskAssessments: true,
  investigations: true,
  incidents: true,
  trainings: true,
};

// Super admin has all permissions
const SUPER_ADMIN_PERMISSIONS: Permissions = ADMIN_PERMISSIONS;

// Map route paths to permission keys
export const ROUTE_PERMISSION_MAP: Record<string, keyof Permissions> = {
  "/dashboard": "dashboard",
  "/employees": "employees",
  "/investigations": "investigations",
  "/risk-assessments": "riskAssessments",
  "/training": "trainings",
  "/incidents": "incidents",
  "/audits": "audits",
  "/reports": "reports",
  "/settings": "settings",
  "/documents": "documents",
  "/activity-groups": "riskAssessments",
  "/measures": "riskAssessments",
  "/tasks": "dashboard",
  "/messages": "dashboard",
  "/profile": "dashboard",
  "/invoices": "dashboard",
};

export function usePermissions() {
  const { user, userRole, companyId, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user || !companyId) {
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    // Super admin gets all permissions
    if (userRole === "super_admin") {
      setPermissions(SUPER_ADMIN_PERMISSIONS);
      setRoleName("Super Admin");
      setLoading(false);
      return;
    }

    // Company admin gets all permissions
    if (userRole === "company_admin") {
      setPermissions(ADMIN_PERMISSIONS);
      setRoleName("Admin");
      setLoading(false);
      return;
    }

    try {
      // First, get the user's assigned role from team_members table
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (teamError) {
        console.error("[usePermissions] Error fetching team member:", teamError);
      }

      const assignedRole = teamMember?.role || "Employee";
      setRoleName(assignedRole);

      // Now fetch permissions for this role from custom_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("custom_roles")
        .select("permissions")
        .eq("company_id", companyId)
        .eq("role_name", assignedRole)
        .maybeSingle();

      if (roleError) {
        console.error("[usePermissions] Error fetching role permissions:", roleError);
      }

      if (roleData?.permissions) {
        const dbPermissions = roleData.permissions as Record<string, boolean>;
        
        // Map database permissions to our extended permissions
        // For features not in the basic RBAC table, derive from related permissions
        const mappedPermissions: Permissions = {
          dashboard: dbPermissions.dashboard ?? false,
          employees: dbPermissions.employees ?? false,
          healthCheckups: dbPermissions.healthCheckups ?? false,
          documents: dbPermissions.documents ?? false,
          reports: dbPermissions.reports ?? false,
          audits: dbPermissions.audits ?? false,
          settings: dbPermissions.settings ?? false,
          // Extended: derive from base permissions or default to dashboard access
          riskAssessments: dbPermissions.audits ?? dbPermissions.reports ?? false,
          investigations: dbPermissions.audits ?? dbPermissions.reports ?? false,
          incidents: dbPermissions.audits ?? dbPermissions.reports ?? false,
          trainings: dbPermissions.employees ?? dbPermissions.documents ?? false,
        };

        setPermissions(mappedPermissions);
      } else {
        // Fallback: use default employee permissions
        setPermissions({
          ...DEFAULT_PERMISSIONS,
          dashboard: true,
          documents: true,
        });
      }
    } catch (error) {
      console.error("[usePermissions] Error:", error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [user, userRole, companyId]);

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [authLoading, fetchPermissions]);

  // Check if user has permission for a specific feature
  const hasPermission = useCallback(
    (permission: keyof Permissions): boolean => {
      // Super admin and company admin always have access
      if (userRole === "super_admin" || userRole === "company_admin") {
        return true;
      }
      return permissions[permission] ?? false;
    },
    [permissions, userRole]
  );

  // Check if user can access a specific route
  const canAccessRoute = useCallback(
    (path: string): boolean => {
      // Super admin and company admin can access everything
      if (userRole === "super_admin" || userRole === "company_admin") {
        return true;
      }

      // Find the base path (without params)
      const basePath = "/" + path.split("/")[1];
      const permissionKey = ROUTE_PERMISSION_MAP[basePath];

      if (!permissionKey) {
        // Route not in map - allow access by default (for public routes, etc.)
        return true;
      }

      return permissions[permissionKey] ?? false;
    },
    [permissions, userRole]
  );

  return {
    permissions,
    loading: loading || authLoading,
    roleName,
    hasPermission,
    canAccessRoute,
    refreshPermissions: fetchPermissions,
  };
}
