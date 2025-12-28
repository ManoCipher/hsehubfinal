import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, CheckCircle, Users } from "lucide-react";
import { toast } from "sonner";

interface InvitationData {
  teamMemberId: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
  companyName: string;
  role: string;
}

export default function JoinTeam() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    async function validateInvitation() {
      if (!token) {
        setError("Invalid invitation link. Please request a new invitation.");
        setLoading(false);
        return;
      }

      try {
        // Validate token and get invitation data
        const { data: tokenData, error: tokenError } = await supabase
          .from("member_invitation_tokens")
          .select("team_member_id, expires_at, used_at")
          .eq("token", token)
          .single();

        if (tokenError || !tokenData) {
          setError("This invitation link is invalid or has already been used.");
          setLoading(false);
          return;
        }

        // Check if token is expired
        if (new Date(tokenData.expires_at) < new Date()) {
          setError("This invitation has expired. Please ask your administrator to send a new invitation.");
          setLoading(false);
          return;
        }

        // Check if already used
        if (tokenData.used_at) {
          setError("This invitation has already been used. If you need to reset your password, please contact your administrator.");
          setLoading(false);
          return;
        }

        // Get team member info
        const { data: member, error: memberError } = await supabase
          .from("team_members")
          .select(`
            id,
            first_name,
            last_name,
            email,
            role,
            company_id,
            status,
            user_id,
            companies:company_id (
              name
            )
          `)
          .eq("id", tokenData.team_member_id)
          .single();

        if (memberError || !member) {
          setError("Could not find your invitation details. Please contact your administrator.");
          setLoading(false);
          return;
        }

        // Check if member is already active
        if (member.status === "active" && member.user_id) {
          setError("Your account is already active. Please sign in instead.");
          setLoading(false);
          return;
        }

        setInvitationData({
          teamMemberId: member.id,
          email: member.email,
          firstName: member.first_name,
          lastName: member.last_name,
          companyId: member.company_id,
          companyName: (member.companies as any)?.name || "Your Company",
          role: member.role,
        });
        setLoading(false);
      } catch (err) {
        console.error("Error validating invitation:", err);
        setError("An error occurred while validating your invitation. Please try again later.");
        setLoading(false);
      }
    }

    validateInvitation();
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationData) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationData.email,
        password: password,
        options: {
          data: {
            full_name: `${invitationData.firstName} ${invitationData.lastName}`,
          },
        },
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes("already registered")) {
          toast.error("An account with this email already exists. Please sign in instead.");
          setSubmitting(false);
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Step 2: Wait for user to be created
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Sign in to get a valid session
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: invitationData.email,
        password: password,
      });

      if (signInError) throw signInError;
      if (!sessionData.user) throw new Error("Failed to establish session");

      // Step 4: Create user_roles entry to link user to company
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: sessionData.user.id,
          company_id: invitationData.companyId,
          role: invitationData.role || "user",
        });

      if (roleError) {
        console.error("Error creating user role:", roleError);
        // Continue anyway - the admin can fix this later
      }

      // Step 5: Update team_members record with user_id and status
      const { error: updateError } = await supabase
        .from("team_members")
        .update({
          user_id: sessionData.user.id,
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", invitationData.teamMemberId);

      if (updateError) {
        console.error("Error updating team member:", updateError);
        // Continue anyway
      }

      // Step 6: Mark invitation token as used
      await supabase
        .from("member_invitation_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      // Step 7: Create profile entry
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: sessionData.user.id,
          first_name: invitationData.firstName,
          last_name: invitationData.lastName,
          email: invitationData.email,
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Continue anyway
      }

      setSuccess(true);
      toast.success("Account created successfully!");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error joining team:", err);
      toast.error(err.message || "Failed to create account. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Invitation Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/")}>
                Go to Homepage
              </Button>
              <Button onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-success/5 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Welcome to the Team!</h2>
            <p className="text-muted-foreground">
              Your account has been created successfully. You'll be redirected to the dashboard shortly...
            </p>
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-success/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl blur opacity-25"></div>
              <img
                src="/logo.png"
                alt="SafetyHub Logo"
                className="h-16 w-16 relative z-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            SafetyHub
          </h1>
          <p className="text-muted-foreground mt-2">HSE Management Platform</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Join Your Team</CardTitle>
            </div>
            <CardDescription>
              You've been invited to join <strong>{invitationData?.companyName}</strong> on SafetyHub.
              Create your password to complete your account setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              {/* Pre-filled user info (read-only) */}
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={`${invitationData?.firstName} ${invitationData?.lastName}`}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={invitationData?.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={invitationData?.role}
                  disabled
                  className="bg-muted capitalize"
                />
              </div>

              {/* Password fields */}
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Join Team & Create Account"
                )}
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground mt-4">
              By joining, you agree to the SafetyHub Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>

        {/* Already have an account? */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}
