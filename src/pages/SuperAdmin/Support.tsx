import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    Headphones,
    AlertCircle,
    CheckCircle2,
    Clock,
    TrendingUp,
    MessageSquare,
} from "lucide-react";

interface SupportTicket {
    id: string;
    company_id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    category: string;
    created_at: string;
    companies?: {
        name: string;
    };
}

export default function Support() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

    const [stats, setStats] = useState({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        avgResponseTime: "2.4 hours",
    });

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    useEffect(() => {
        if (user && userRole === "super_admin") {
            fetchTickets();
            fetchStats();
        }
    }, [user, userRole]);

    const fetchTickets = async () => {
        try {
            setLoadingData(true);

            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          companies:company_id (
            name
          )
        `)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;

            setTickets(data || []);
        } catch (error: any) {
            console.error("Error fetching tickets:", error);
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
            const { count: total } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true });

            const { count: open } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "open");

            const { count: inProgress } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "in_progress");

            const { count: resolved } = await supabase
                .from("support_tickets")
                .select("id", { count: "exact", head: true })
                .eq("status", "resolved");

            setStats({
                total: total || 0,
                open: open || 0,
                inProgress: inProgress || 0,
                resolved: resolved || 0,
                avgResponseTime: "2.4 hours",
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const filteredTickets = tickets.filter((ticket) => {
        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
        const matchesPriority =
            priorityFilter === "all" || ticket.priority === priorityFilter;
        return matchesStatus && matchesPriority;
    });

    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, { variant: any; color: string }> = {
            low: { variant: "outline", color: "text-gray-600" },
            medium: { variant: "secondary", color: "text-yellow-600" },
            high: { variant: "default", color: "text-orange-600" },
            urgent: { variant: "destructive", color: "text-red-600" },
        };
        return variants[priority] || variants.medium;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            open: "destructive",
            in_progress: "secondary",
            resolved: "default",
            closed: "outline",
        };
        return variants[status] || "outline";
    };

    if (loading || loadingData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Support & Customer Feedback</h2>
                <p className="text-muted-foreground">
                    Manage customer support tickets and track satisfaction
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Open</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.open}</div>
                        <p className="text-xs text-muted-foreground">Needs attention</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {stats.inProgress}
                        </div>
                        <p className="text-xs text-muted-foreground">Being worked on</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats.resolved}
                        </div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.avgResponseTime}
                        </div>
                        <p className="text-xs text-muted-foreground">Response time</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter by priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>

            {/* Tickets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Support Tickets ({filteredTickets.length})</CardTitle>
                    <CardDescription>
                        Customer support requests and feedback tracking
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ticket</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            No support tickets found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{ticket.title}</p>
                                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                                        {ticket.description}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>{ticket.companies?.name || "N/A"}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{ticket.category}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getPriorityBadge(ticket.priority).variant}>
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadge(ticket.status)}>
                                                    {ticket.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    View
                                                </Button>
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
