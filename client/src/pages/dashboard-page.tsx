import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewOnlyMap } from "@/components/view-only-map";
import { useAuth } from "@/hooks/use-auth";
import {
  Map,
  User,
  BookmarkIcon,
  PlusCircle,
  Settings2,
  BarChart2,
  LogOut
} from "lucide-react";
import type { Trail } from "@shared/schema";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("saved-trails");

  const { data: savedTrails, isLoading: isLoadingTrails } = useQuery<Trail[]>({
    queryKey: ["/api/trails/saved"],
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
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

        {/* Main Content */}
        <div className="flex-1 p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            {/* Saved Trails Tab */}
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

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Profile</h1>
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Profile Information</h3>
                        <p className="text-sm text-muted-foreground">
                          Username: {user?.username}
                        </p>
                      </div>
                      <div className="pt-4 border-t">
                        <h3 className="font-medium mb-2">Account Settings</h3>
                        {/* Add profile settings controls here */}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Admin Tab */}
            {user?.role === "admin" && (
              <TabsContent value="admin">
                <div className="max-w-4xl mx-auto">
                  <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
                  <div className="grid gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>System Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Add admin controls and metrics here */}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Settings Tab */}
            <TabsContent value="settings">
              <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Account Settings</h1>
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Preferences</h3>
                        {/* Add preference controls here */}
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