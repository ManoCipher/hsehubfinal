import { useState, useEffect } from "react";
import { X, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export interface ReportConfig {
  id: string;
  title: string;
  metric: string;
  groupBy: string;
  dateProperty: string;
  dateRange: {
    type: string;
    startDate?: string;
    endDate?: string;
  };
  chartType: 'pie' | 'bar' | 'line';
  sortBy: string;
  data?: any[]; // Optional data from fetched results
  incidentType?: string;
  auditTemplate?: string;
}

interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ReportConfig) => void;
  initialConfig?: ReportConfig | null;
  data?: any[];
  onRefreshData?: (config: Partial<ReportConfig>) => Promise<any[]>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

export default function ReportBuilder({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  data = [],
  onRefreshData,
}: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || {
      id: Date.now().toString(),
      title: "New Report",
      metric: "employees",
      groupBy: "department",
      dateProperty: "created_at",
      dateRange: {
        type: "last_30_days",
      },
      chartType: "bar",
      sortBy: "value",
    }
  );

  // Local chart data state that can be refreshed
  const [chartData, setChartData] = useState<any[]>(data);
  const [isLoading, setIsLoading] = useState(false);

  // Sync config when initialConfig changes (e.g., when editing different reports)
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      // Also update chart data from initial config
      setChartData(initialConfig.data || data || []);
    }
  }, [initialConfig]);

  // Sync chart data when data prop changes
  useEffect(() => {
    if (data && data.length > 0) {
      setChartData(data);
    }
  }, [data]);

  // Refresh data when metric or groupBy changes
  const handleConfigChange = async (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);

    // If metric or groupBy changed and we have a refresh callback, fetch new data
    if ((key === 'metric' || key === 'groupBy') && onRefreshData) {
      setIsLoading(true);
      try {
        const newData = await onRefreshData(newConfig);
        setChartData(newData || []);
      } catch (error) {
        console.error("Error refreshing data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  const updateConfig = (key: string, value: any) => {
    handleConfigChange(key, value);
  };

  const handleSave = () => {
    // Ensure data is included in the saved config
    const configWithData = {
      ...config,
      data: chartData && chartData.length > 0 ? chartData : config.data || [],
    };
    onSave(configWithData);
    onClose();
  };

  const hasData = chartData.length > 0;

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
          <p>Loading data...</p>
        </div>
      );
    }

    if (!hasData) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed rounded-lg">
          <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
          <p>No data available for this report</p>
        </div>
      );
    }

    switch (config.chartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie margin={{ top: 20, right: 30, left: 30, bottom: 0 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius="50%"
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconSize={10}
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
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
          <ResponsiveContainer width="100%" height={300}>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold">Report Builder</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Configuration Section */}
          <div className="grid grid-cols-2 gap-4">
            {/* Report Title */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                value={config.title}
                onChange={(e) => updateConfig('title', e.target.value)}
                placeholder="Enter report title"
              />
            </div>

            {/* Metric Selection */}
            <div className="space-y-2">
              <Label htmlFor="metric">Metric</Label>
              <Select value={config.metric} onValueChange={(val) => updateConfig('metric', val)}>
                <SelectTrigger id="metric">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employees">Employees</SelectItem>
                  <SelectItem value="incidents">Incidents</SelectItem>
                  <SelectItem value="audits">Audits</SelectItem>
                  <SelectItem value="trainings">Trainings</SelectItem>
                  <SelectItem value="risks">Risk Assessments</SelectItem>
                  <SelectItem value="checkups">Health Checkups</SelectItem>
                  <SelectItem value="measures">Measures</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Group By */}
            <div className="space-y-2">
              <Label htmlFor="groupBy">Group By</Label>
              <Select value={config.groupBy} onValueChange={(val) => updateConfig('groupBy', val)}>
                <SelectTrigger id="groupBy">
                  <SelectValue placeholder="Select grouping" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="assigned_to">Assigned To</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Property */}
            <div className="space-y-2">
              <Label htmlFor="dateProperty">Date Property</Label>
              <Select value={config.dateProperty} onValueChange={(val) => updateConfig('dateProperty', val)}>
                <SelectTrigger id="dateProperty">
                  <SelectValue placeholder="Select date field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="updated_at">Updated Date</SelectItem>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="completed_at">Completed Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <Select
                value={config.dateRange.type}
                onValueChange={(val) => updateConfig('dateRange', { ...config.dateRange, type: val })}
              >
                <SelectTrigger id="dateRange">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chart Type */}
            <div className="space-y-2">
              <Label>Chart Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={config.chartType === 'pie' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig('chartType', 'pie')}
                  className="flex-1"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  Pie
                </Button>
                <Button
                  variant={config.chartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig('chartType', 'bar')}
                  className="flex-1"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Bar
                </Button>
                <Button
                  variant={config.chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateConfig('chartType', 'line')}
                  className="flex-1"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Line
                </Button>
              </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select value={config.sortBy} onValueChange={(val) => updateConfig('sortBy', val)}>
                <SelectTrigger id="sortBy">
                  <SelectValue placeholder="Select sorting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value">Value (High to Low)</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview Tabs */}
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Data Table</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="mt-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-medium mb-4">{config.title}</h3>
                {renderChart()}
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-3 font-semibold">Name</th>
                      <th className="text-right p-3 font-semibold">Value</th>
                      <th className="text-right p-3 font-semibold">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((item, index) => {
                      const total = chartData.reduce((sum, d) => sum + d.value, 0);
                      const percentage = ((item.value / total) * 100).toFixed(1);
                      return (
                        <tr key={index} className="border-b">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 text-right font-medium">{item.value}</td>
                          <td className="p-3 text-right text-muted-foreground">{percentage}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Count</div>
                    <div className="text-2xl font-bold">
                      {chartData.reduce((sum, d) => sum + d.value, 0)}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Average</div>
                    <div className="text-2xl font-bold">
                      {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground">Categories</div>
                    <div className="text-2xl font-bold">{chartData.length}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Date Range:</strong> {config.dateRange.type.replace(/_/g, ' ')}</p>
                  <p><strong>Grouped By:</strong> {config.groupBy}</p>
                  <p><strong>Metric:</strong> {config.metric}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initialConfig ? 'Save Report' : 'Add Report'}
          </Button>
        </div>
      </div>
    </div>
  );
}
