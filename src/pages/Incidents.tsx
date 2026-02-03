import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  AlertCircle,
  AlertTriangle,
  Activity,
  Edit,
  Trash2,
  Eye,
  Filter,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";

interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string | null;
  incident_type:
  | "injury"
  | "near_miss"
  | "property_damage"
  | "environmental"
  | "other";
  severity: "minor" | "moderate" | "serious" | "critical" | "fatal";
  incident_date: string;
  location: string | null;
  department_id: string | null;
  affected_employee_id: string | null;
  reported_by_id: string | null;
  root_cause: string | null;
  immediate_actions: string | null;
  investigation_status: string;
  created_at: string;
  affected_employee?: { full_name: string };
  reported_by?: { full_name: string };
  department?: { name: string };
}

interface Employee {
  id: string;
  full_name: string;
}

interface Department {
  id: string;
  name: string;
}

export default function Incidents() {
  const { user, companyId, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    incident_type: "near_miss" as
      | "injury"
      | "near_miss"
      | "property_damage"
      | "environmental"
      | "other",
    severity: "minor" as
      | "minor"
      | "moderate"
      | "serious"
      | "critical"
      | "fatal",
    incident_date: "",
    location: "",
    department_id: "",
    affected_employee_id: "",
    reported_by_id: "",
    root_cause: "",
    immediate_actions: "",
    investigation_status: "open",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (companyId) {
      fetchIncidents();
      fetchEmployees();
      fetchDepartments();
    }
  }, [companyId]);

  const fetchIncidents = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("incidents" as any)
        .select(
          `
          *,
          affected_employee:employees!affected_employee_id(full_name),
          reported_by:employees!reported_by_id(full_name),
          department:departments(name)
        `
        )
        .eq("company_id", companyId)
        .order("incident_date", { ascending: false });

      if (error) throw error;
      setIncidents((data as any) || []);
    } catch (error: any) {
      console.error("Error fetching incidents:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch incidents",
        variant: "destructive",
      });
    }
  };

  const fetchEmployees = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchDepartments = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      const incidentData = {
        company_id: companyId,
        title: formData.title,
        description: formData.description || null,
        incident_type: formData.incident_type,
        severity: formData.severity,
        incident_date: formData.incident_date
          ? new Date(formData.incident_date).toISOString()
          : new Date().toISOString(),
        location: formData.location || null,
        department_id:
          formData.department_id === "none"
            ? null
            : formData.department_id || null,
        affected_employee_id:
          formData.affected_employee_id === "none"
            ? null
            : formData.affected_employee_id || null,
        reported_by_id:
          formData.reported_by_id === "none"
            ? null
            : formData.reported_by_id || null,
        root_cause: formData.root_cause || null,
        immediate_actions: formData.immediate_actions || null,
        investigation_status: formData.investigation_status,
      };

      if (editingIncident) {
        const { error } = await (supabase as any)
          .from("incidents")
          .update(incidentData)
          .eq("id", editingIncident.id);

        if (error) throw error;

        logAction({
          action: "update_incident",
          targetType: "incident",
          targetId: editingIncident.id,
          targetName: formData.title,
          details: {
            severity: formData.severity,
            type: formData.incident_type,
            status: formData.investigation_status
          }
        });

        toast({
          title: "Success",
          description: "Incident updated successfully",
        });
      } else {
        const { data: newIncident, error } = await supabase
          .from("incidents" as any)
          .insert(incidentData as any)
          .select()
          .single();

        if (error) throw error;

        logAction({
          action: "create_incident",
          targetType: "incident",
          targetId: newIncident?.id,
          targetName: formData.title,
          details: {
            severity: formData.severity,
            type: formData.incident_type
          }
        });

        toast({
          title: "Success",
          description: "Incident reported successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchIncidents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save incident",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this incident?")) return;

    try {
      const { error } = await supabase
        .from("incidents" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;

      logAction({
        action: "delete_incident",
        targetType: "incident",
        targetId: id,
        targetName: "Incident",
        details: { id }
      });

      toast({ title: "Success", description: "Incident deleted successfully" });
      fetchIncidents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete incident",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setFormData({
      title: incident.title,
      description: incident.description || "",
      incident_type: incident.incident_type,
      severity: incident.severity,
      incident_date: incident.incident_date
        ? incident.incident_date.split("T")[0]
        : "",
      location: incident.location || "",
      department_id: incident.department_id || "none",
      affected_employee_id: incident.affected_employee_id || "none",
      reported_by_id: incident.reported_by_id || "none",
      root_cause: incident.root_cause || "",
      immediate_actions: incident.immediate_actions || "",
      investigation_status: incident.investigation_status,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      incident_type: "near_miss",
      severity: "minor",
      incident_date: "",
      location: "",
      department_id: "none",
      affected_employee_id: "none",
      reported_by_id: "none",
      root_cause: "",
      immediate_actions: "",
      investigation_status: "open",
    });
    setEditingIncident(null);
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { className: string; icon: any }> = {
      minor: { className: "bg-blue-100 text-blue-800", icon: AlertCircle },
      moderate: {
        className: "bg-yellow-100 text-yellow-800",
        icon: AlertCircle,
      },
      serious: {
        className: "bg-orange-100 text-orange-800",
        icon: AlertTriangle,
      },
      critical: { className: "bg-red-100 text-red-800", icon: AlertTriangle },
      fatal: { className: "bg-red-600 text-white", icon: AlertTriangle },
    };
    const { className, icon: Icon } = config[severity] || config.minor;
    return (
      <Badge className={className}>
        <Icon className="w-3 h-3 mr-1" />
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      injury: "bg-red-100 text-red-800",
      near_miss: "bg-yellow-100 text-yellow-800",
      property_damage: "bg-purple-100 text-purple-800",
      environmental: "bg-green-100 text-green-800",
      other: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={colors[type] || colors.other}>
        {type.replace("_", " ").charAt(0).toUpperCase() +
          type.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || incident.incident_type === filterType;
    const matchesSeverity =
      filterSeverity === "all" || incident.severity === filterSeverity;
    return matchesSearch && matchesType && matchesSeverity;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">{t("incidents.title")}</h2>
              <p className="text-muted-foreground">
                {t("incidents.description")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.total")}
                </p>
                <p className="text-4xl font-bold mt-2">{incidents.length}</p>
              </div>
              <Activity className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.injuries")}
                </p>
                <p className="text-4xl font-bold mt-2">
                  {incidents.filter((i) => i.incident_type === "injury").length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.nearMisses")}
                </p>
                <p className="text-4xl font-bold mt-2">
                  {
                    incidents.filter((i) => i.incident_type === "near_miss")
                      .length
                  }
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 via-green-600 to-emerald-700 text-white overflow-hidden relative group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-300"></div>
          <CardContent className="pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80 font-medium uppercase tracking-wide">
                  {t("incidents.underInvestigation")}
                </p>
                <p className="text-4xl font-bold mt-2">
                  {
                    incidents.filter((i) => i.investigation_status === "open")
                      .length
                  }
                </p>
              </div>
              <Eye className="w-10 h-10 text-white/80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {t("incidents.reports")}
                </CardTitle>
                <CardDescription>{t("incidents.reportsDesc")}</CardDescription>
              </div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("incidents.reportIncident")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingIncident
                      ? t("incidents.editIncident")
                      : t("incidents.reportNew")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("incidents.documentDesc")}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">
                      {t("incidents.incidentTitle")} *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder={t("incidents.titlePlaceholder")}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="type">{t("incidents.type")} *</Label>
                      <Select
                        value={formData.incident_type}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, incident_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="injury">
                            {t("incidents.injury")}
                          </SelectItem>
                          <SelectItem value="near_miss">
                            {t("incidents.nearMiss")}
                          </SelectItem>
                          <SelectItem value="property_damage">
                            {t("incidents.propertyDamage")}
                          </SelectItem>
                          <SelectItem value="environmental">
                            {t("incidents.environmental")}
                          </SelectItem>
                          <SelectItem value="other">
                            {t("incidents.other")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="severity">
                        {t("incidents.severity")} *
                      </Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, severity: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minor">
                            {t("incidents.minor")}
                          </SelectItem>
                          <SelectItem value="moderate">
                            {t("incidents.moderate")}
                          </SelectItem>
                          <SelectItem value="serious">
                            {t("incidents.serious")}
                          </SelectItem>
                          <SelectItem value="critical">
                            {t("incidents.critical")}
                          </SelectItem>
                          <SelectItem value="fatal">
                            {t("incidents.fatal")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="incident_date">
                        {t("incidents.date")} *
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!formData.incident_date && "text-muted-foreground"}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.incident_date ? (
                              format(new Date(formData.incident_date), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={formData.incident_date ? new Date(formData.incident_date) : undefined}
                            onSelect={(date) =>
                              setFormData({
                                ...formData,
                                incident_date: date ? format(date, "yyyy-MM-dd") : "",
                              })
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">
                      {t("incidents.description")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      placeholder={t("incidents.descriptionPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">
                        {t("incidents.location")}
                      </Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                        placeholder={t("incidents.locationPlaceholder")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="department">
                        {t("incidents.department")}
                      </Label>
                      <Select
                        value={formData.department_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, department_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("incidents.selectDepartment")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="affected">
                        {t("incidents.affectedEmployee")}
                      </Label>
                      <Select
                        value={formData.affected_employee_id}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            affected_employee_id: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("incidents.selectEmployee")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            {t("common.none")}
                          </SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reported_by">
                        {t("incidents.reportedBy")}
                      </Label>
                      <Select
                        value={formData.reported_by_id}
                        onValueChange={(value) =>
                          setFormData({ ...formData, reported_by_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t("incidents.selectEmployee")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="immediate_actions">
                      {t("incidents.immediateActions")}
                    </Label>
                    <Textarea
                      id="immediate_actions"
                      value={formData.immediate_actions}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          immediate_actions: e.target.value,
                        })
                      }
                      placeholder={t("incidents.immediateActionsPlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="root_cause">
                      {t("incidents.rootCause")}
                    </Label>
                    <Textarea
                      id="root_cause"
                      value={formData.root_cause}
                      onChange={(e) =>
                        setFormData({ ...formData, root_cause: e.target.value })
                      }
                      placeholder={t("incidents.rootCausePlaceholder")}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="investigation_status">
                      {t("incidents.investigationStatus")}
                    </Label>
                    <Select
                      value={formData.investigation_status}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          investigation_status: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">
                          {t("incidents.open")}
                        </SelectItem>
                        <SelectItem value="in_progress">
                          {t("incidents.inProgress")}
                        </SelectItem>
                        <SelectItem value="closed">
                          {t("incidents.closed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit">
                      {editingIncident
                        ? t("common.update")
                        : t("incidents.report")}{" "}
                      {t("incidents.incident")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Search & Filters</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder={t("incidents.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 focus:border-primary transition-colors"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("incidents.filterByType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("incidents.allTypes")}</SelectItem>
                  <SelectItem value="injury">
                    {t("incidents.injury")}
                  </SelectItem>
                  <SelectItem value="near_miss">
                    {t("incidents.nearMiss")}
                  </SelectItem>
                  <SelectItem value="property_damage">
                    {t("incidents.propertyDamage")}
                  </SelectItem>
                  <SelectItem value="environmental">
                    {t("incidents.environmental")}
                  </SelectItem>
                  <SelectItem value="other">{t("incidents.other")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("incidents.filterBySeverity")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("incidents.allSeverities")}
                  </SelectItem>
                  <SelectItem value="minor">{t("incidents.minor")}</SelectItem>
                  <SelectItem value="moderate">
                    {t("incidents.moderate")}
                  </SelectItem>
                  <SelectItem value="serious">
                    {t("incidents.serious")}
                  </SelectItem>
                  <SelectItem value="critical">
                    {t("incidents.critical")}
                  </SelectItem>
                  <SelectItem value="fatal">{t("incidents.fatal")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <AlertTriangle className="w-16 h-16 text-muted-foreground/20 mb-4" />
                        <p className="text-lg font-medium text-muted-foreground mb-1">
                          No incidents found
                        </p>
                        <p className="text-sm text-muted-foreground/60">
                          Report an incident to get started
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredIncidents.map((incident) => (
                    <TableRow
                      key={incident.id}
                      className="hover:bg-muted/70 transition-all duration-200 border-b border-border/50 hover:shadow-sm group"
                    >

                      <TableCell>
                        <div>
                          <div className="font-medium">{incident.title}</div>
                          {incident.affected_employee && (
                            <div className="text-sm text-muted-foreground">
                              {t("incidents.affected")}:{" "}
                              {incident.affected_employee.full_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(incident.incident_type)}
                      </TableCell>
                      <TableCell>
                        {getSeverityBadge(incident.severity)}
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(incident.incident_date),
                          "MMM dd, yyyy"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            incident.investigation_status === "closed"
                              ? "outline"
                              : "default"
                          }
                        >
                          {incident.investigation_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(incident)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(incident.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
