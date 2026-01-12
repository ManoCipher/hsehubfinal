import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Building2,
    Users,
    Activity,
    CreditCard,
    Puzzle,
    ArrowLeft,
    Ban,
    CheckCircle,
    Clock,
    FileEdit,
    Key,
    Plus,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Company {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    subscription_tier: string;
    subscription_status: string;
    max_employees: number;
    created_at: string;
    is_blocked: boolean;
    blocked_at: string | null;
    blocked_reason: string | null;
    trial_ends_at: string | null;
}

interface CompanyUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    last_login_at: string | null;
    failed_login_count: number;
    created_at: string;
}

interface SubscriptionEvent {
    id: string;
    action: string;
    from_tier: string | null;
    to_tier: string | null;
    from_status: string | null;
    to_status: string | null;
    created_at: string;
    notes: string | null;
}

interface CompanyAddon {
    id: string;
    addon_id: string;
    addon_name: string;
    price_paid: number | null;
    status: string;
    start_date: string;
    billing_cycle: string;
}

export default function CompanyDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, userRole, loading } = useAuth();
    const { toast } = useToast();

    const [company, setCompany] = useState<Company | null>(null);
    const [users, setUsers] = useState<CompanyUser[]>([]);
    const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionEvent[]>([]);
    const [addons, setAddons] = useState<CompanyAddon[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    const [blockDialogOpen, setBlockDialogOpen] = useState(false);
    const [blockReason, setBlockReason] = useState("");

    const [extendTrialDialogOpen, setExtendTrialDialogOpen] = useState(false);
    const [trialExtensionDays, setTrialExtensionDays] = useState("30");

    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [selectedUserForReset, setSelectedUserForReset] = useState<CompanyUser | null>(null);
    const [newPassword, setNewPassword] = useState("");

    const [invoiceCorrectionDialogOpen, setInvoiceCorrectionDialogOpen] = useState(false);
    const [correctionReason, setCorrectionReason] = useState("");
    const [correctionAmount, setCorrectionAmount] = useState("");



    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        if (user && userRole === "super_admin" && id) {
            fetchCompanyData();
        }
    }, [user, userRole, id]);

    const fetchCompanyData = async () => {
        try {
            setLoadingData(true);
            await Promise.all([
                fetchCompany(),
                fetchUsers(),
                fetchSubscriptionHistory(),
                fetchAddons(),
                fetchAuditLogs(),
            ]);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoadingData(false);
        }
    };

    const fetchCompany = async () => {
        const { data, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;
        setCompany(data);
    };

    const fetchUsers = async () => {
        const { data: userRolesData, error: rolesError } = await supabase
            .from("user_roles")
            .select("id, role, last_login_at, failed_login_count, created_at, user_id")
            .eq("company_id", id);

        if (rolesError) throw rolesError;

        if (!userRolesData || userRolesData.length === 0) {
            setUsers([]);
            return;
        }

        // Get user IDs
        const userIds = userRolesData.map((ur) => ur.user_id);

        // Fetch profiles separately
        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);

        if (profilesError) throw profilesError;

        // Join the data on the frontend
        const transformedUsers = userRolesData.map((ur) => {
            const profile = profilesData?.find((p) => p.id === ur.user_id);
            return {
                id: ur.user_id,
                email: profile?.email || "N/A",
                full_name: profile?.full_name || "N/A",
                role: ur.role,
                last_login_at: ur.last_login_at,
                failed_login_count: ur.failed_login_count || 0,
                created_at: ur.created_at,
            };
        });

        setUsers(transformedUsers);
    };

    const fetchSubscriptionHistory = async () => {
        const { data, error } = await supabase
            .from("subscription_history")
            .select("*")
            .eq("company_id", id)
            .order("created_at", { ascending: false })
            .limit(10);

        if (error) {
            console.error("Subscription history error:", error);
            setSubscriptionHistory([]);
            return;
        }
        setSubscriptionHistory(data || []);
    };

    const fetchAddons = async () => {
        const { data, error } = await supabase
            .from("company_addons")
            .select(`
                *,
                addon_definitions:addon_id(name, code)
            `)
            .eq("company_id", id)
            .order("start_date", { ascending: false });

        if (error) {
            console.error("Addons error:", error);
            setAddons([]);
            return;
        }

        // Transform data to include addon_name from the join
        const transformedAddons = (data || []).map(addon => ({
            id: addon.id,
            addon_id: addon.addon_id,
            addon_name: addon.addon_definitions?.name || "Unknown Add-on",
            price_paid: addon.price_paid,
            status: addon.status,
            start_date: addon.start_date,
            billing_cycle: addon.billing_cycle,
        }));

        setAddons(transformedAddons);
    };

    const fetchAuditLogs = async () => {
        const { data, error } = await supabase
            .from("audit_logs")
            .select("*")
            .eq("company_id", id)
            .order("created_at", { ascending: false })
            .limit(20);

        if (error) {
            console.error("Audit logs error:", error);
            setAuditLogs([]);
            return;
        }
        setAuditLogs(data || []);
    };

    const handleBlockCompany = async () => {
        if (!blockReason.trim()) {
            toast({
                title: "Error",
                description: "Please provide a reason for blocking",
                variant: "destructive",
            });
            return;
        }

        try {
            const { error } = await supabase
                .from("companies")
                .update({
                    is_blocked: true,
                    blocked_at: new Date().toISOString(),
                    blocked_reason: blockReason,
                    blocked_by: user?.id,
                })
                .eq("id", id);

            if (error) throw error;

            // Create audit log
            await supabase.rpc("create_audit_log", {
                p_action_type: "block_company",
                p_target_type: "company",
                p_target_id: id,
                p_target_name: company?.name || "",
                p_details: { reason: blockReason },
                p_company_id: id,
            });

            toast({
                title: "Success",
                description: "Company blocked successfully",
            });

            setBlockDialogOpen(false);
            setBlockReason("");
            fetchCompanyData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleUnblockCompany = async () => {
        try {
            const { error } = await supabase
                .from("companies")
                .update({
                    is_blocked: false,
                    blocked_at: null,
                    blocked_reason: null,
                    blocked_by: null,
                })
                .eq("id", id);

            if (error) throw error;

            // Create audit log
            await supabase.rpc("create_audit_log", {
                p_action_type: "unblock_company",
                p_target_type: "company",
                p_target_id: id,
                p_target_name: company?.name || "",
                p_company_id: id,
            });

            toast({
                title: "Success",
                description: "Company unblocked successfully",
            });

            fetchCompanyData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleExtendTrial = async () => {
        const days = parseInt(trialExtensionDays);
        if (isNaN(days) || days <= 0) {
            toast({
                title: "Error",
                description: "Please enter a valid number of days",
                variant: "destructive",
            });
            return;
        }

        try {
            // Calculate new trial end date
            const currentTrialEnd = company?.trial_ends_at
                ? new Date(company.trial_ends_at)
                : new Date();

            const newTrialEnd = new Date(currentTrialEnd);
            newTrialEnd.setDate(newTrialEnd.getDate() + days);

            const { error } = await supabase
                .from("companies")
                .update({
                    trial_ends_at: newTrialEnd.toISOString(),
                    subscription_status: "trial",
                })
                .eq("id", id);

            if (error) throw error;

            // Create audit log
            await supabase.rpc("create_audit_log", {
                p_action_type: "extend_trial",
                p_target_type: "company",
                p_target_id: id,
                p_target_name: company?.name || "",
                p_details: {
                    days_extended: days,
                    new_trial_end: newTrialEnd.toISOString()
                },
                p_company_id: id,
            });

            toast({
                title: "Success",
                description: `Trial extended by ${days} days`,
            });

            setExtendTrialDialogOpen(false);
            setTrialExtensionDays("30");
            fetchCompanyData();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUserForReset) return;

        if (!newPassword || newPassword.length < 8) {
            toast({
                title: "Error",
                description: "Password must be at least 8 characters",
                variant: "destructive",
            });
            return;
        }

        try {
            // Update user password in Supabase auth
            const { error } = await supabase.auth.admin.updateUserById(
                selectedUserForReset.id,
                { password: newPassword }
            );

            if (error) throw error;

            // Create audit log
            await supabase.rpc("create_audit_log", {
                p_action_type: "reset_password",
                p_target_type: "user",
                p_target_id: selectedUserForReset.id,
                p_target_name: selectedUserForReset.email,
                p_details: {
                    reset_by: "super_admin",
                    user_name: selectedUserForReset.full_name,
                },
                p_company_id: id,
            });

            toast({
                title: "Success",
                description: `Password reset for ${selectedUserForReset.email}`,
            });

            setResetPasswordDialogOpen(false);
            setSelectedUserForReset(null);
            setNewPassword("");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };

    const handleInvoiceCorrection = async () => {
        if (!correctionReason.trim() || !correctionAmount.trim()) {
            toast({
                title: "Error",
                description: "Please provide both reason and amount",
                variant: "destructive",
            });
            return;
        }

        const amount = parseFloat(correctionAmount);
        if (isNaN(amount)) {
            toast({
                title: "Error",
                description: "Please enter a valid amount",
                variant: "destructive",
            });
            return;
        }

        try {
            // Create audit log for invoice correction
            await supabase.rpc("create_audit_log", {
                p_action_type: "invoice_correction",
                p_target_type: "company",
                p_target_id: id,
                p_target_name: company?.name || "",
                p_details: {
                    reason: correctionReason,
                    amount: amount,
                    corrected_by: user?.email,
                },
                p_company_id: id,
            });

            toast({
                title: "Success",
                description: "Invoice correction logged successfully",
            });

            setInvoiceCorrectionDialogOpen(false);
            setCorrectionReason("");
            setCorrectionAmount("");
            fetchAuditLogs(); // Refresh audit logs
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        }
    };


    if (loading || loadingData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="p-8">
                <p>Company not found</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-6">
                <Link to="/super-admin/companies">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Companies
                    </Button>
                </Link>

                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-2">{company.name}</h2>
                            <p className="text-muted-foreground">{company.email}</p>
                            <div className="flex gap-2 mt-2">
                                <Badge
                                    variant={
                                        company.subscription_status === "active"
                                            ? "default"
                                            : company.subscription_status === "trial"
                                                ? "secondary"
                                                : "destructive"
                                    }
                                >
                                    {company.subscription_status}
                                </Badge>
                                <Badge variant="outline">{company.subscription_tier}</Badge>
                                {company.is_blocked && (
                                    <Badge variant="destructive">
                                        <Ban className="w-3 h-3 mr-1" />
                                        Blocked
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={() => setExtendTrialDialogOpen(true)}
                            variant="outline"
                        >
                            <Clock className="w-4 h-4 mr-2" />
                            Extend Trial
                        </Button>

                        {company.is_blocked ? (
                            <Button onClick={handleUnblockCompany} variant="default">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Unblock Company
                            </Button>
                        ) : (
                            <Button
                                onClick={() => setBlockDialogOpen(true)}
                                variant="destructive"
                            >
                                <Ban className="w-4 h-4 mr-2" />
                                Block Company
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
                    <TabsTrigger value="billing">Billing</TabsTrigger>
                    <TabsTrigger value="modules">Modules</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    {/* Subscription Status Card - Most Important */}
                    <Card className={`border-2 ${company.subscription_status === "trial"
                        ? "border-orange-300 bg-orange-50 dark:border-orange-600 dark:bg-orange-950/30"
                        : company.subscription_status === "active"
                            ? "border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-950/30"
                            : "border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-950/30"
                        }`}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Subscription Details
                                </CardTitle>
                                <Badge
                                    variant={company.subscription_status === "active" ? "default" : company.subscription_status === "trial" ? "secondary" : "destructive"}
                                    className="text-sm px-3 py-1"
                                >
                                    {company.subscription_status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label className="text-muted-foreground text-sm">Plan Tier</Label>
                                    <p className="text-xl font-bold capitalize">{company.subscription_tier}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">
                                        {company.subscription_status === "trial" ? "Trial Ends" : "Subscription Status"}
                                    </Label>
                                    {company.subscription_status === "trial" ? (
                                        <>
                                            <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                                {company.trial_ends_at
                                                    ? new Date(company.trial_ends_at).toLocaleDateString()
                                                    : "Not set"}
                                            </p>
                                            {company.trial_ends_at && (
                                                <p className="text-sm text-orange-600 dark:text-orange-400">
                                                    {Math.max(0, Math.ceil((new Date(company.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-xl font-bold capitalize text-green-600 dark:text-green-400">
                                            {company.subscription_status}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-muted-foreground text-sm">Max Users</Label>
                                    <p className="text-xl font-bold">
                                        {users.length} / {company.max_employees}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {company.max_employees - users.length} slots available
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{users.length}</div>
                                <p className="text-xs text-muted-foreground">
                                    Max: {company.max_employees}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Add-ons</CardTitle>
                                <Puzzle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {addons.filter((a) => a.status === "active").length}
                                </div>
                                <p className="text-xs text-muted-foreground">Total: {addons.length}</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Created</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {new Date(company.created_at).toLocaleDateString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {Math.floor(
                                        (Date.now() - new Date(company.created_at).getTime()) /
                                        (1000 * 60 * 60 * 24)
                                    )}{" "}
                                    days ago
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Company Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Company ID</Label>
                                <p className="font-mono text-sm">{company.id}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Phone</Label>
                                <p>{company.phone || "N/A"}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Subscription Tier</Label>
                                <p className="capitalize">{company.subscription_tier}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Subscription Status</Label>
                                <p className="capitalize">{company.subscription_status}</p>
                            </div>
                            {company.trial_ends_at && (
                                <div>
                                    <Label className="text-muted-foreground">Trial Ends</Label>
                                    <p>{new Date(company.trial_ends_at).toLocaleDateString()}</p>
                                </div>
                            )}
                            {company.is_blocked && (
                                <>
                                    <div className="col-span-2">
                                        <Label className="text-muted-foreground">Blocked Reason</Label>
                                        <p className="text-destructive">{company.blocked_reason}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Blocked At</Label>
                                        <p>{new Date(company.blocked_at!).toLocaleString()}</p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>Company Users</CardTitle>
                            <CardDescription>All users registered under this company</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead>Failed Logins</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{user.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{user.role}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.last_login_at
                                                    ? new Date(user.last_login_at).toLocaleString()
                                                    : "Never"}
                                            </TableCell>
                                            <TableCell>
                                                {user.failed_login_count > 0 && (
                                                    <Badge variant="destructive">{user.failed_login_count}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedUserForReset(user);
                                                        setResetPasswordDialogOpen(true);
                                                    }}
                                                >
                                                    <Key className="w-4 h-4 mr-2" />
                                                    Reset Password
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Billing Tab */}
                <TabsContent value="billing" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscription History</CardTitle>
                            <CardDescription>Changes to subscription plan and status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {subscriptionHistory.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    No subscription history yet
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Action</TableHead>
                                            <TableHead>From</TableHead>
                                            <TableHead>To</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {subscriptionHistory.map((event) => (
                                            <TableRow key={event.id}>
                                                <TableCell>
                                                    <Badge>{event.action}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {event.from_tier && (
                                                        <Badge variant="outline">{event.from_tier}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {event.to_tier && (
                                                        <Badge variant="outline">{event.to_tier}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(event.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>{event.notes || "-"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Invoice Corrections Section */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileEdit className="h-5 w-5" />
                                        Invoice Corrections
                                    </CardTitle>
                                    <CardDescription>Manage invoice adjustments and corrections</CardDescription>
                                </div>
                                <Button
                                    onClick={() => setInvoiceCorrectionDialogOpen(true)}
                                    variant="outline"
                                >
                                    <FileEdit className="w-4 h-4 mr-2" />
                                    New Correction
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {auditLogs.filter(log => log.action_type === "invoice_correction").length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground">
                                    No invoice corrections recorded yet
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Corrected By</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {auditLogs
                                            .filter(log => log.action_type === "invoice_correction")
                                            .map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell>
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>{log.details?.reason || "-"}</TableCell>
                                                    <TableCell>€{log.details?.amount || "0"}</TableCell>
                                                    <TableCell>{log.details?.corrected_by || log.actor_email}</TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Puzzle className="h-5 w-5" />
                                        Active Modules & Add-ons
                                    </CardTitle>
                                    <CardDescription>Modules and add-ons enabled for this company</CardDescription>
                                </div>
                                <Link to="/super-admin/addons">
                                    <Button variant="outline">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Module
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {addons.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                    <Puzzle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Modules Added</h3>
                                    <p className="text-muted-foreground mb-4">
                                        This company has no add-ons or modules enabled yet.
                                    </p>
                                    <Link to="/super-admin/addons">
                                        <Button>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Module to Company
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Add-on Name</TableHead>
                                            <TableHead>Price</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Activated</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {addons.map((addon) => (
                                            <TableRow key={addon.id}>
                                                <TableCell className="font-medium">{addon.addon_name}</TableCell>
                                                <TableCell>€{addon.price_paid || 0}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={addon.status === "active" ? "default" : "secondary"}
                                                    >
                                                        {addon.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(addon.start_date).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                Company Activity Logs
                            </CardTitle>
                            <CardDescription>
                                All actions and events recorded for this company's users and system
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {auditLogs.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                    <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
                                    <p className="text-muted-foreground">
                                        Activity logs will appear here when users perform actions in the system.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Actor</TableHead>
                                            <TableHead>Target</TableHead>
                                            <TableHead>Details</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {auditLogs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            log.action_type?.includes("delete") ? "destructive" :
                                                                log.action_type?.includes("create") ? "default" :
                                                                    "secondary"
                                                        }
                                                    >
                                                        {log.action_type?.replace(/_/g, " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{log.actor_email || "System"}</TableCell>
                                                <TableCell>{log.target_name || log.target_type || "-"}</TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {log.details ? (
                                                        typeof log.details === "object"
                                                            ? Object.entries(log.details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(", ")
                                                            : String(log.details)
                                                    ) : "-"}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Block Company Dialog */}
            <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Block Company</DialogTitle>
                        <DialogDescription>
                            This will prevent the company from accessing the platform. Please provide a
                            reason.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Reason for blocking</Label>
                            <Textarea
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                                placeholder="e.g., Payment overdue, Terms violation, etc."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBlockCompany}>
                            Block Company
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extend Trial Dialog */}
            <Dialog open={extendTrialDialogOpen} onOpenChange={setExtendTrialDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Extend Trial Period</DialogTitle>
                        <DialogDescription>
                            Extend the trial period for this company. Enter the number of days to add.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Number of days to extend</Label>
                            <Input
                                type="number"
                                value={trialExtensionDays}
                                onChange={(e) => setTrialExtensionDays(e.target.value)}
                                placeholder="30"
                                min="1"
                            />
                            {company?.trial_ends_at && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    Current trial ends: {new Date(company.trial_ends_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setExtendTrialDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleExtendTrial}>
                            Extend Trial
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset User Password</DialogTitle>
                        <DialogDescription>
                            Reset the password for {selectedUserForReset?.full_name} ({selectedUserForReset?.email})
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password (min 8 characters)"
                                minLength={8}
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                                Minimum 8 characters required
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setResetPasswordDialogOpen(false);
                                setSelectedUserForReset(null);
                                setNewPassword("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleResetPassword} variant="destructive">
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invoice Correction Dialog */}
            <Dialog open={invoiceCorrectionDialogOpen} onOpenChange={setInvoiceCorrectionDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Invoice Correction</DialogTitle>
                        <DialogDescription>
                            Log an invoice correction for {company?.name}. This will create an audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Correction Amount (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={correctionAmount}
                                onChange={(e) => setCorrectionAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <Label>Reason for Correction</Label>
                            <Textarea
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                                placeholder="e.g., Billing error, Discount applied, Credit issued"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setInvoiceCorrectionDialogOpen(false);
                                setCorrectionReason("");
                                setCorrectionAmount("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleInvoiceCorrection}>
                            Submit Correction
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
