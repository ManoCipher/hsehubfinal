import { useState } from "react";
import { MoreVertical, Edit, Copy, Trash2, Download, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ReportConfig } from "./ReportBuilder";

interface ReportWidgetProps {
  config: ReportConfig;
  data?: any[];
  onEdit: (config: ReportConfig) => void;
  onDuplicate: (config: ReportConfig) => void;
  onDelete: (id: string) => void;
  onExport: (config: ReportConfig) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function ReportWidget({
  config,
  data = [],
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
}: ReportWidgetProps) {
  // Generate sample/mock data if none provided
  const chartData = (data && data.length > 0) ? data : (config.data || []);
  const hasData = chartData && chartData.length > 0;

  const renderChart = () => {
    const height = 200; // Compact height for horizontal cards

    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center p-6 text-muted-foreground border-2 border-dashed rounded-lg h-full min-h-[200px]">
          <GripVertical className="w-8 h-8 mb-2 opacity-20" />
          <p className="text-sm">No data available</p>
        </div>
      );
    }

    switch (config.chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsPie>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0088FE" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="dashboard-grid-card hover:shadow-lg transition-shadow h-full flex flex-col overflow-hidden">
      <div className="drag-handle border-b cursor-move hover:bg-muted/50 transition-colors p-1 flex items-center justify-center bg-muted/10 h-4">
        <GripVertical className="w-3 h-3 text-muted-foreground/30" />
      </div>

      <CardHeader className="p-3 pb-0 flex-row items-center justify-between space-y-0 gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold truncate leading-tight" title={config.title}>
            {config.title}
          </CardTitle>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {config.metric === 'incidents' ? `Type: ${config.incidentType || 'All'}` :
              config.metric === 'audits' ? `Template: ${config.auditTemplate || 'All'}` :
                `Group: ${config.groupBy}`}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-6 w-6 p-0 shrink-0">
              <MoreVertical className="h-3 w-3" />
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
      </CardHeader>

      <CardContent className="flex-1 p-2 min-h-0 flex flex-col">
        <div className="flex-1 min-h-[120px]">
          {renderChart()}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground text-center border-t pt-1">
          Total: {chartData.reduce((sum, d) => sum + d.value, 0)}
        </div>
      </CardContent>
    </Card>
  );
}
