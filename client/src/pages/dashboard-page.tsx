import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewOnlyMap } from "@/components/view-only-map";
import { useAuth } from "@/hooks/use-auth";
import { Map, User, BookmarkIcon, PlusCircle, Settings2, BarChart2, LogOut } from "lucide-react";
import type { Trail } from "@shared/schema";
import AdminPage from "./admin-page";
import ProfilePage from "./profile-page";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface AIProvider {
  provider: string;
  isEnabled: boolean;
  apiKey?: string;
}

interface AISettings {
  providers: AIProvider[];
}

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("saved-trails");
  const { toast } = useToast();

  const { data: savedTrails, isLoading: isLoadingTrails } = useQuery<Trail[]>({
    queryKey: ["/api/trails/saved"],
  });

  const { data: aiSettings } = useQuery<AISettings>({
    queryKey: ["/api/admin/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedProvider: AIProvider) => {
      const response = await fetch(`/api/admin/settings/${updatedProvider.provider}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProvider),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Success",
        description: "AI settings updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getProviderSettings = (providerName: string): AIProvider | undefined => {
    return aiSettings?.providers?.find(p => p.provider === providerName);
  };

  const handleProviderToggle = (provider: string, enabled: boolean) => {
    const currentSettings = getProviderSettings(provider);
    if (currentSettings) {
      updateSettingsMutation.mutate({
        ...currentSettings,
        isEnabled: enabled,
      });
    }
  };

  const handleApiKeyChange = (provider: string, apiKey: string) => {
    const currentSettings = getProviderSettings(provider);
    if (currentSettings) {
      updateSettingsMutation.mutate({
        ...currentSettings,
        apiKey,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <div className="w-64 border-r border-border bg-card h-screen p-4">
          <div className="flex flex-col h-full">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Dashboard</h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user?.username}</span>
              </div>
            </div>

            <nav className="flex-1 mt-8">
              <div className="space-y-1">
                <Button
                  variant={activeTab === "saved-trails" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("saved-trails")}
                >
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Saved Trails
                </Button>
                <Button
                  variant={activeTab === "create-trail" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setLocation("/trails/new")}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Trail
                </Button>
                <Button
                  variant={activeTab === "profile" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("profile")}
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                {user?.role === "admin" && (
                  <Button
                    variant={activeTab === "admin" ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveTab("admin")}
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                )}
                <Button
                  variant={activeTab === "settings" ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </nav>

            <div className="mt-auto pt-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsContent value="saved-trails" className="h-full">
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold">Your Saved Trails</h1>
                  <Button onClick={() => setLocation("/trails/new")}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Trail
                  </Button>
                </div>

                {isLoadingTrails ? (
                  <div>Loading trails...</div>
                ) : savedTrails && savedTrails.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedTrails.map((trail) => (
                      <Card key={trail.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setLocation(`/trails/${trail.id}`)}>
                        <CardHeader>
                          <CardTitle>{trail.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">{trail.location}</p>
                          <p className="text-sm">
                            Distance: {trail.distance} • Duration: {trail.duration}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Map className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Saved Trails</h3>
                      <p className="text-muted-foreground mb-4">
                        Start by adding some trails to your collection
                      </p>
                      <Button onClick={() => setLocation("/trails/new")}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Your First Trail
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="profile">
              <ProfilePage />
            </TabsContent>

            {user?.role === "admin" && (
              <TabsContent value="admin">
                <AdminPage />
              </TabsContent>
            )}

            <TabsContent value="settings">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Settings</h1>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>AI Configuration</CardTitle>
                    <CardDescription>
                      Configure AI providers for trail recommendations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">OpenAI GPT-4</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure AI settings for OpenAI GPT-4 to generate trail descriptions and recommendations
                          </p>
                        </div>
                        <Switch
                          checked={getProviderSettings("openai")?.isEnabled}
                          onCheckedChange={(checked) => handleProviderToggle("openai", checked)}
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">API Key</label>
                          <Input
                            type="password"
                            value={getProviderSettings("openai")?.apiKey}
                            onChange={(e) => handleApiKeyChange("openai", e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium">Temperature (0.7)</label>
                          <Slider
                            defaultValue={[0.7]}
                            max={1}
                            step={0.1}
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Controls randomness: 0 is focused, 1 is creative
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Max Tokens</label>
                          <Input
                            type="number"
                            defaultValue={2000}
                            className="mt-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Maximum length of the generated text (1 token ≈ 4 characters)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Google Gemini</h3>
                          <p className="text-sm text-muted-foreground">
                            Configure AI settings for Google Gemini to generate trail descriptions and recommendations
                          </p>
                        </div>
                        <Switch
                          checked={getProviderSettings("gemini")?.isEnabled}
                          onCheckedChange={(checked) => handleProviderToggle("gemini", checked)}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">API Key</label>
                        <Input
                          type="password"
                          value={getProviderSettings("gemini")?.apiKey}
                          onChange={(e) => handleApiKeyChange("gemini", e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Preferences</CardTitle>
                    <CardDescription>
                      Customize your hiking experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}