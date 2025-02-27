import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { EditableMap } from "@/components/editable-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trail, insertTrailSchema } from "@shared/schema";
import { Loader2, Save, ArrowLeft, Upload, Download } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AITrailSuggestionModal } from "@/components/ai-trail-suggestion-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as z from 'zod';

// Type for the form values
type TrailFormValues = z.infer<typeof insertTrailSchema>;

export default function TrailDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: trail, isLoading } = useQuery<Trail>({
    queryKey: [`/api/trails/${id}`],
    enabled: id !== "new" && !!id,
  });

  const { data: aiDescription, isLoading: isLoadingAI } = useQuery<{
    description: string;
  }>({
    queryKey: [`/api/trails/${id}/ai-description`],
    enabled: !!trail,
  });

  const { data: gearList, isLoading: isLoadingGear } = useQuery<{
    gearList: string[];
  }>({
    queryKey: [`/api/trails/${id}/gear`],
    enabled: !!trail,
  });

  const form = useForm<TrailFormValues>({
    resolver: zodResolver(insertTrailSchema),
    defaultValues: {
      name: "",
      description: "",
      difficulty: "Easy" as const,
      distance: "",
      elevation: "",
      duration: "",
      location: "",
      coordinates: "",
      pathCoordinates: "",
      imageUrl: "",
      bestSeason: "",
      parkingInfo: "",
    },
  });

  useEffect(() => {
    if (trail) {
      // Ensure difficulty is one of the valid enum values
      const validDifficulty = ["Easy", "Moderate", "Strenuous"].includes(trail.difficulty)
        ? (trail.difficulty as "Easy" | "Moderate" | "Strenuous")
        : "Easy";

      const formData = {
        name: trail.name,
        description: trail.description,
        difficulty: validDifficulty,
        distance: trail.distance,
        elevation: trail.elevation,
        duration: trail.duration,
        location: trail.location,
        coordinates: trail.coordinates,
        pathCoordinates: trail.pathCoordinates || "",
        imageUrl: trail.imageUrl || "",
        bestSeason: trail.bestSeason || "",
        parkingInfo: trail.parkingInfo || "",
      };
      form.reset(formData);
    }
  }, [trail, form]);

  const handleCoordinatesChange = (coordinates: string) => {
    if (isAdmin) {
      form.setValue("coordinates", coordinates);
    }
  };

  const handlePathCoordinatesChange = (pathCoordinates: string) => {
    if (isAdmin) {
      form.setValue("pathCoordinates", pathCoordinates, {
        shouldDirty: true,
        shouldTouch: true,
      });
    }
  };

  const updateTrailMutation = useMutation({
    mutationFn: async (data: Partial<Trail>) => {
      const res = await apiRequest(
        id === "new" ? "POST" : "PATCH",
        id === "new" ? "/api/trails" : `/api/trails/${id}`,
        {
          ...data,
          pathCoordinates: form.getValues("pathCoordinates") || null,
        }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update trail");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/trails"] });
      toast({
        title: "Success",
        description: `Trail ${id === "new" ? "created" : "updated"} successfully.`,
      });
      if (id === "new") {
        setLocation("/");
      }
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const uploadGpxMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('gpx', file);

      const res = await fetch(`/api/trails/${id}/gpx`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload GPX file");
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trails/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/trails"] });
      toast({
        title: "Success",
        description: "GPX file uploaded successfully",
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

  const deleteTrailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/trails/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete trail");
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trails"] });
      toast({
        title: "Success",
        description: "Trail deleted successfully.",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGpxUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadGpxMutation.mutate(file);
    }
  };

  const handleGpxDownload = async () => {
    try {
      const response = await fetch(`/api/trails/${id}/gpx`);
      if (!response.ok) {
        throw new Error("Failed to download GPX file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trail-${id}.gpx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSuggestionApply = (suggestion: Partial<Trail>) => {
    console.log('Applying suggestion:', suggestion);

    // Get current form values
    const currentValues = form.getValues();

    // Update form with suggestion, keeping existing values as fallback
    form.reset({
      ...currentValues,
      name: suggestion.name || currentValues.name,
      description: suggestion.description || currentValues.description,
      difficulty: suggestion.difficulty || currentValues.difficulty,
      distance: suggestion.distance || currentValues.distance,
      elevation: suggestion.elevation || currentValues.elevation,
      duration: suggestion.duration || currentValues.duration,
      location: suggestion.location || currentValues.location,
      bestSeason: suggestion.bestSeason || currentValues.bestSeason,
      parkingInfo: suggestion.parkingInfo || currentValues.parkingInfo,
      coordinates: suggestion.coordinates, // Direct assignment without fallback
      pathCoordinates: currentValues.pathCoordinates,
      imageUrl: currentValues.imageUrl,
    });

    // Only trigger validation for fields that are in the form
    const validFields = ['name', 'description', 'difficulty', 'distance', 'elevation', 'duration', 'location', 'bestSeason', 'parkingInfo', 'coordinates', 'pathCoordinates', 'imageUrl'] as const;
    validFields.forEach(field => {
      if (field in suggestion) {
        form.trigger(field);
      }
    });
  };

  if (isLoading && id !== "new") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!trail && id !== "new") {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Trails
            </Button>
            <h1 className="text-4xl font-bold text-foreground">Trail Not Found</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trails
          </Button>
          <h1 className="text-4xl font-bold text-foreground">
            {id === "new" ? "New Trail" : trail?.name}
          </h1>
          {isAdmin && id !== "new" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete Trail
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the trail
                    and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteTrailMutation.mutate()}
                    disabled={deleteTrailMutation.isPending}
                  >
                    {deleteTrailMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>{id === "new" ? "Create Trail" : "Edit Trail"}</CardTitle>
                </CardHeader>
                <CardContent>
                  {id === "new" && (
                    <div className="mb-6">
                      <AITrailSuggestionModal onSuggestionApply={handleSuggestionApply} />
                    </div>
                  )}
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((data) =>
                        updateTrailMutation.mutate(data)
                      )}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select difficulty" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Easy">Easy</SelectItem>
                                  <SelectItem value="Moderate">Moderate</SelectItem>
                                  <SelectItem value="Strenuous">Strenuous</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="distance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Distance</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 5.4 miles" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="elevation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Elevation Gain</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 1,488 feet" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="e.g. 4-6 hours" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="coordinates"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coordinates</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Use the map or AI suggestions to set coordinates" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pathCoordinates"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Path Coordinates</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Use the map drawing tools to set path"
                                value={field.value || ''}
                                onChange={(e) => {
                                  field.onChange(e.target.value);
                                  console.log('Path coordinates updated:', e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bestSeason"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Best Season</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="parkingInfo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Parking Info</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={updateTrailMutation.isPending}
                      >
                        {updateTrailMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        <Save className="h-4 w-4 mr-2" />
                        {id === "new" ? "Create Trail" : "Update Trail"}
                      </Button>
                    </form>
                  </Form>

                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="text-lg font-medium mb-2">GPX File Management</h3>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('gpx-upload')?.click();
                          }}
                          disabled={uploadGpxMutation.isPending}
                        >
                          {uploadGpxMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload GPX
                        </Button>
                        <input
                          id="gpx-upload"
                          type="file"
                          accept=".gpx"
                          className="hidden"
                          onChange={handleGpxUpload}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-2">Details</h2>
                      <p>Location: {trail?.location}</p>
                      <p>Distance: {trail?.distance}</p>
                      <p>Duration: {trail?.duration}</p>
                      <p>Difficulty: {trail?.difficulty}</p>
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-2">Description</h2>
                      {isLoadingAI ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <p>{aiDescription?.description}</p>
                      )}
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold mb-2">
                        Recommended Gear
                      </h2>
                      {isLoadingGear ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <ul className="list-disc list-inside">
                          {gearList?.gearList.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleGpxDownload}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download GPX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="h-[600px]">
            <EditableMap
              trail={trail}
              onCoordinatesChange={handleCoordinatesChange}
              onPathCoordinatesChange={handlePathCoordinatesChange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}