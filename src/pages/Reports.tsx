import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Filter,
  Plus,
  Shield,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  CheckCircle,
  ListChecks,
  Stethoscope,
  Calendar,
  Eye,
  ChevronDown,
  TrendingUp,
  BarChart3,
  GripVertical,
  RotateCcw,
  Lock,
  Unlock,
} from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";

// Wrap ResponsiveGridLayout with WidthProvider
const ResponsiveGridLayout = WidthProvider(Responsive);

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ReportBuilder, { ReportConfig } from "@/components/reports/ReportBuilder";
import ReportLibrary from "@/components/reports/ReportLibrary";
import ReportWidget from "@/components/reports/ReportWidget";

interface ReportStats {
  totalEmployees: number;
  totalRiskAssessments: number;
  totalAudits: number;
  totalTasks: number;
  totalIncidents: number;
  totalMeasures: number;
  totalTrainings: number;
  totalCheckUps: number;
  completedAudits: number;
  completedTasks: number;
  completedMeasures: number;
  openIncidents: number;
  trainingCompliance: number;
}

interface TrainingStatus {
  employee_name: string;
  total_required: number;
  completed: number;
  expired: number;
  compliance_rate: number;
}

interface NavSection {
  id: string;
  name: string;
  icon: React.ReactNode;
}

export default function Reports() {
  const { user, companyId, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeSection, setActiveSection] = useState("overview");
  const [reportName, setReportName] = useState("Monthly Safety Report");
  const [visibility, setVisibility] = useState("only-me");
  const [dateRange, setDateRange] = useState("last-30-days");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [showAddReportDialog, setShowAddReportDialog] = useState(false);

  const [stats, setStats] = useState<ReportStats>({
    totalEmployees: 0,
    totalRiskAssessments: 0,
    totalAudits: 0,
    totalTasks: 0,
    totalIncidents: 0,
    totalMeasures: 0,
    totalTrainings: 0,
    totalCheckUps: 0,
    completedAudits: 0,
    completedTasks: 0,
    completedMeasures: 0,
    openIncidents: 0,
    trainingCompliance: 0,
  });

  const [trainingMatrix, setTrainingMatrix] = useState<TrainingStatus[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Analytics & Report Builder State
  const [customReports, setCustomReports] = useState<ReportConfig[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);

  // Navigation sections
  const navSections: NavSection[] = [
    { id: "overview", name: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "risk-assessments", name: "Risk Assessments", icon: <Shield className="w-4 h-4" /> },
    { id: "audits", name: "Audits", icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: "incidents", name: "Incidents", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "trainings", name: "Trainings", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "measures", name: "Measures", icon: <CheckCircle className="w-4 h-4" /> },
    { id: "tasks", name: "Tasks", icon: <ListChecks className="w-4 h-4" /> },
    { id: "checkups", name: "Check-ups", icon: <Stethoscope className="w-4 h-4" /> },
  ];

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchReportData();
      fetchChartData();
      loadCustomReports();
    }
  }, [companyId]);

  // Load custom reports from localStorage
  const loadCustomReports = () => {
    try {
      const saved = localStorage.getItem('hse_custom_reports');
      if (saved) {
        setCustomReports(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading custom reports:', error);
    }
  };

  // Save custom reports to localStorage
  const saveCustomReports = (reports: ReportConfig[]) => {
    try {
      localStorage.setItem('hse_custom_reports', JSON.stringify(reports));
      setCustomReports(reports);
    } catch (error) {
      console.error('Error saving custom reports:', error);
    }
  };

  const fetchReportData = async () => {
    if (!companyId) return;

    try {
      const [
        employeesRes,
        risksRes,
        auditsRes,
        tasksRes,
        incidentsRes,
        measuresRes,
        trainingsRes,
        checkUpsRes,
        completedAuditsRes,
        completedTasksRes,
        completedMeasuresRes,
        openIncidentsRes,
        trainingRes,
      ] = await Promise.all([
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("risk_assessments")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("employee_checkups")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("audits")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("measures" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("incidents" as any)
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("investigation_status", "open"),
        supabase
          .from("training_records")
          .select("*")
          .eq("company_id", companyId),
      ]);

      const totalTraining = trainingRes.data?.length || 0;
      const completedTraining =
        trainingRes.data?.filter((t) => t.status === "completed").length || 0;
      const trainingComplianceRate =
        totalTraining > 0
          ? Math.round((completedTraining / totalTraining) * 100)
          : 0;

      setStats({
        totalEmployees: employeesRes.count || 0,
        totalRiskAssessments: risksRes.count || 0,
        totalAudits: auditsRes.count || 0,
        totalTasks: tasksRes.count || 0,
        totalIncidents: incidentsRes.count || 0,
        totalMeasures: measuresRes.count || 0,
        totalTrainings: trainingsRes.count || 0,
        totalCheckUps: checkUpsRes.count || 0,
        completedAudits: completedAuditsRes.count || 0,
        completedTasks: completedTasksRes.count || 0,
        completedMeasures: completedMeasuresRes.count || 0,
        openIncidents: openIncidentsRes.count || 0,
        trainingCompliance: trainingComplianceRate,
      });

      await fetchTrainingMatrix();
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report data",
        variant: "destructive",
      });
    }
  };

  const fetchTrainingMatrix = async () => {
    if (!companyId) return;

    try {
      const { data: employees, error: empError } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (empError) throw empError;

      const matrix: TrainingStatus[] = [];

      for (const emp of employees || []) {
        const { data: trainings, error: trainError } = await supabase
          .from("training_records")
          .select("*")
          .eq("employee_id", emp.id);

        if (trainError) throw trainError;

        const total = trainings?.length || 0;
        const completed =
          trainings?.filter((t) => t.status === "completed").length || 0;
        const expired =
          trainings?.filter((t) => t.status === "expired").length || 0;
        const compliance =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        matrix.push({
          employee_name: emp.full_name,
          total_required: total,
          completed,
          expired,
          compliance_rate: compliance,
        });
      }

      setTrainingMatrix(matrix);
    } catch (error: any) {
      console.error("Error fetching training matrix:", error);
    }
  };

  const fetchChartData = () => {
    // Mock data for demonstration - replace with actual data fetching
    const mockData = [
      { month: "Jan", incidents: 4, trainings: 12, tasks: 25 },
      { month: "Feb", incidents: 7, trainings: 15, tasks: 28 },
      { month: "Mar", incidents: 3, trainings: 18, tasks: 32 },
      { month: "Apr", incidents: 5, trainings: 14, tasks: 27 },
      { month: "May", incidents: 6, trainings: 20, tasks: 35 },
      { month: "Jun", incidents: 2, trainings: 22, tasks: 38 },
    ];
    setChartData(mockData);
  };

  const exportReport = () => {
    toast({
      title: "Coming Soon",
      description: "PDF export functionality will be available soon",
    });
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    toast({
      title: "Date Range Updated",
      description: `Showing data for ${range.replace("-", " ")}`,
    });
  };

  const calculateDateRange = (range: any) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (range?.type) {
      case "last_7_days":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "last_30_days":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "last_90_days":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "last_year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "all_time":
        startDate.setFullYear(endDate.getFullYear() - 10); // 10 years back
        break;
      default:
        // Default to all time to ensure data is captured
        startDate.setFullYear(endDate.getFullYear() - 10);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const fetchTemplateData = async (template: Partial<ReportConfig>) => {
    if (!companyId) return [];

    const { metric, groupBy, dateRange } = template;
    const { startDate, endDate } = calculateDateRange(dateRange);

    try {
      // Special handling for employees with department/location joins
      if (metric === "employees") {
        if (groupBy === "department") {
          const { data, error } = await supabase
            .from("employees")
            .select("department_id, departments(name)")
            .eq("company_id", companyId);

          if (error) {
            console.error("Error fetching employee data:", error);
            return [];
          }

          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const deptName = item.departments?.name || "Unassigned";
            acc[deptName] = (acc[deptName] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        } else if (groupBy === "location") {
          // Location doesn't exist on employees table, use department as fallback
          const { data, error } = await supabase
            .from("employees")
            .select("department_id, departments(name)")
            .eq("company_id", companyId);

          if (error) {
            console.error("Error fetching employee location data:", error);
            return [];
          }

          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const deptName = item.departments?.name || "Unassigned";
            acc[deptName] = (acc[deptName] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        } else if (groupBy === "created_at") {
          const { data, error } = await supabase
            .from("employees")
            .select("created_at")
            .eq("company_id", companyId)
            .gte("created_at", startDate)
            .lte("created_at", endDate);

          if (error) {
            console.error("Error fetching employee time data:", error);
            return [];
          }

          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            if (!item.created_at) return acc;
            const date = new Date(item.created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            acc[monthKey] = (acc[monthKey] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, value]) => ({ name, value }));
        }
      }

      // Special handling for Risks
      if (metric === "risks") {
        if (groupBy === "department") {
          const { data, error } = await supabase
            .from("risk_assessments")
            .select("department_id, departments(name)")
            .eq("company_id", companyId);

          if (error) {
            console.error("Error fetching risks by department:", error);
            return [];
          }
          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const name = item.departments?.name || "Unassigned";
            acc[name] = (acc[name] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        } else {
          // risk_level or approval_status
          const column = groupBy || "risk_level";
          const { data, error } = await supabase
            .from("risk_assessments")
            .select(column)
            .eq("company_id", companyId);

          if (error) {
            console.error("Error fetching risks:", error);
            return [];
          }
          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const key = item[column] || "Unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        }
      }

      // Special handling for Measures
      if (metric === "measures") {
        if (groupBy === "department") {
          // Measures might not have direct department, join via responsible person -> department
          // Note: using 'employees!responsible_person_id' valid if FK exists, else try 'employees'
          const { data, error } = await supabase
            .from("measures" as any)
            .select(`
              responsible_person_id,
              responsible_person:employees!responsible_person_id(
                departments(name)
              )
            `)
            .eq("company_id", companyId);

          if (error) {
            console.error("Error fetching measures department:", error);
            return [];
          }

          const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
            // item.responsible_person is the joined employee object
            // item.responsible_person.departments is the joined department object
            const dept = item.responsible_person?.departments?.name || "Unassigned";
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
          }, {});

          return Object.entries(grouped).map(([name, value]) => ({ name, value }));
        }
      }

      // Standard handling for other metrics
      let table: string;
      let groupColumn: string;

      switch (metric) {
        case "incidents":
          if (groupBy === "location") {
            // Use location from incidents table directly
            const { data, error } = await supabase
              .from("incidents")
              .select("location")
              .eq("company_id", companyId);

            if (error) return [];
            const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
              const key = item.location || "Unknown";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});
            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
          }
          // Fallthrough for other incident groupings
          const incidentGroupCol = groupBy === "category" ? "incident_type" : (groupBy || "investigation_status");
          const { data, error } = await supabase
            .from("incidents")
            .select(incidentGroupCol)
            .eq("company_id", companyId);

          if (error) return [];
          const groupedIncidents = (data || []).reduce((acc: Record<string, number>, item: any) => {
            const key = item[incidentGroupCol] || "Unknown";
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          return Object.entries(groupedIncidents).map(([name, value]) => ({ name, value }));

        case "audits":
          table = "audits";
          if (groupBy === "category") {
            groupColumn = "audit_type";
          } else {
            groupColumn = groupBy || "status";
          }
          break;
        case "trainings":
          // Courses are catalog items
          {
            const { data, error } = await supabase
              .from("courses")
              .select("id, name")
              .eq("company_id", companyId);

            if (error) {
              console.error("Error fetching courses data:", error);
              return [];
            }
            return (data || []).map(course => ({
              name: course.name,
              value: 1, // Just listing them? Or should we count completions? 
              // The original list logic seemed to just return 1 per course. 
              // But 'Training Compliance' report suggests we want compliance stats.
              // Let's keep original simple behavior for now or it gets too complex.
            }));
          }
          break;
        case "measures":
          table = "measures";
          groupColumn = groupBy || "status";
          break;
        case "checkups":
          {
            const { data, error } = await supabase
              .from("employee_checkups") // Changed from health_checkups to employee_checkups as per fetchReportData usage (line 241)
              .select("status")
              .eq("company_id", companyId);

            if (error) {
              console.error("Error fetching health checkups data:", error);
              return [];
            }

            const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
              const key = item.status || "Unknown";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});

            return Object.entries(grouped).map(([name, value]) => ({ name, value }));
          }
          break;
        default:
          return [];
      }

      // Handle time-based grouping for other metrics (audits, measures, etc)
      if (groupBy === "created_at") {
        const { data, error } = await supabase
          .from(table as any)
          .select("created_at")
          .eq("company_id", companyId)
          .gte("created_at", startDate)
          .lte("created_at", endDate);

        if (error) {
          console.error("Error fetching time data:", error);
          return [];
        }

        const grouped = (data || []).reduce((acc: Record<string, number>, item: any) => {
          if (!item.created_at) return acc;
          const date = new Date(item.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          acc[monthKey] = (acc[monthKey] || 0) + 1;
          return acc;
        }, {});

        return Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => ({ name, value }));
      }

      const { data: stdData, error: stdError } = await supabase
        .from(table as any)
        .select(groupColumn)
        .eq("company_id", companyId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (stdError) {
        console.error("Error fetching template data:", stdError);
        return [];
      }

      const groupedStd = (stdData || []).reduce((acc: Record<string, number>, item: any) => {
        const key = item[groupColumn] || "Unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(groupedStd).map(([name, value]) => ({
        name,
        value,
      }));
    } catch (error) {
      console.error("Error in fetchTemplateData:", error);
      return [];
    }
  };

  const handleAddFilter = () => {
    setShowFilterDialog(true);
    toast({
      title: "Add Filter",
      description: "Filter functionality coming soon",
    });
  };

  const handleAddReport = () => {
    setIsLibraryOpen(true);
  };

  const handleSelectTemplate = async (template: Partial<ReportConfig>) => {
    try {
      // Fetch real data for the template
      const data = await fetchTemplateData(template);

      setSelectedReport({
        ...template,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        data, // Include actual fetched data
      } as ReportConfig);
      setIsLibraryOpen(false);
      setIsBuilderOpen(true);
    } catch (error) {
      console.error("Error selecting template:", error);
      toast({
        title: "Error",
        description: "Failed to load template data",
        variant: "destructive",
      });
    }
  };

  const handleSaveReport = (config: ReportConfig) => {
    const existingIndex = customReports.findIndex(r => r.id === config.id);
    let updatedReports;

    if (existingIndex >= 0) {
      // Update existing
      updatedReports = [...customReports];
      updatedReports[existingIndex] = config;
      toast({
        title: "Report Updated",
        description: `"${config.title}" has been updated`,
      });
    } else {
      // Add new
      updatedReports = [...customReports, config];
      toast({
        title: "Report Created",
        description: `"${config.title}" has been added to your dashboard`,
      });
    }

    setCustomReports(updatedReports); // Update state FIRST for immediate UI refresh
    saveCustomReports(updatedReports); // Then save to localStorage
    setIsBuilderOpen(false);
    setSelectedReport(null);
  };

  const handleEditReport = (config: ReportConfig) => {
    setSelectedReport(config);
    setIsBuilderOpen(true);
  };

  const handleDuplicateReport = (config: ReportConfig) => {
    const duplicate = {
      ...config,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: `${config.title} (Copy)`,
    };
    const updatedReports = [...customReports, duplicate];
    setCustomReports(updatedReports); // Update state for immediate UI refresh
    saveCustomReports(updatedReports);
    toast({
      title: "Report Duplicated",
      description: `Created a copy of "${config.title}"`,
    });
  };

  const handleDeleteReport = (id: string) => {
    const report = customReports.find(r => r.id === id);
    const updatedReports = customReports.filter(r => r.id !== id);
    saveCustomReports(updatedReports);
    toast({
      title: "Report Deleted",
      description: `"${report?.title}" has been removed`,
    });
  };

  const handleExportReport = (config: ReportConfig) => {
    toast({
      title: "Exporting Report",
      description: `Exporting "${config.title}"...`,
    });
  };

  const handleVisibilityChange = (value: string) => {
    setVisibility(value);
    const visibilityText = value === "only-me" ? "only to you" : value === "team" ? "to your team" : "to the company";
    toast({
      title: "Visibility Updated",
      description: `Report is now visible ${visibilityText}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sub-Navigation */}
      <aside className="w-56 border-r bg-card flex-shrink-0">
        <div className="p-4 space-y-1">
          {navSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === section.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              {section.icon}
              <span>{section.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {/* Professional Header */}
        <header className="sticky top-0 z-10 bg-card border-b px-8 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-1 min-w-[300px]">
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full max-w-lg font-semibold text-lg px-2"
                placeholder="Report Name"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-40">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  <SelectItem value="last-30-days">Last 30 days</SelectItem>
                  <SelectItem value="last-90-days">Last 90 days</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="last-month">Last month</SelectItem>
                  <SelectItem value="this-year">This year</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleAddFilter}>
                <Filter className="w-4 h-4 mr-2" />
                Add filter
              </Button>

              <Select value={visibility} onValueChange={handleVisibilityChange}>
                <SelectTrigger className="w-48">
                  <Eye className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="only-me">Visible only to me</SelectItem>
                  <SelectItem value="team">Visible to team</SelectItem>
                  <SelectItem value="company">Visible to company</SelectItem>
                </SelectContent>
              </Select>

              <Button className="bg-purple-600 hover:bg-purple-700" size="sm" onClick={handleAddReport}>
                <Plus className="w-4 h-4 mr-2" />
                Add report
              </Button>

              <Button variant="outline" size="sm" onClick={exportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </header>

        {/* Content Sections */}
        <div className="p-8">
          {activeSection === "overview" && (
            <OverviewSection
              stats={stats}
              chartData={chartData}
              customReports={customReports}
              onEditReport={handleEditReport}
              onDuplicateReport={handleDuplicateReport}
              onDeleteReport={handleDeleteReport}
              onExportReport={handleExportReport}
              onViewReport={(report) => {
                setSelectedReport(report);
                setIsBuilderOpen(true);
              }}
            />
          )}
          {activeSection === "risk-assessments" && (
            <RiskAssessmentsSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "audits" && (
            <AuditsSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "incidents" && (
            <IncidentsSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "trainings" && (
            <TrainingsSection stats={stats} trainingMatrix={trainingMatrix} chartData={chartData} />
          )}
          {activeSection === "measures" && (
            <MeasuresSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "tasks" && (
            <TasksSection stats={stats} chartData={chartData} />
          )}
          {activeSection === "checkups" && (
            <CheckupsSection stats={stats} />
          )}
        </div>
      </main>

      {/* Report Builder & Library Dialogs */}
      <ReportBuilder
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setSelectedReport(null);
        }}
        onSave={handleSaveReport}
        initialConfig={selectedReport}
        data={selectedReport?.data || []}
        onRefreshData={async (config) => {
          // Re-fetch data based on new config
          return await fetchTemplateData(config);
        }}
      />

      <ReportLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}

// Section Components

// Default layout for the dashboard grid
const defaultLayouts = {
  lg: [
    { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incidents", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-trends", x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3, static: false },
    { i: "audit-completion", x: 0, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
    { i: "task-completion", x: 6, y: 6, w: 6, h: 3, minW: 4, minH: 2, static: false },
  ],
  md: [
    { i: "risk-assessments", x: 0, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "safety-audits", x: 5, y: 0, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "incidents", x: 0, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 5, y: 2, w: 5, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-trends", x: 0, y: 4, w: 10, h: 4, minW: 6, minH: 3, static: false },
    { i: "audit-completion", x: 0, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
    { i: "task-completion", x: 5, y: 8, w: 5, h: 3, minW: 4, minH: 2, static: false },
  ],
  sm: [
    { i: "risk-assessments", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "safety-audits", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incidents", x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-trends", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3, static: false },
    { i: "audit-completion", x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 2, static: false },
    { i: "task-completion", x: 0, y: 11, w: 6, h: 3, minW: 3, minH: 2, static: false },
  ],
};

const LAYOUT_STORAGE_KEY = "hse_dashboard_layout";

// Storage keys for each section
const SECTION_LAYOUT_KEYS = {
  overview: "hse_layout_overview",
  "risk-assessments": "hse_layout_risk_assessments",
  audits: "hse_layout_audits",
  incidents: "hse_layout_incidents",
  trainings: "hse_layout_trainings",
  measures: "hse_layout_measures",
  tasks: "hse_layout_tasks",
  checkups: "hse_layout_checkups",
  customReports: "hse_layout_custom_reports",
};

const CUSTOM_REPORTS_LAYOUT_KEY = "hse_custom_reports_grid_layout_v2";

// Generate default layout for custom reports based on the number of reports
const generateCustomReportsLayout = (reportCount: number) => {
  const layouts: any[] = [];
  for (let i = 0; i < reportCount; i++) {
    layouts.push({
      i: `custom-report-${i}`,
      x: (i % 4) * 3,  // 4 columns for compact layout
      y: Math.floor(i / 4) * 3,  // Reduced row spacing
      w: 3,  // Width: 3 grid units
      h: 3,  // Height: 3 grid units (180px) - very compact
      minW: 2,  // Minimum width
      minH: 2,  // Minimum height
      static: false,
    });
  }
  return layouts;
};

function OverviewSection({
  stats,
  chartData,
  customReports,
  onEditReport,
  onDuplicateReport,
  onDeleteReport,
  onExportReport,
  onViewReport,
}: {
  stats: ReportStats;
  chartData: any[];
  customReports: ReportConfig[];
  onEditReport: (config: ReportConfig) => void;
  onDuplicateReport: (config: ReportConfig) => void;
  onDeleteReport: (id: string) => void;
  onExportReport: (config: ReportConfig) => void;
  onViewReport: (config: ReportConfig) => void;
}) {
  const { toast } = useToast();
  // Load layouts from localStorage or use defaults
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error loading layout:", error);
    }
    return defaultLayouts;
  });

  // Load custom reports layouts from localStorage
  const [customReportsLayouts, setCustomReportsLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_REPORTS_LAYOUT_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error("Error loading custom reports layout:", error);
    }
    const defaultLayout = generateCustomReportsLayout(customReports.length);
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  // Save layouts to localStorage when they change
  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(allLayouts));
    } catch (error) {
      console.error("Error saving layout:", error);
    }
  }, []);

  const handleCustomReportsLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setCustomReportsLayouts(allLayouts);
    try {
      localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(allLayouts));
    } catch (error) {
      console.error("Error saving custom reports layout:", error);
    }
  }, []);

  // Reset layout to defaults
  const resetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    toast({
      title: "Layout Reset",
      description: "Dashboard layout has been reset to default",
    });
  }, [toast]);

  // Sync custom reports layout when reports change (add/remove)
  useEffect(() => {
    setCustomReportsLayouts(currentLayouts => {
      const newLayouts = { ...currentLayouts };
      const breakpoints = ['lg', 'md', 'sm'];
      let hasChanges = false;

      breakpoints.forEach(bp => {
        const bpLayout = [...(newLayouts[bp] || [])];

        // Add specific layout items for new reports
        if (customReports.length > bpLayout.length) {
          hasChanges = true;
          for (let i = bpLayout.length; i < customReports.length; i++) {
            bpLayout.push({
              i: `custom-report-${i}`,
              x: (i % 4) * 3,  // 4 columns, width 3
              y: Math.floor(i / 4) * 3,  // Reduced row spacing
              w: 3,  // Width: 3 grid units
              h: 3,  // Height: 3 grid units - compact
              minW: 2,
              minH: 2,
              static: false,
            });
          }
        }
        // Handle removals
        else if (customReports.length < bpLayout.length) {
          hasChanges = true;
          newLayouts[bp] = bpLayout.slice(0, customReports.length);
          return;
        }

        newLayouts[bp] = bpLayout;
      });

      if (!hasChanges) return currentLayouts;

      // Save new state
      try {
        localStorage.setItem(CUSTOM_REPORTS_LAYOUT_KEY, JSON.stringify(newLayouts));
      } catch (e) {
        console.error("Error saving updated custom layout:", e);
      }

      return newLayouts;
    });
  }, [customReports.length]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Overview</h2>
          <p className="text-muted-foreground">Key metrics and statistics at a glance. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      {/* Resizable/Draggable Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        {/* Risk Assessments Card */}
        <div key="risk-assessments">
          <DraggableCard
            title="Risk Assessments"
            subtitle="Total GBU"
            value={stats.totalRiskAssessments}
            icon={<Shield className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>

        {/* Safety Audits Card */}
        <div key="safety-audits">
          <DraggableCard
            title="Safety Audits"
            subtitle={`${stats.completedAudits} completed`}
            value={stats.totalAudits}
            icon={<ClipboardCheck className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
        </div>

        {/* Incidents Card */}
        <div key="incidents">
          <DraggableCard
            title="Incidents"
            subtitle={`${stats.openIncidents} open cases`}
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
          />
        </div>

        {/* Training Compliance Card */}
        <div key="training-compliance">
          <DraggableCard
            title="Training Compliance"
            subtitle="Overall rate"
            value={`${stats.trainingCompliance}%`}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>

        {/* Incident Trends Chart */}
        <div key="incident-trends">
          <Card className="dashboard-grid-card border shadow-sm h-full">
            <div className="drag-handle border-b">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-4 pb-3">
              <CardTitle className="text-lg">Incident Trends</CardTitle>
              <CardDescription>Monthly incident reports over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncidents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncidents)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Audit Completion Card */}
        <div key="audit-completion">
          <Card className="dashboard-grid-card border shadow-sm h-full overflow-hidden">
            <div className="drag-handle border-b">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-2 pb-1 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                Audit Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pb-3 pt-1 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">{stats.totalAudits}</div>
                  <div className="text-[9px] text-blue-600/70">Total</div>
                </div>
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-green-50">
                  <div className="text-lg font-bold text-green-600">{stats.completedAudits}</div>
                  <div className="text-[9px] text-green-600/70">Done</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">
                    {stats.totalAudits > 0 ? Math.round((stats.completedAudits / stats.totalAudits) * 100) : 0}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Completion Card */}
        <div key="task-completion">
          <Card className="dashboard-grid-card border shadow-sm h-full overflow-hidden">
            <div className="drag-handle border-b">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
            <CardHeader className="py-2 pb-1 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-blue-600" />
                Task Completion
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pb-3 pt-1 px-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-blue-50">
                  <div className="text-lg font-bold text-blue-600">{stats.totalTasks}</div>
                  <div className="text-[9px] text-blue-600/70">Total</div>
                </div>
                <div className="flex-1 text-center py-1.5 px-2 rounded-md bg-green-50">
                  <div className="text-lg font-bold text-green-600">{stats.completedTasks}</div>
                  <div className="text-[9px] text-green-600/70">Done</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-bold">
                    {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                  </div>
                  <div className="text-[9px] text-muted-foreground">Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>

      {/* Custom Reports - Resizable Grid */}
      {customReports && customReports.length > 0 && (
        <div className="mt-12">
          <h3 className="text-lg font-semibold mb-4">Custom Reports</h3>
          <ResponsiveGridLayout
            className="layout"
            layouts={{
              lg: customReports.map((_, i) => ({
                i: `custom-report-${i}`,
                x: (i % 4) * 3,
                y: Math.floor(i / 4) * 4,
                w: 3,
                h: 4,
                minW: 2,
                minH: 3,
              })),
              md: customReports.map((_, i) => ({
                i: `custom-report-${i}`,
                x: (i % 3) * 4,
                y: Math.floor(i / 3) * 4,
                w: 4,
                h: 4,
                minW: 3,
                minH: 3,
              })),
              sm: customReports.map((_, i) => ({
                i: `custom-report-${i}`,
                x: 0,
                y: i * 4,
                w: 6,
                h: 4,
                minW: 4,
                minH: 3,
              })),
            }}
            breakpoints={{ lg: 1200, md: 996, sm: 768 }}
            cols={{ lg: 12, md: 12, sm: 6 }}
            rowHeight={70}
            draggableHandle=".drag-handle"
            isResizable={true}
            isDraggable={true}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            compactType="vertical"
          >
            {customReports.map((report, index) => (
              <div
                key={`custom-report-${index}`}
                className="h-full"
              >
                <div
                  className="h-full cursor-pointer"
                  onClick={(e) => {
                    if ((e.target as Element).closest('button, .drag-handle')) return;
                    onViewReport(report);
                  }}
                >
                  <ReportWidget
                    config={report}
                    onEdit={onEditReport}
                    onDuplicate={onDuplicateReport}
                    onDelete={onDeleteReport}
                    onExport={onExportReport}
                  />
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        </div>
      )}
    </div>
  );
}

// Reusable Draggable Grid Section Wrapper
interface DraggableGridSectionProps {
  sectionId: string;
  title: string;
  description: string;
  defaultLayout: any[];
  handleColor?: string;
  children: (lockStates: { [key: string]: boolean }, toggleLock: (id: string) => void) => React.ReactNode;
}

function DraggableGridSection({
  sectionId,
  title,
  description,
  defaultLayout,
  handleColor = "text-primary",
  children,
}: DraggableGridSectionProps) {
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS]);
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error(`Error loading ${sectionId} layout:`, error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const [lockStates, setLockStates] = useState<{ [key: string]: boolean }>({});

  const handleLayoutChange = useCallback(
    (currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
      setLayouts(allLayouts);
      try {
        localStorage.setItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS], JSON.stringify(allLayouts));
      } catch (error) {
        console.error(`Error saving ${sectionId} layout:`, error);
      }
    },
    [sectionId]
  );

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem(SECTION_LAYOUT_KEYS[sectionId as keyof typeof SECTION_LAYOUT_KEYS]);
    toast({
      title: "Layout Reset",
      description: `${title} layout has been reset to default`,
    });
  }, [defaultLayout, sectionId, title, toast]);

  const toggleLock = useCallback((itemId: string) => {
    setLockStates((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  // Update layout to respect lock states
  const layoutsWithLocks = useMemo(() => {
    const updatedLayouts = { ...layouts };
    Object.keys(updatedLayouts).forEach((breakpoint) => {
      updatedLayouts[breakpoint] = updatedLayouts[breakpoint].map((item: any) => ({
        ...item,
        static: lockStates[item.i] || false,
      }));
    });
    return updatedLayouts;
  }, [layouts, lockStates]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layoutsWithLocks}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        {children(lockStates, toggleLock)}
      </ResponsiveGridLayout>
    </div>
  );
}

// Enhanced Draggable Card with Lock Feature
function EnhancedDraggableCard({
  id,
  title,
  subtitle,
  value,
  icon,
  color,
  handleColor = "text-muted-foreground",
  isLocked = false,
  onToggleLock,
}: {
  id: string;
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  handleColor?: string;
  isLocked?: boolean;
  onToggleLock?: () => void;
}) {
  return (
    <Card className="dashboard-grid-card border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
      <div className="drag-handle border-b flex items-center justify-between px-3">
        <GripVertical className={`w-4 h-4 ${handleColor} ${isLocked ? 'opacity-30' : ''}`} />
        {onToggleLock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            className="p-1 hover:bg-muted rounded transition-colors"
            title={isLocked ? "Unlock card" : "Lock card"}
          >
            {isLocked ? (
              <Lock className="w-3 h-3 text-orange-500" />
            ) : (
              <Unlock className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
            )}
          </button>
        )}
      </div>
      <CardContent className="p-6 flex-1 flex flex-col justify-center group">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// Draggable KPI Card Component
function DraggableCard({
  title,
  subtitle,
  value,
  icon,
  color,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="dashboard-grid-card border hover:border-primary/50 transition-colors shadow-sm h-full">
      <div className="drag-handle border-b cursor-grab active:cursor-grabbing flex-shrink-0">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-3 overflow-hidden">
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0 mb-2`}>
          {icon}
        </div>
        <h3 className="font-medium text-foreground text-sm leading-tight">{title}</h3>
        <p className="text-muted-foreground text-xs mb-1">{subtitle}</p>
        <p className="font-bold text-foreground text-xl">{value}</p>
      </CardContent>
    </Card>
  );
}

// KPI Card Component (non-draggable version for sections)
function KPICard({
  title,
  subtitle,
  value,
  icon,
  color,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="border hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

// Sections with draggable card layouts
function RiskAssessmentsSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "risk-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_risk_assessments');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading risk assessments layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_risk_assessments', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving risk assessments layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_risk_assessments');
    toast({ title: "Layout Reset", description: "Risk Assessments layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Risk Assessments</h2>
          <p className="text-muted-foreground">GBU and hazard analysis. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="risk-total">
          <DraggableCard
            title="Total GBU"
            subtitle="Risk assessments"
            value={stats.totalRiskAssessments}
            icon={<Shield className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function AuditsSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "audit-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "audit-completed", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_audits');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading audits layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_audits', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving audits layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_audits');
    toast({ title: "Layout Reset", description: "Audits layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Safety Audits</h2>
          <p className="text-muted-foreground">Audit completion and compliance. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="audit-total">
          <DraggableCard
            title="Total Audits"
            subtitle="All audits"
            value={stats.totalAudits}
            icon={<ClipboardCheck className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
        </div>
        <div key="audit-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished audits"
            value={stats.completedAudits}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function IncidentsSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "incident-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-open", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "incident-closed", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_incidents');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading incidents layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_incidents', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving incidents layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_incidents');
    toast({ title: "Layout Reset", description: "Incidents layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Incidents</h2>
          <p className="text-muted-foreground">Workplace incident tracking. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="incident-total">
          <DraggableCard
            title="Total Incidents"
            subtitle="All incidents"
            value={stats.totalIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-red-50 text-red-600"
          />
        </div>
        <div key="incident-open">
          <DraggableCard
            title="Open Cases"
            subtitle="Under investigation"
            value={stats.openIncidents}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
        <div key="incident-closed">
          <DraggableCard
            title="Closed"
            subtitle="Resolved incidents"
            value={stats.totalIncidents - stats.openIncidents}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function TrainingsSection({
  stats,
  trainingMatrix,
  chartData,
}: {
  stats: ReportStats;
  trainingMatrix: TrainingStatus[];
  chartData: any[];
}) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "training-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "training-compliance", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_trainings');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading trainings layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_trainings', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving trainings layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_trainings');
    toast({ title: "Layout Reset", description: "Trainings layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Trainings</h2>
          <p className="text-muted-foreground">Employee training compliance. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="training-total">
          <DraggableCard
            title="Total Courses"
            subtitle="Training programs"
            value={stats.totalTrainings}
            icon={<GraduationCap className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="training-compliance">
          <DraggableCard
            title="Compliance Rate"
            subtitle="Overall compliance"
            value={`${stats.trainingCompliance}%`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-blue-50 text-blue-600"
          />
        </div>
      </ResponsiveGridLayout>

      {/* Training Matrix */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Employee Training Matrix</CardTitle>
          <CardDescription>Training compliance by employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Employee Name</TableHead>
                  <TableHead className="font-semibold">Required</TableHead>
                  <TableHead className="font-semibold">Completed</TableHead>
                  <TableHead className="font-semibold">Expired</TableHead>
                  <TableHead className="font-semibold">Compliance</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingMatrix.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No training data available
                    </TableCell>
                  </TableRow>
                ) : (
                  trainingMatrix.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{item.employee_name}</TableCell>
                      <TableCell>{item.total_required}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {item.completed}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.expired > 0 ? (
                          <Badge variant="destructive">{item.expired}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{item.compliance_rate}%</TableCell>
                      <TableCell>
                        {item.compliance_rate >= 80 ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Compliant
                          </Badge>
                        ) : item.compliance_rate >= 50 ? (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Non-Compliant</Badge>
                        )}
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

function MeasuresSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "measures-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "measures-completed", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "measures-progress", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_measures');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading measures layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_measures', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving measures layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_measures');
    toast({ title: "Layout Reset", description: "Measures layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Measures</h2>
          <p className="text-muted-foreground">Corrective and preventive actions. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="measures-total">
          <DraggableCard
            title="Total Measures"
            subtitle="All measures"
            value={stats.totalMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-purple-50 text-purple-600"
          />
        </div>
        <div key="measures-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished measures"
            value={stats.completedMeasures}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
        <div key="measures-progress">
          <DraggableCard
            title="In Progress"
            subtitle="Active measures"
            value={stats.totalMeasures - stats.completedMeasures}
            icon={<TrendingUp className="w-5 h-5" />}
            color="bg-orange-50 text-orange-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function TasksSection({ stats, chartData }: { stats: ReportStats; chartData: any[] }) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "tasks-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
    { i: "tasks-completed", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_tasks');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading tasks layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_tasks', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving tasks layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_tasks');
    toast({ title: "Layout Reset", description: "Tasks layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Tasks</h2>
          <p className="text-muted-foreground">Task management and completion. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="tasks-total">
          <DraggableCard
            title="Total Tasks"
            subtitle="All tasks"
            value={stats.totalTasks}
            icon={<ListChecks className="w-5 h-5" />}
            color="bg-indigo-50 text-indigo-600"
          />
        </div>
        <div key="tasks-completed">
          <DraggableCard
            title="Completed"
            subtitle="Finished tasks"
            value={stats.completedTasks}
            icon={<CheckCircle className="w-5 h-5" />}
            color="bg-green-50 text-green-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}

function CheckupsSection({ stats }: { stats: ReportStats }) {
  const { toast } = useToast();
  const defaultLayout = [
    { i: "checkups-total", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2, static: false },
  ];

  const [layouts, setLayouts] = useState<{ [key: string]: any[] }>(() => {
    try {
      const saved = localStorage.getItem('hse_layout_checkups');
      if (saved) return JSON.parse(saved);
    } catch (error) {
      console.error('Error loading checkups layout:', error);
    }
    return { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
  });

  const handleLayoutChange = useCallback((currentLayout: any[], allLayouts: { [key: string]: any[] }) => {
    setLayouts(allLayouts);
    try {
      localStorage.setItem('hse_layout_checkups', JSON.stringify(allLayouts));
    } catch (error) {
      console.error('Error saving checkups layout:', error);
    }
  }, []);

  const resetLayout = useCallback(() => {
    const defaultLayouts = { lg: defaultLayout, md: defaultLayout, sm: defaultLayout };
    setLayouts(defaultLayouts);
    localStorage.removeItem('hse_layout_checkups');
    toast({ title: "Layout Reset", description: "Checkups layout has been reset to default" });
  }, [toast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Health Check-ups</h2>
          <p className="text-muted-foreground">Employee health monitoring. Drag cards to reposition, drag corners to resize.</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetLayout}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Layout
        </Button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={70}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        isResizable={true}
        isDraggable={true}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        compactType="vertical"
      >
        <div key="checkups-total">
          <DraggableCard
            title="Total Check-ups"
            subtitle="Health monitoring"
            value={stats.totalCheckUps}
            icon={<Stethoscope className="w-5 h-5" />}
            color="bg-teal-50 text-teal-600"
          />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
