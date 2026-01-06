import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Puzzle,
  Package,
  FileText,
  BarChart3,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  cancelledCompanies: number;
  totalRevenue: number;
  addonRevenue: number;
  totalUsers: number;
  totalAddons: number;
}

interface TierDistribution {
  name: string;
  value: number;
  color: string;
}

interface MonthlyRevenue {
  month: string;
  subscriptions: number;
  addons: number;
}

export default function SuperAdminDashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    cancelledCompanies: 0,
    totalRevenue: 0,
    addonRevenue: 0,
    totalUsers: 0,
    totalAddons: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([]);
  const [expiringTrials, setExpiringTrials] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || userRole !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    if (user && userRole === "super_admin") {
      fetchStats();
      fetchRecentCompanies();
      fetchTierDistribution();
      fetchExpiringTrials();
      fetchRecentActivity();
    }
  }, [user, userRole]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);

      // Fetch total companies
      const { count: totalCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });

      // Fetch active companies
      const { count: activeCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "active");

      // Fetch trial companies
      const { count: trialCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "trial");

      // Fetch cancelled companies
      const { count: cancelledCompanies } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("subscription_status", "cancelled");

      // Fetch total users
      const { count: totalUsers } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true });

      // Fetch total addons sold
      const { count: totalAddons } = await supabase
        .from("company_addons")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      // Calculate subscription revenue
      const { data: activeSubscriptions } = await supabase
        .from("companies")
        .select("subscription_tier")
        .eq("subscription_status", "active");

      const tierPrices: Record<string, number> = {
        basic: 149,
        standard: 249,
        premium: 349,
      };

      const totalRevenue =
        activeSubscriptions?.reduce((sum, company) => {
          return sum + (tierPrices[company.subscription_tier] || 0);
        }, 0) || 0;

      // Calculate addon revenue
      const { data: addonData } = await supabase
        .from("company_addons")
        .select("price_paid")
        .eq("status", "active");

      const addonRevenue = addonData?.reduce((sum, addon) => {
        return sum + (addon.price_paid || 0);
      }, 0) || 0;

      setStats({
        totalCompanies: totalCompanies || 0,
        activeCompanies: activeCompanies || 0,
        trialCompanies: trialCompanies || 0,
        cancelledCompanies: cancelledCompanies || 0,
        totalRevenue,
        addonRevenue,
        totalUsers: totalUsers || 0,
        totalAddons: totalAddons || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTierDistribution = async () => {
    try {
      const { data: companies } = await supabase
        .from("companies")
        .select("subscription_tier")
        .in("subscription_status", ["active", "trial"]);

      const distribution: Record<string, number> = { basic: 0, standard: 0, premium: 0 };
      companies?.forEach(c => {
        distribution[c.subscription_tier] = (distribution[c.subscription_tier] || 0) + 1;
      });

      setTierDistribution([
        { name: "Basic", value: distribution.basic, color: "#3B82F6" },
        { name: "Standard", value: distribution.standard, color: "#8B5CF6" },
        { name: "Premium", value: distribution.premium, color: "#F59E0B" },
      ]);
    } catch (error) {
      console.error("Error fetching tier distribution:", error);
    }
  };

  const fetchExpiringTrials = async () => {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data } = await supabase
        .from("companies")
        .select("id, name, email, trial_ends_at, created_at")
        .eq("subscription_status", "trial")
        .order("created_at", { ascending: true })
        .limit(5);

      setExpiringTrials(data || []);
    } catch (error) {
      console.error("Error fetching expiring trials:", error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data } = await supabase
        .from("subscription_history")
        .select(`
          *,
          companies:company_id(name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      setRecentActivity(data || []);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  const fetchRecentCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentCompanies(data || []);
    } catch (error) {
      console.error("Error fetching recent companies:", error);
    }
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Super Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage companies, subscriptions, add-ons, and system-wide settings
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Link to="/super-admin/companies">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Companies</p>
                <p className="text-xs text-muted-foreground">Manage all companies</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/super-admin/users">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium">Users</p>
                <p className="text-xs text-muted-foreground">Global user directory</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/super-admin/subscriptions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Subscriptions</p>
                <p className="text-xs text-muted-foreground">Manage plans & pricing</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/super-admin/addons">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Puzzle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Add-ons</p>
                <p className="text-xs text-muted-foreground">Manage add-on catalog</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/super-admin/analytics">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">View detailed reports</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/super-admin/audit-logs">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Audit Logs</p>
                <p className="text-xs text-muted-foreground">Security & activity</p>
              </div>
              <ArrowUpRight className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Companies
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalCompanies}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.activeCompanies} active, {stats.trialCompanies} trial
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Monthly Revenue
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              €{(stats.totalRevenue + stats.addonRevenue).toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Subscriptions: €{stats.totalRevenue}</span>
              <span className="text-xs text-green-600">+€{stats.addonRevenue} add-ons</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total Users
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalUsers}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Across all companies
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Add-ons
            </CardTitle>
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Puzzle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.totalAddons}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Sold to companies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tier Distribution</CardTitle>
            <CardDescription>Breakdown of companies by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trials Expiring Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Trials Expiring Soon
            </CardTitle>
            <CardDescription>Companies in trial phase requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiringTrials.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No trials expiring soon
                </p>
              ) : (
                expiringTrials.map((company) => {
                  const createdDate = new Date(company.created_at);
                  const trialEndDate = company.trial_ends_at
                    ? new Date(company.trial_ends_at)
                    : new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                  const daysLeft = Math.max(0, Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">{company.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"}>
                          {daysLeft} days left
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Companies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Companies</CardTitle>
              <CardDescription>
                Latest registered organizations
              </CardDescription>
            </div>
            <Link
              to="/super-admin/companies"
              className="text-sm text-primary hover:underline"
            >
              View All →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCompanies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No companies registered yet
              </p>
            ) : (
              recentCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {company.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        company.subscription_status === "active"
                          ? "default"
                          : company.subscription_status === "trial"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {company.subscription_tier}
                    </Badge>
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
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
