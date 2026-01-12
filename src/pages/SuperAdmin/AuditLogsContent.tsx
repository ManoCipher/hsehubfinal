import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    FileText,
    Search,
    Download,
    RefreshCcw,
    Shield,
    Activity,
} from "lucide-react";

interface AuditLog {
    id: string;
    actor_email: string;
    actor_role: string;
    action_type: string;
    target_type: string;
    target_id: string | null;
    target_name: string | null;
    details: any;
    ip_address: string | null;
    company_id: string | null;
    created_at: string;
    companies?: {
        name: string;
    };
}

export default function AuditLogsContent() {
    const { toast } = useToast();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [targetFilter, setTargetFilter] = useState("all");
    const [dateRange, setDateRange] = useState("7days");

    const [stats, setStats] = useState({
        totalLogs: 0,
        todayLogs: 0,
        criticalActions: 0,
    });

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [dateRange]);

    const fetchLogs = async () => {
        try {
            setLoadingData(true);

            const now = new Date();
            const daysAgo = dateRange === "7days" ? 7 : dateRange === "30days" ? 30 : 90;
            const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

            const { data, error } = await supabase
                .from("audit_logs")
                .select(`
          *,
          companies:company_id (
            name
          )
        `)
                .gte("created_at", startDate.toISOString())
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            setLogs(data || []);
        } catch (error: any) {
            console.error("Error fetching audit logs:", error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoadingData(false);
        }
    };

    const fetchStats = async () => {
        try {
            const { count: totalLogs } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true });

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const { count: todayLogs } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .gte("created_at", today.toISOString());

            const criticalActions = [
                "block_company",
                "delete_user",
                "modify_subscription",
                "delete_company",
            ];

            const { count: criticalCount } = await supabase
                .from("audit_logs")
                .select("id", { count: "exact", head: true })
                .in("action_type", criticalActions);

            setStats({
                totalLogs: totalLogs || 0,
                todayLogs: todayLogs || 0,
                criticalActions: criticalCount || 0,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const handleExport = () => {
        const csv = [
            ["Date", "Actor", "Action", "Target Type", "Target Name", "IP Address", "Company"],
            ...filteredLogs.map((log) => [
                new Date(log.created_at).toLocaleString(),
                log.actor_email,
                log.action_type,
                log.target_type,
                log.target_name || "N/A",
                log.ip_address || "N/A",
                log.companies?.name || "N/A",
            ]),
        ]
            .map((row) => row.join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString()}.csv`;
        a.click();

        toast({
            title: "Success",
            description: "Audit logs exported successfully",
        });
    };

    const filteredLogs = logs.filter((log) => {
        const matchesSearch =
            log.actor_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.target_name &&
                log.target_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesAction =
            actionFilter === "all" || log.action_type === actionFilter;

        const matchesTarget =
            targetFilter === "all" || log.target_type === targetFilter;

        return matchesSearch && matchesAction && matchesTarget;
    });

    const getActionBadgeVariant = (action: string) => {
        const critical = ["block_company", "delete_user", "delete_company"];
        const warning = ["modify_subscription", "extend_trial", "unblock_company"];

        if (critical.includes(action)) return "destructive";
        if (warning.includes(action)) return "secondary";
        return "outline";
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalLogs}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.todayLogs}
                        </div>
                        <p className="text-xs text-muted-foreground">Last 24 hours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Actions</CardTitle>
                        <Shield className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {stats.criticalActions}
                        </div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Actions */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="md:col-span-2">
                    <CardContent className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="block_company">Block Company</SelectItem>
                                <SelectItem value="unblock_company">Unblock Company</SelectItem>
                                <SelectItem value="modify_subscription">Modify Subscription</SelectItem>
                                <SelectItem value="extend_trial">Extend Trial</SelectItem>
                                <SelectItem value="view">View</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={targetFilter} onValueChange={setTargetFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="All Targets" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Targets</SelectItem>
                                <SelectItem value="company">Company</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="subscription">Subscription</SelectItem>
                                <SelectItem value="invoice">Invoice</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7days">Last 7 days</SelectItem>
                                <SelectItem value="30days">Last 30 days</SelectItem>
                                <SelectItem value="90days">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button onClick={fetchLogs} variant="outline">
                    <RefreshCcw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
                <Button onClick={handleExport} variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Trail ({filteredLogs.length} entries)</CardTitle>
                    <CardDescription>
                        Complete history of administrative actions and system events
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Actor</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Target</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>IP Address</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            No audit logs found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {new Date(log.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{log.actor_email}</p>
                                                    <Badge variant="outline" className="text-xs">
                                                        {log.actor_role}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getActionBadgeVariant(log.action_type)}>
                                                    {log.action_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">
                                                        {log.target_name || log.target_type}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {log.target_type}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {log.companies?.name || (
                                                    <span className="text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-mono text-xs">
                                                    {log.ip_address || "N/A"}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
