// @ts-nocheck - This is a Deno Edge Function with Deno-specific imports
// Edge Function to clean up orphaned auth users
// An orphaned user is one who exists in auth.users but has no team_members record
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { email } = await req.json();

        if (!email) {
            return new Response(
                JSON.stringify({ error: "Missing required field: email" }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                }
            );
        }

        // Create Supabase client with service role key (admin privileges)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        // Check if user exists in auth.users
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error("Error listing users:", listError);
            return new Response(
                JSON.stringify({ error: "Failed to check user status" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                }
            );
        }

        const existingUser = users.find((u: any) => u.email === email);

        if (!existingUser) {
            // User doesn't exist in auth, no cleanup needed
            return new Response(
                JSON.stringify({
                    success: true,
                    deleted: false,
                    message: "No auth user found"
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // Check if this user has any team memberships
        const { data: teamMembers, error: teamError } = await supabase
            .from("team_members")
            .select("id")
            .eq("user_id", existingUser.id)
            .limit(1);

        if (teamError) {
            console.error("Error checking team members:", teamError);
            return new Response(
                JSON.stringify({ error: "Failed to check team membership" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                }
            );
        }

        // If user has team memberships, they're not orphaned
        if (teamMembers && teamMembers.length > 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    deleted: false,
                    message: "User has active team memberships"
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                }
            );
        }

        // User exists in auth but has no team memberships - delete them
        console.log(`Deleting orphaned auth user: ${email} (${existingUser.id})`);

        const { error: deleteError } = await supabase.auth.admin.deleteUser(
            existingUser.id
        );

        if (deleteError) {
            console.error("Error deleting orphaned user:", deleteError);
            return new Response(
                JSON.stringify({ error: "Failed to delete orphaned user" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                deleted: true,
                message: "Orphaned auth user deleted successfully"
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error: any) {
        console.error("Error in cleanup-orphaned-user function:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
});
