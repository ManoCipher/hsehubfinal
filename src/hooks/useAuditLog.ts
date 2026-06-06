import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AuditActionType =
    // Auth
    | "login"
    | "logout"
    | "signup"
    | "password_reset"
    // Employees
    | "create_employee"
    | "delete_employee"
    | "update_employee"
    // Tasks
    | "assign_task"
    | "complete_task"
    | "reopen_task"
    | "create_task"
    | "delete_task"
    // Notes
    | "add_employee_note"
    | "delete_employee_note"
    // ISO Standards
    | "activate_iso_standard"
    | "deactivate_iso_standard"
    | "update_custom_iso"
    // Team
    | "invite_team_member"
    | "update_user_role"
    | "remove_team_member"
    // Invoices & Billing
    | "send_invoice"
    | "update_billing_email"
    | "generate_api_token"
    | "connect_external_system"
    | "disconnect_external_system"
    // Settings
    | "update_settings"
    | "update_company_profile"
    // Incidents
    | "create_incident"
    | "update_incident"
    | "close_incident"
    | "reopen_incident"
    // Audits
    | "create_audit"
    | "update_audit"
    | "complete_audit"
    // Documents
    | "upload_document"
    | "delete_document"
    | "download_report"
    // System
    | "view"
    | "error"
    | "crash"
    | "exception"
    // Dynamic types fallback
    | string;

interface LogActionParams {
    action: AuditActionType;
    targetType: string;
    targetId?: string | null;
    targetName?: string | null;
    description?: string;
    details?: Record<string, any>;
    companyId?: string | null;
    companyIdOverride?: string;
}

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    );

/**
 * Hook to create audit log entries for any user action.
 * Usage: const { logAction } = useAuditLog();
 *        await logAction({ action: "create_incident", targetType: "incident", targetId: id, targetName: title });
 */
export function useAuditLog() {
    const { companyId } = useAuth();

    const logAction = useCallback(
        async ({
            action,
            targetType,
            targetId,
            targetName,
            description,
            details,
            companyId: overrideCompanyId,
            companyIdOverride,
        }: LogActionParams) => {
            const resolvedCompanyId = companyIdOverride ?? overrideCompanyId ?? companyId;
            if (!resolvedCompanyId && action !== "login" && action !== "signup") {
                console.warn("⚠️ Attempted to log action without companyId:", action);
                // Still attempt the log — the RPC will handle null company_id for system-level events
            }

            try {
                const safeTargetId = targetId && isUuid(targetId) ? targetId : null;
                const mergedDetails = {
                    ...(details || {}),
                    ...(description ? { description } : {}),
                    ...(targetId && !safeTargetId ? { target_ref: targetId } : {}),
                };

                console.log("📝 Logging action:", {
                    action,
                    targetType,
                    targetName,
                    companyId: resolvedCompanyId,
                });

                const { error } = await supabase.rpc("create_audit_log", {
                    p_action_type: action,
                    p_target_type: targetType,
                    p_target_id: safeTargetId,
                    p_target_name: targetName || targetType,
                    p_details: mergedDetails,
                    p_company_id: resolvedCompanyId || null,
                });

                if (error) {
                    console.error("❌ Failed to create audit log:", error);
                }
            } catch (err) {
                console.error("❌ Unexpected error logging action:", err);
            }
        },
        [companyId]
    );

    /**
     * Log an application error / crash.
     * Call from React error boundaries or catch blocks.
     */
    const logError = useCallback(
        async (error: Error | unknown, context?: string) => {
            const err = error instanceof Error ? error : new Error(String(error));
            try {
                await supabase.rpc("create_audit_log", {
                    p_action_type: "error",
                    p_target_type: "system",
                    p_target_id: null,
                    p_target_name: context || "Application Error",
                    p_details: {
                        message: err.message,
                        stack: err.stack?.slice(0, 500),
                        context,
                        timestamp: new Date().toISOString(),
                    },
                    p_company_id: companyId || null,
                });
            } catch (logErr) {
                console.error("Failed to log error:", logErr);
            }
        },
        [companyId]
    );

    return { logAction, logError };
}
