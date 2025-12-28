import { supabase } from "@/integrations/supabase/client";
import { nanoid } from "nanoid";

export async function sendMemberInvitation(
    teamMemberId: string,
    email: string,
    name: string
) {
    try {
        // Generate secure token
        const token = nanoid(32);

        // Store token in database
        const { error: tokenError } = await supabase
            .from("member_invitation_tokens")
            .insert({
                team_member_id: teamMemberId,
                token: token,
            });

        if (tokenError) {
            console.error("Error storing token:", tokenError);
            throw tokenError;
        }

        // Build URL - Point to the join team page, not notes
        const inviteUrl = `${window.location.origin}/join/${token}`;

        // Send email via Supabase Edge Function
        const { data, error } = await supabase.functions.invoke(
            "send-invitation-email",
            {
                body: {
                    to: email,
                    name: name,
                    inviteUrl: inviteUrl,
                },
            }
        );

        console.log("Edge function response:", { data, error });

        if (error) {
            console.error("Error sending email:", error);
            throw error;
        }

        // Check if the response contains an error
        if (data?.error) {
            console.error("Edge function returned error:", data.error, data.details);
            throw new Error(data.error);
        }

        return { success: true, token };
    } catch (error) {
        console.error("Failed to send member invitation:", error);
        throw error;
    }
}

export async function sendNoteNotification(
    employeeEmail: string,
    employeeName: string,
    noteContent: string,
    fromEmployeeName: string
) {
    try {
        // Send notification email for @mentioned notes
        const { data, error } = await supabase.functions.invoke(
            "send-note-notification",
            {
                body: {
                    to: employeeEmail,
                    name: employeeName,
                    noteContent: noteContent,
                    from: fromEmployeeName,
                },
            }
        );

        if (error) {
            console.error("Error sending note notification:", error);
            console.error("Response data:", data);
            throw error;
        }

        if (data?.error) {
            console.error("Edge Function returned error:", data.error);
            throw new Error(data.error);
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to send note notification:", error);
        throw error;
    }
}
