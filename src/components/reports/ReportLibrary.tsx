import { Grid3x3, Users, AlertTriangle, ClipboardCheck, GraduationCap, Shield, Activity, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReportConfig } from "./ReportBuilder";

interface ReportLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (config: Partial<ReportConfig>) => void;
}

const REPORT_TEMPLATES = [
  {
    category: "Employees",
    icon: <Users className="w-5 h-5" />,
    reports: [
      {
        title: "Employees by Department",
        metric: "employees",
        groupBy: "department",
        chartType: "bar" as const,
        description: "View employee distribution across departments",
      },
      {
        title: "Employees by Location",
        metric: "employees",
        groupBy: "location",
        chartType: "pie" as const,
        description: "See where your workforce is located",
      },

    ],
  },
  {
    category: "Incidents",
    icon: <AlertTriangle className="w-5 h-5" />,
    reports: [
      {
        title: "Incidents by Status",
        metric: "incidents",
        groupBy: "investigation_status",
        chartType: "pie" as const,
        description: "Overview of incident statuses",
      },
      {
        title: "Incidents by Category",
        metric: "incidents",
        groupBy: "incident_type",
        chartType: "bar" as const,
        description: "Breakdown by incident type",
      },
      {
        title: "Open vs Closed Trends",
        metric: "incidents",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Track incident resolution over time",
      },
    ],
  },
  {
    category: "Audits",
    icon: <ClipboardCheck className="w-5 h-5" />,
    reports: [
      {
        title: "Audits by ISO Code",
        metric: "audits",
        groupBy: "iso_code",
        chartType: "bar" as const,
        description: "Distribution of audit standards",
      },
      {
        title: "Completion Status",
        metric: "audits",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Track audit completion rates",
      },
      {
        title: "Audit Timeline",
        metric: "audits",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Audit activity over time",
      },
    ],
  },
  {
    category: "Trainings",
    icon: <GraduationCap className="w-5 h-5" />,
    reports: [
      {
        title: "Training Compliance by Employee",
        metric: "trainings",
        groupBy: "assigned_to",
        chartType: "bar" as const,
        description: "Individual training completion rates",
      },
      {
        title: "Completed vs Pending",
        metric: "trainings",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Training status overview",
      },
      {
        title: "Training Trends",
        metric: "trainings",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Track training activity over time",
      },
    ],
  },
  {
    category: "Risk Assessments",
    icon: <Shield className="w-5 h-5" />,
    reports: [
      {
        title: "Risks by Level",
        metric: "risks",
        groupBy: "risk_level",
        chartType: "pie" as const,
        description: "Distribution of risk severity",
      },
      {
        title: "Risks by Department",
        metric: "risks",
        groupBy: "department",
        chartType: "bar" as const,
        description: "Risk exposure by department",
      },
      {
        title: "Risk Approval Status",
        metric: "risks",
        groupBy: "approval_status",
        chartType: "pie" as const,
        description: "Track risk approval workflow",
      },
    ],
  },
  {
    category: "Measures",
    icon: <CheckSquare className="w-5 h-5" />,
    reports: [
      {
        title: "Measures by Status",
        metric: "measures",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Safety measure progress overview",
      },
      {
        title: "Measures by Department",
        metric: "measures",
        groupBy: "department",
        chartType: "bar" as const,
        description: "Measure distribution across departments",
      },
    ],
  },
  {
    category: "Health Checkups",
    icon: <Activity className="w-5 h-5" />,
    reports: [
      {
        title: "Checkup Status",
        metric: "checkups",
        groupBy: "status",
        chartType: "pie" as const,
        description: "Health checkup completion rates",
      },
      {
        title: "Checkups Over Time",
        metric: "checkups",
        groupBy: "created_at",
        chartType: "line" as const,
        description: "Track checkup activity trends",
      },
    ],
  },
];

export default function ReportLibrary({
  isOpen,
  onClose,
  onSelectTemplate,
}: ReportLibraryProps) {
  if (!isOpen) return null;

  const handleSelectTemplate = (template: any) => {
    onSelectTemplate({
      title: template.title,
      metric: template.metric,
      groupBy: template.groupBy,
      chartType: template.chartType,
      dateProperty: "created_at",
      dateRange: { type: "last_30_days" },
      sortBy: "value",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Reports Library</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a pre-built report template to get started
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Report Categories */}
        <div className="p-6 space-y-8">
          {REPORT_TEMPLATES.map((category) => (
            <div key={category.category}>
              <div className="flex items-center gap-2 mb-4">
                {category.icon}
                <h3 className="text-lg font-semibold">{category.category}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report) => (
                  <Card
                    key={report.title}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary"
                    onClick={() => handleSelectTemplate(report)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{report.title}</h4>
                        <Grid3x3 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {report.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                          {report.chartType.charAt(0).toUpperCase() + report.chartType.slice(1)} Chart
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          Last 30 days
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
