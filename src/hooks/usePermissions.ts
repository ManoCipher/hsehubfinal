import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enable verbose logging in development
const DEBUG_RBAC = import.meta.env.DEV;

function logRBAC(message: string, data?: unknown) {
  if (DEBUG_RBAC) {
    console.log(`[RBAC] ${message}`, data !== undefined ? data : "");
  }
}

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

// DENY ALL by default - security first approach
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
  "/health-checkups": "healthCheckups",
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
    logRBAC("=== Permission Resolution Started ===");
    logRBAC("User ID:", user?.id);
    logRBAC("User Role (from auth):", userRole);
    logRBAC("Company ID:", companyId);

    if (!user || !companyId) {
      logRBAC("⚠️ No user or companyId - denying all permissions");
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    // Super admin gets all permissions
    if (userRole === "super_admin") {
      logRBAC("✅ Super Admin detected - granting all permissions");
      setPermissions(SUPER_ADMIN_PERMISSIONS);
      setRoleName("Super Admin");
      setLoading(false);
      return;
    }

    // Company admin gets all permissions
    if (userRole === "company_admin") {
      logRBAC("✅ Company Admin detected - granting all permissions");
      setPermissions(ADMIN_PERMISSIONS);
      setRoleName("Admin");
      setLoading(false);
      return;
    }

    try {
      // First, get the user's assigned role from team_members table
      logRBAC("Fetching role from team_members table...");
      const { data: teamMember, error: teamError } = await supabase
        .from("team_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (teamError) {
        logRBAC("❌ Error fetching team member:", teamError);
      }

      const assignedRole = teamMember?.role || "Employee";
      logRBAC("Assigned Role:", assignedRole);
      setRoleName(assignedRole);

      // Now fetch permissions for this role from custom_roles table
      logRBAC("Fetching permissions from custom_roles table for role:", assignedRole);
      const { data: roleData, error: roleError } = await supabase
        .from("custom_roles")
        .select("permissions")
        .eq("company_id", companyId)
        .eq("role_name", assignedRole)
        .maybeSingle();

      if (roleError) {
        logRBAC("❌ Error fetching role permissions:", roleError);
      }

      logRBAC("Raw roleData from DB:", roleData);

      if (roleData?.permissions) {
        const dbPermissions = roleData.permissions as Record<string, boolean>;
        logRBAC("DB Permissions object:", dbPermissions);
        
        // Map database permissions to our extended permissions
        // STRICT: Only grant if explicitly true, never fallback to true
        const mappedPermissions: Permissions = {
          dashboard: dbPermissions.dashboard === true,
          employees: dbPermissions.employees === true,
          healthCheckups: dbPermissions.healthCheckups === true,
          documents: dbPermissions.documents === true,
          reports: dbPermissions.reports === true,
          audits: dbPermissions.audits === true,
          settings: dbPermissions.settings === true,
          // Extended: derive from base permissions - still strict
          riskAssessments: dbPermissions.riskAssessments === true || dbPermissions.audits === true,
          investigations: dbPermissions.investigations === true || dbPermissions.audits === true,
          incidents: dbPermissions.incidents === true || dbPermissions.audits === true,
          trainings: dbPermissions.trainings === true || dbPermissions.employees === true,
        };

        logRBAC("✅ Final mapped permissions:", mappedPermissions);
        setPermissions(mappedPermissions);
      } else {
        // NO FALLBACK TO PERMISSIVE DEFAULTS - deny all if no role config found
        logRBAC("⚠️ No custom_roles entry found for role:", assignedRole);
        logRBAC("⚠️ DENYING ALL - no permissions configured for this role");
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (error) {
      logRBAC("❌ Exception in fetchPermissions:", error);
      // On error, deny all
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
      logRBAC("=== Permission Resolution Complete ===");
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
      // STRICT: permission must be explicitly true, not just truthy
      const result = permissions[permission] === true;
      logRBAC(`hasPermission("${permission}") = ${result}`);
      return result;
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
        // Route not in map - DENY by default for unmapped routes (safer)
        logRBAC(`canAccessRoute("${path}") - no mapping found, denying`);
        return false;
      }

      const result = permissions[permissionKey] === true;
      logRBAC(`canAccessRoute("${path}") -> ${permissionKey} = ${result}`);
      return result;
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
