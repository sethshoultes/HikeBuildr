import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AIProviderWidget } from "@/components/ai-provider-widget";
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

      

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="error-logs">Error Logs</TabsTrigger>
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
                    <style jsx>{`
                      pre {
                        white-space: pre-wrap;
                        word-break: break-all;
                        max-width: 100%;
                      }
                    `}</style>
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
        
      </Tabs>
    </div>
  );
}