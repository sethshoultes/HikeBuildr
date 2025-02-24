import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ApiSetting } from "@shared/schema";

interface ApiLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  response?: string;
}

interface ErrorLog {
  timestamp: string;
  error: string;
  stack?: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("api-logs");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const { data: apiLogs, isLoading: isLoadingApiLogs } = useQuery<ApiLog[]>({
    queryKey: ["/api/admin/logs"],
  });

  const { data: errorLogs, isLoading: isLoadingErrors } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/errors"],
  });

  const { data: systemStatus } = useQuery<{
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    activeUsers: number;
  }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: apiSettings, isLoading: isLoadingApiSettings } = useQuery<ApiSetting[]>({
    queryKey: ["/api/admin/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<ApiSetting>) => {
      const res = await apiRequest("PATCH", `/api/admin/settings/${settings.id}`, settings);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings updated",
        description: "API settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateApiMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await apiRequest("POST", `/api/admin/settings/validate/${provider}`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "API Validation",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/errors"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSettingChange = (setting: ApiSetting, field: keyof ApiSetting, value: any) => {
    updateSettingsMutation.mutate({ ...setting, [field]: value });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Existing status cards */}
        <Card>
          <CardHeader>
            <CardTitle>Server Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">
              {systemStatus ? Math.floor(systemStatus.uptime / 3600) + " hours" : "Loading..."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Heap Memory</p>
              <p className="text-2xl">
                {systemStatus
                  ? `${Math.round((systemStatus.memory.heapUsed / systemStatus.memory.heapTotal) * 100)}%`
                  : "Loading..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {systemStatus
                  ? `${(systemStatus.memory.heapUsed / 1024 / 1024).toFixed(1)} MB / ${(
                      systemStatus.memory.heapTotal / 1024 / 1024
                    ).toFixed(1)} MB`
                  : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl">{systemStatus?.activeUsers ?? "Loading..."}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="error-logs">Error Logs</TabsTrigger>
          <TabsTrigger value="api-settings">API Settings</TabsTrigger>
        </TabsList>

        {/* API Logs Tab */}
        <TabsContent value="api-logs">
          <Card>
            <CardHeader>
              <CardTitle>API Request Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingApiLogs ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {apiLogs?.map((log, index) => (
                      <Alert key={index}>
                        <AlertDescription>
                          <div className="flex justify-between">
                            <span className="font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span
                              className={`px-2 rounded ${
                                log.status < 400 ? "bg-green-100" : "bg-red-100"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                          <div className="mt-2">
                            <span className="font-semibold">{log.method}</span>{" "}
                            {log.path} ({log.duration}ms)
                          </div>
                          {log.response && (
                            <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-x-auto">
                              {log.response}
                            </pre>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error Logs Tab */}
        <TabsContent value="error-logs">
          <Card>
            <CardHeader>
              <CardTitle>Error Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingErrors ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {errorLogs?.map((log, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>
                          <div className="font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div className="mt-2 font-semibold">{log.error}</div>
                          {log.stack && (
                            <pre className="mt-2 p-2 bg-muted rounded text-sm overflow-x-auto">
                              {log.stack}
                            </pre>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Settings Tab */}
        <TabsContent value="api-settings">
          <Card>
            <CardHeader>
              <CardTitle>AI API Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingApiSettings ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {apiSettings?.map((setting) => (
                    <div key={setting.id} className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold capitalize">{setting.provider}</h3>
                        <div className="flex items-center gap-4">
                          <Switch
                            checked={setting.isEnabled}
                            onCheckedChange={(checked) =>
                              handleSettingChange(setting, "isEnabled", checked)
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => validateApiMutation.mutate(setting.provider)}
                            disabled={validateApiMutation.isPending}
                          >
                            {validateApiMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : setting.lastValidated ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="ml-2">Validate</span>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`${setting.provider}-api-key`}>API Key</Label>
                          <Input
                            id={`${setting.provider}-api-key`}
                            type="password"
                            value={setting.apiKey || ""}
                            onChange={(e) =>
                              handleSettingChange(setting, "apiKey", e.target.value)
                            }
                            placeholder={`Enter ${setting.provider} API Key`}
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`${setting.provider}-model`}>Model</Label>
                          <Input
                            id={`${setting.provider}-model`}
                            value={setting.model || ""}
                            onChange={(e) =>
                              handleSettingChange(setting, "model", e.target.value)
                            }
                            placeholder="e.g., gpt-4o for OpenAI, gemini-pro for Gemini"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Temperature</Label>
                          <Slider
                            value={[parseFloat(setting.temperature || "0.7")]}
                            onValueChange={([value]) =>
                              handleSettingChange(setting, "temperature", value.toString())
                            }
                            max={1}
                            step={0.1}
                          />
                          <span className="text-sm text-muted-foreground">
                            {setting.temperature || "0.7"}
                          </span>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`${setting.provider}-max-tokens`}>Max Tokens</Label>
                          <Input
                            id={`${setting.provider}-max-tokens`}
                            type="number"
                            value={setting.maxTokens || ""}
                            onChange={(e) =>
                              handleSettingChange(
                                setting,
                                "maxTokens",
                                parseInt(e.target.value)
                              )
                            }
                            placeholder="e.g., 2000"
                          />
                        </div>

                        {setting.lastValidated && (
                          <p className="text-sm text-muted-foreground">
                            Last validated:{" "}
                            {new Date(setting.lastValidated).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}