
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AuditActionType =
    | "create_employee"
    | "delete_employee"
    | "assign_task"
    | "complete_task"
    | "reopen_task"
    | "add_employee_note"
    | "delete_employee_note"
    | "activate_iso_standard"
    | "deactivate_iso_standard"
    | "update_custom_iso"
    | "invite_team_member"
    // Dynamic types fallback
    | string;

interface LogActionParams {
    action: AuditActionType;
    targetType: string;
    targetId: string;
    targetName: string;
    details?: Record<string, any>;
}

export function useAuditLog() {
    const { companyId } = useAuth();

    const logAction = useCallback(
        async ({ action, targetType, targetId, targetName, details }: LogActionParams) => {
            if (!companyId) {
                console.warn("⚠️ Attempted to log action without companyId:", action);
                return;
            }

            try {
                console.log("📝 Logging action:", {
                    action,
                    targetType,
                    targetName,
                    companyId
                });

                const { error } = await supabase.rpc("create_audit_log", {
                    p_action_type: action,
                    p_target_type: targetType,
                    p_target_id: targetId,
                    p_target_name: targetName,
                    p_details: details || {},
                    p_company_id: companyId,
                });

                if (error) {
                    console.error("❌ Failed to create audit log:", error);
                } else {
                    console.log("✅ Audit log created successfully:", action);
                }
            } catch (err) {
                console.error("❌ Unexpected error logging action:", err);
            }
        },
        [companyId]
    );

    return { logAction };
}
