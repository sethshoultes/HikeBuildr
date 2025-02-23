import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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

  const { data: apiLogs, isLoading: isLoadingApiLogs } = useQuery<ApiLog[]>({
    queryKey: ["/api/admin/logs"],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: errorLogs, isLoading: isLoadingErrors } = useQuery<ErrorLog[]>({
    queryKey: ["/api/admin/errors"],
    refetchInterval: 5000,
  });

  const { data: systemStatus } = useQuery<{
    uptime: number;
    memory: { used: number; total: number };
    activeUsers: number;
  }>({
    queryKey: ["/api/admin/status"],
    refetchInterval: 10000,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
            <p className="text-2xl">
              {systemStatus
                ? `${Math.round((systemStatus.memory.used / systemStatus.memory.total) * 100)}%`
                : "Loading..."}
            </p>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="api-logs">API Logs</TabsTrigger>
          <TabsTrigger value="error-logs">Error Logs</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}
