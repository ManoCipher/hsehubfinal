import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Server,
    Database,
    Cpu,
    HardDrive,
    Activity,
    Zap,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";

// Mock data for placeholder UI
const mockApiLatencyData = [
    { time: "00:00", latency: 45 },
    { time: "04:00", latency: 52 },
    { time: "08:00", latency: 78 },
    { time: "12:00", latency: 95 },
    { time: "16:00", latency: 112 },
    { time: "20:00", latency: 68 },
];

const mockErrorRateData = [
    { time: "00:00", errors: 2 },
    { time: "04:00", errors: 1 },
    { time: "08:00", errors: 5 },
    { time: "12:00", errors: 8 },
    { time: "16:00", errors: 3 },
    { time: "20:00", errors: 2 },
];

export default function SystemHealth() {
    const { user, userRole, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && (!user || userRole !== "super_admin")) {
            navigate("/dashboard");
        }
    }, [user, userRole, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">System Health & Performance</h2>
                <p className="text-muted-foreground">
                    Platform observability and infrastructure monitoring (Placeholder UI)
                </p>
            </div>

            <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                        <strong>Placeholder UI:</strong> This page shows mock data for demonstration purposes.
                        In production, this would integrate with your DevOps monitoring tools (e.g., Datadog, New Relic, CloudWatch).
                    </p>
                </div>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Status</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            <div className="text-2xl font-bold text-green-600">Operational</div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">99.98% uptime</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">78ms</div>
                        <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">0.02%</div>
                        <p className="text-xs text-muted-foreground mt-2">Within SLA</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Server className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,247</div>
                        <p className="text-xs text-muted-foreground mt-2">Currently online</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <CardTitle>API Latency (ms)</CardTitle>
                        <CardDescription>Average response time over 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mockApiLatencyData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area
                                        type="monotone"
                                        dataKey="latency"
                                        stroke="#3B82F6"
                                        fill="#3B82F6"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Error Rate</CardTitle>
                        <CardDescription>Request errors per hour</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mockErrorRateData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="time" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="errors" fill="#F59E0B" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Infrastructure Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5" />
                            Database Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>CPU Usage</span>
                                <span className="font-medium">42%</span>
                            </div>
                            <Progress value={42} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Memory Usage</span>
                                <span className="font-medium">68%</span>
                            </div>
                            <Progress value={68} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Storage Used</span>
                                <span className="font-medium">35%</span>
                            </div>
                            <Progress value={35} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Cpu className="w-5 h-5" />
                            Server Resources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>CPU Load</span>
                                <span className="font-medium">28%</span>
                            </div>
                            <Progress value={28} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>RAM Usage</span>
                                <span className="font-medium">52%</span>
                            </div>
                            <Progress value={52} className="h-2" />
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span>Network I/O</span>
                                <span className="font-medium">18%</span>
                            </div>
                            <Progress value={18} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HardDrive className="w-5 h-5" />
                            Storage by Tenant
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Company A</span>
                                    <Badge variant="outline">2.4 GB</Badge>
                                </div>
                                <Progress value={24} className="h-2" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Company B</span>
                                    <Badge variant="outline">1.8 GB</Badge>
                                </div>
                                <Progress value={18} className="h-2" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Company C</span>
                                    <Badge variant="outline">3.1 GB</Badge>
                                </div>
                                <Progress value={31} className="h-2" />
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Others</span>
                                    <Badge variant="outline">5.2 GB</Badge>
                                </div>
                                <Progress value={52} className="h-2" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
