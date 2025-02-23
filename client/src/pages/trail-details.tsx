import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { MapView } from "@/components/map-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trail, insertTrailSchema } from "@shared/schema";
import { Loader2, Save, ArrowLeft } from "lucide-react";
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
import { useEffect } from "react";

export default function TrailDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: trail, isLoading } = useQuery<Trail>({
    queryKey: [`/api/trails/${id}`],
    enabled: !!id,
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

  const form = useForm({
    resolver: zodResolver(insertTrailSchema),
    defaultValues: {
      name: "",
      description: "",
      difficulty: "Easy",
      distance: "",
      elevation: "",
      duration: "",
      location: "",
      coordinates: "",
      imageUrl: "",
      bestSeason: "",
      parkingInfo: "",
    },
  });

  useEffect(() => {
    if (trail) {
      form.reset(trail);
    }
  }, [trail, form]);

  const updateTrailMutation = useMutation({
    mutationFn: async (data: Partial<Trail>) => {
      const res = await apiRequest(
        id ? "PATCH" : "POST",
        id ? `/api/trails/${id}` : "/api/trails",
        data
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trails"] });
      toast({
        title: "Success",
        description: `Trail ${id ? "updated" : "created"} successfully.`,
      });
      if (!id) {
        setLocation("/");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTrailEdit = (trailId: number, coordinates: string) => {
    if (isAdmin) {
      form.setValue("coordinates", coordinates);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
            {id ? trail?.name : "New Trail"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>Edit Trail</CardTitle>
                </CardHeader>
                <CardContent>
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
                              <Input {...field} placeholder="Use the map to set coordinates" readOnly />
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
                        {id ? "Update Trail" : "Create Trail"}
                      </Button>
                    </form>
                  </Form>
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

                    <Button className="w-full">Download GPX</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="h-[600px]">
            <MapView
              trails={trail ? [trail] : []}
              centered
              onTrailEdit={handleTrailEdit}
            />
          </div>
        </div>
      </main>
    </div>
  );
}