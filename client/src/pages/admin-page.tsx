import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Loader2, RefreshCw, CheckCircle, XCircle, Settings2 } from "lucide-react";
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

interface AIProviderWidgetProps {
  provider: "openai" | "gemini";
  settings: ApiSetting;
  onSettingChange: (field: keyof ApiSetting, value: any) => void;
  onValidate: () => void;
  isValidating: boolean;
}

function AIProviderWidget({ provider, settings, onSettingChange, onValidate, isValidating }: AIProviderWidgetProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-2 h-full ${settings.isEnabled ? "bg-primary" : "bg-muted"}`} />
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {provider === "openai" ? (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
                  </svg>
                  OpenAI GPT-4
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.84 4.488a.833.833 0 00-1.68 0v2.637a.833.833 0 001.68 0V4.488zM16.7 5.74a.833.833 0 00-1.178-1.179l-1.864 1.864a.833.833 0 101.179 1.179L16.7 5.74zM19.512 9.6a.833.833 0 000-1.68h-2.637a.833.833 0 000 1.68h2.637zM18.26 13.46a.833.833 0 101.179-1.178l-1.864-1.864a.833.833 0 10-1.179 1.179l1.864 1.863zM14.4 16.272a.833.833 0 001.68 0v-2.637a.833.833 0 00-1.68 0v2.637zM10.54 14.822a.833.833 0 00-1.179 1.179l1.864 1.864a.833.833 0 001.179-1.179l-1.864-1.864zM7.728 11.96a.833.833 0 000 1.68h2.637a.833.833 0 000-1.68H7.728zM8.98 8.1a.833.833 0 10-1.179 1.178l1.864 1.864a.833.833 0 101.179-1.179L8.98 8.1z"/>
                  </svg>
                  Google Gemini
                </>
              )}
            </CardTitle>
            <CardDescription>
              Configure AI settings for {provider === "openai" ? "OpenAI GPT-4" : "Google Gemini"} to generate trail descriptions and recommendations
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              disabled={isValidating}
              className="relative"
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : settings.lastValidated ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="ml-2">Validate</span>
              {settings.lastValidated && (
                <div className="absolute -bottom-6 right-0 text-xs text-muted-foreground whitespace-nowrap">
                  Last validated: {new Date(settings.lastValidated).toLocaleString()}
                </div>
              )}
            </Button>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) => onSettingChange("isEnabled", checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {/* API Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">API Configuration</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${provider}-api-key`}>API Key</Label>
                <Input
                  id={`${provider}-api-key`}
                  type="password"
                  value={settings.apiKey || ""}
                  onChange={(e) => onSettingChange("apiKey", e.target.value)}
                  placeholder={`Enter ${provider === "openai" ? "OpenAI" : "Gemini"} API Key`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${provider}-model`}>Model</Label>
                <Input
                  id={`${provider}-model`}
                  value={settings.model || ""}
                  onChange={(e) => onSettingChange("model", e.target.value)}
                  placeholder={provider === "openai" ? "gpt-4o" : "gemini-pro"}
                />
                <p className="text-xs text-muted-foreground">
                  {provider === "openai" 
                    ? "Latest model: gpt-4o (recommended for best results)"
                    : "Available model: gemini-pro"}
                </p>
              </div>
            </div>
          </div>

          {/* Generation Parameters */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Generation Parameters</h3>
            <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Temperature</Label>
                  <span className="text-sm tabular-nums">
                    {settings.temperature || "0.7"}
                  </span>
                </div>
                <Slider
                  value={[parseFloat(settings.temperature || "0.7")]}
                  onValueChange={([value]) =>
                    onSettingChange("temperature", value.toString())
                  }
                  max={1}
                  step={0.1}
                  className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                />
                <p className="text-xs text-muted-foreground">
                  Controls randomness: 0 is focused, 1 is creative
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${provider}-max-tokens`}>Max Tokens</Label>
                <Input
                  id={`${provider}-max-tokens`}
                  type="number"
                  value={settings.maxTokens || ""}
                  onChange={(e) =>
                    onSettingChange("maxTokens", parseInt(e.target.value))
                  }
                  placeholder="e.g., 2000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum length of the generated text (1 token ≈ 4 characters)
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
        description: "AI settings have been updated successfully.",
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
        <div className="space-y-1">
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system status, logs, and manage AI configurations
          </p>
        </div>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Server Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {systemStatus ? Math.floor(systemStatus.uptime / 3600) + " hours" : "Loading..."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Memory Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">Heap Memory</p>
                <p className="text-2xl font-bold">
                  {systemStatus
                    ? `${Math.round((systemStatus.memory.heapUsed / systemStatus.memory.heapTotal) * 100)}%`
                    : "Loading..."}
                </p>
              </div>
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
          <CardHeader className="pb-2">
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {systemStatus?.activeUsers ?? "Loading..."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="error-logs">Error Logs</TabsTrigger>
          <TabsTrigger value="api-settings">
            <Settings2 className="w-4 h-4 mr-2" />
            AI Settings
          </TabsTrigger>
        </TabsList>

        {/* API Logs Tab */}
        <TabsContent value="api-logs">
          <Card>
            <CardHeader>
              <CardTitle>API Request Logs</CardTitle>
              <CardDescription>
                Monitor recent API requests and their responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingApiLogs ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {apiLogs?.map((log, index) => (
                      <Alert key={index}>
                        <AlertDescription>
                          <div className="flex justify-between">
                            <span className="font-mono text-xs">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span
                              className={`px-2 rounded text-xs font-medium ${
                                log.status < 400 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                          <div className="mt-2 font-medium">
                            <span className="text-primary">{log.method}</span>{" "}
                            {log.path}
                            <span className="text-muted-foreground ml-2 text-xs">
                              ({log.duration}ms)
                            </span>
                          </div>
                          {log.response && (
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
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
              <CardDescription>
                Track system errors and exceptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingErrors ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-2">
                    {errorLogs?.map((log, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>
                          <div className="font-mono text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                          <div className="mt-2 font-medium">{log.error}</div>
                          {log.stack && (
                            <pre className="mt-2 p-2 bg-muted/10 rounded text-xs overflow-x-auto">
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

        {/* AI Settings Tab */}
        <TabsContent value="api-settings" className="space-y-6">
          {isLoadingApiSettings ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            apiSettings?.map((setting) => (
              <AIProviderWidget
                key={setting.id}
                provider={setting.provider as "openai" | "gemini"}
                settings={setting}
                onSettingChange={(field, value) => handleSettingChange(setting, field, value)}
                onValidate={() => validateApiMutation.mutate(setting.provider)}
                isValidating={validateApiMutation.isPending}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}