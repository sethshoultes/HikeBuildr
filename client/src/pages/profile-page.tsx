import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePictureUrl || "");
  const [hikingPreferences, setHikingPreferences] = useState(user?.hikingPreferences || {
    preferredDifficulty: "moderate",
    maxDistance: 10,
    preferredTerrains: ["forest", "mountain"],
    preferredSeasons: ["spring", "summer"],
    notifications: true
  });
  const [privacySettings, setPrivacySettings] = useState(user?.privacySettings || {
    showEmail: false,
    showFullName: true,
    showActivities: true,
    showFavorites: true
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      bio: string;
      profilePictureUrl: string;
      hikingPreferences: typeof hikingPreferences;
      privacySettings: typeof privacySettings;
    }) => {
      const response = await apiRequest("PATCH", "/api/user/profile", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
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

  const handleSave = () => {
    updateProfileMutation.mutate({
      fullName,
      email,
      bio,
      profilePictureUrl,
      hikingPreferences,
      privacySettings,
    });
  };

  const terrainOptions = ["forest", "mountain", "desert", "coastal", "urban"];
  const seasonOptions = ["spring", "summer", "fall", "winter"];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Manage your personal information and profile picture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Profile Picture URL</label>
            <Input 
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              placeholder="Enter your profile picture URL"
            />
            <p className="text-sm text-muted-foreground">
              Enter a URL for your profile picture. We recommend using a square image.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hiking Preferences</CardTitle>
          <CardDescription>
            Customize your hiking experience and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Difficulty</label>
              <Select
                value={hikingPreferences.preferredDifficulty}
                onValueChange={(value) => setHikingPreferences(prev => ({
                  ...prev,
                  preferredDifficulty: value as "easy" | "moderate" | "strenuous"
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="strenuous">Strenuous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Trail Distance (miles)</label>
              <div className="pt-2">
                <Slider
                  value={[hikingPreferences.maxDistance]}
                  onValueChange={([value]) => setHikingPreferences(prev => ({
                    ...prev,
                    maxDistance: value
                  }))}
                  max={50}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1 mile</span>
                  <span>{hikingPreferences.maxDistance} miles</span>
                  <span>50 miles</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Terrains</label>
              <div className="grid grid-cols-2 gap-2">
                {terrainOptions.map((terrain) => (
                  <div key={terrain} className="flex items-center space-x-2">
                    <Checkbox
                      id={terrain}
                      checked={hikingPreferences.preferredTerrains.includes(terrain)}
                      onCheckedChange={(checked) => {
                        setHikingPreferences(prev => ({
                          ...prev,
                          preferredTerrains: checked
                            ? [...prev.preferredTerrains, terrain]
                            : prev.preferredTerrains.filter(t => t !== terrain)
                        }));
                      }}
                    />
                    <label htmlFor={terrain} className="text-sm capitalize">
                      {terrain}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Seasons</label>
              <div className="grid grid-cols-2 gap-2">
                {seasonOptions.map((season) => (
                  <div key={season} className="flex items-center space-x-2">
                    <Checkbox
                      id={season}
                      checked={hikingPreferences.preferredSeasons.includes(season)}
                      onCheckedChange={(checked) => {
                        setHikingPreferences(prev => ({
                          ...prev,
                          preferredSeasons: checked
                            ? [...prev.preferredSeasons, season]
                            : prev.preferredSeasons.filter(s => s !== season)
                        }));
                      }}
                    />
                    <label htmlFor={season} className="text-sm capitalize">
                      {season}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Notifications</label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about new trails and recommendations
                </p>
              </div>
              <Switch
                checked={hikingPreferences.notifications}
                onCheckedChange={(checked) => setHikingPreferences(prev => ({
                  ...prev,
                  notifications: checked
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Control what information is visible to other users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(privacySettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Show your {key.replace(/([A-Z])/g, ' $1').toLowerCase()} to other users
                  </p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => setPrivacySettings(prev => ({
                    ...prev,
                    [key]: checked
                  }))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleSave} 
        className="w-full"
        disabled={updateProfileMutation.isPending}
      >
        {updateProfileMutation.isPending && (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        )}
        <Save className="h-4 w-4 mr-2" />
        Save Changes
      </Button>
    </div>
  );
}