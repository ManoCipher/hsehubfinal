
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    targetId?: string | null;
    targetName?: string | null;
    description?: string;
    details?: Record<string, any>;
    companyId?: string | null;
}

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
    );

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
        }: LogActionParams) => {
            const resolvedCompanyId = overrideCompanyId ?? companyId;
            if (!resolvedCompanyId) {
                console.warn("⚠️ Attempted to log action without companyId:", action);
                return;
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
                    p_company_id: resolvedCompanyId,
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
