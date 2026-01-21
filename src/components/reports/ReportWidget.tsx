import {
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Download,
  GripVertical,
  Users,
  Shield,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  CheckCircle,
  FileText,
  Building,
  Calendar,
  Activity
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportConfig } from "./ReportBuilder";

interface ReportWidgetProps {
  config: ReportConfig;
  data?: any[];
  onEdit: (config: ReportConfig) => void;
  onDuplicate: (config: ReportConfig) => void;
  onDelete: (id: string) => void;
  onExport: (config: ReportConfig) => void;
}

// Icon and color mapping based on metric type
const getMetricStyle = (metric: string) => {
  switch (metric) {
    case 'employees':
      return { icon: Users, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' };
    case 'risk_assessments':
      return { icon: Shield, bgColor: 'bg-orange-50', iconColor: 'text-orange-600' };
    case 'audits':
      return { icon: ClipboardCheck, bgColor: 'bg-blue-50', iconColor: 'text-blue-600' };
    case 'incidents':
      return { icon: AlertTriangle, bgColor: 'bg-red-50', iconColor: 'text-red-600' };
    case 'trainings':
      return { icon: GraduationCap, bgColor: 'bg-green-50', iconColor: 'text-green-600' };
    case 'tasks':
      return { icon: CheckCircle, bgColor: 'bg-purple-50', iconColor: 'text-purple-600' };
    case 'measures':
      return { icon: FileText, bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' };
    default:
      return { icon: Activity, bgColor: 'bg-gray-50', iconColor: 'text-gray-600' };
  }
};

// Get subtitle based on report configuration
const getSubtitle = (config: ReportConfig) => {
  if (config.metric === 'incidents' && config.incidentType) {
    return `Type: ${config.incidentType}`;
  }
  if (config.metric === 'audits' && config.auditTemplate) {
    return `Template: ${config.auditTemplate}`;
  }
  if (config.groupBy) {
    return `By ${config.groupBy}`;
  }
  return 'Total count';
};

export default function ReportWidget({
  config,
  data = [],
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
}: ReportWidgetProps) {
  // Calculate total value from data
  const chartData = (data && data.length > 0) ? data : (config.data || []);
  const totalValue = chartData.reduce((sum, d) => sum + (d.value || 0), 0);

  // Get styling based on metric
  const { icon: IconComponent, bgColor, iconColor } = getMetricStyle(config.metric || '');
  const subtitle = getSubtitle(config);

  return (
    <Card className="h-full flex flex-col overflow-hidden border-2 rounded-xl hover:border-primary/30 hover:shadow-md transition-all duration-200">
      {/* Drag Handle - Clean, subtle design */}
      <div className="drag-handle cursor-grab active:cursor-grabbing flex items-center justify-center py-2 hover:bg-muted/30 transition-colors">
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
      </div>

      {/* Main Content - Centered layout matching KPI cards */}
      <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6 relative">
        {/* Dropdown Menu - Top right */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-muted/50">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(config)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(config)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(config)}>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(config.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center mb-4`}>
          <IconComponent className={`w-6 h-6 ${iconColor}`} />
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-2" title={config.title}>
          {config.title}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground mb-4">
          {subtitle}
        </p>

        {/* Value */}
        <p className="text-3xl font-bold text-foreground">
          {totalValue}
        </p>
      </CardContent>
    </Card>
  );
}
