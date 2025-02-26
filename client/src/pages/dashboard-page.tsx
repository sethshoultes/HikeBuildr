import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("saved-trails");

  const { data: savedTrails, isLoading: isLoadingTrails } = useQuery<Trail[]>({
    queryKey: ["/api/trails/saved"],
  });

  const { data: aiSettings } = useQuery({
    queryKey: ["/api/admin/settings"],
  });

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
                          checked={aiSettings?.find(s => s.provider === "openai")?.isEnabled}
                          onCheckedChange={() => { }}
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">API Key</label>
                          <Input
                            type="password"
                            value={aiSettings?.find(s => s.provider === "openai")?.apiKey}
                            onChange={() => { }}
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
                          checked={aiSettings?.find(s => s.provider === "gemini")?.isEnabled}
                          onCheckedChange={() => { }}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">API Key</label>
                        <Input
                          type="password"
                          value={aiSettings?.find(s => s.provider === "gemini")?.apiKey}
                          onChange={() => { }}
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
                    <div className="space-y-6">
                      <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold">Display Settings</h3>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Distance Unit</label>
                          <select 
                            className="w-full p-2 border rounded-md bg-background"
                            defaultValue="miles"
                          >
                            <option value="miles">Miles</option>
                            <option value="kilometers">Kilometers</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Map Display</label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked id="show-elevation" />
                              <label htmlFor="show-elevation" className="text-sm">Show elevation data</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked id="show-markers" />
                              <label htmlFor="show-markers" className="text-sm">Show trail markers</label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold">Trail Preferences</h3>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Preferred Difficulty Level</label>
                          <div className="grid grid-cols-3 gap-2">
                            <Button 
                              variant="outline" 
                              className="w-full"
                              data-state="active"
                            >
                              Easy
                            </Button>
                            <Button 
                              variant="outline"
                              className="w-full"
                            >
                              Moderate
                            </Button>
                            <Button 
                              variant="outline"
                              className="w-full"
                            >
                              Hard
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Preferred Trail Types</label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked id="loop-trails" />
                              <label htmlFor="loop-trails" className="text-sm">Loop Trails</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked id="out-and-back" />
                              <label htmlFor="out-and-back" className="text-sm">Out and Back</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch defaultChecked id="point-to-point" />
                              <label htmlFor="point-to-point" className="text-sm">Point to Point</label>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-4 border rounded-lg">
                        <h3 className="font-semibold">Notification Preferences</h3>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch defaultChecked id="new-trail-notifications" />
                            <label htmlFor="new-trail-notifications" className="text-sm">New trail recommendations</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch defaultChecked id="weather-alerts" />
                            <label htmlFor="weather-alerts" className="text-sm">Weather alerts for saved trails</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch defaultChecked id="community-updates" />
                            <label htmlFor="community-updates" className="text-sm">Community updates and events</label>
                          </div>
                        </div>
                      </div>
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