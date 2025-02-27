import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrailSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditableMap } from "./editable-map";

export function TrailCreationForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [coordinates, setCoordinates] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Form setup with validation
  const form = useForm({
    resolver: zodResolver(insertTrailSchema),
    defaultValues: {
      name: "",
      description: "",
      difficulty: "moderate",
      distance: "",
      elevation: "",
      coordinates: "",
      pathCoordinates: "",
    },
  });

  // Check for duplicate trails
  const checkDuplicates = useMutation({
    mutationFn: async (data: { name: string; coordinates: string }) => {
      if (!navigator.onLine) {
        // Skip duplicate check when offline
        return { duplicates: { count: 0, names: [] } };
      }
      const response = await apiRequest("POST", "/api/trails/check-duplicates", data);
      return response.json();
    },
  });

  // Create trail mutation
  const createTrailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/trails", data);
      if (!response.ok) {
        throw new Error("Failed to create trail");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trail Created",
        description: "Your trail has been successfully created.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: any) => {
    // Check for duplicates first
    const duplicateCheck = await checkDuplicates.mutateAsync({
      name: data.name,
      coordinates: coordinates,
    });

    if (duplicateCheck.duplicates.count > 0) {
      // Show warning but allow proceeding
      const proceed = window.confirm(
        `Similar trails found: ${duplicateCheck.duplicates.names.join(", ")}. Do you want to proceed?`
      );
      if (!proceed) return;
    }

    // Store locally if offline
    if (isOffline) {
      try {
        const pendingTrails = JSON.parse(localStorage.getItem("pendingTrails") || "[]");
        pendingTrails.push({ ...data, createdAt: new Date().toISOString() });
        localStorage.setItem("pendingTrails", JSON.stringify(pendingTrails));
        toast({
          title: "Trail Saved Offline",
          description: "Trail will be synced when connection is restored.",
        });
        form.reset();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to save trail offline",
          variant: "destructive",
        });
      }
      return;
    }

    // Create trail if online
    createTrailMutation.mutate(data);
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isOffline && (
              <Alert>
                <AlertDescription>
                  You are currently offline. Trail will be saved locally and synced when connection is restored.
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trail Name</FormLabel>
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

            <div className="h-[400px] relative">
              <EditableMap
                onCoordinatesChange={(coords) => {
                  setCoordinates(coords);
                  form.setValue("coordinates", coords);
                }}
                onPathCoordinatesChange={(path) => {
                  form.setValue("pathCoordinates", path);
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={createTrailMutation.isPending || checkDuplicates.isPending}
            >
              {(createTrailMutation.isPending || checkDuplicates.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Save className="h-4 w-4 mr-2" />
              {isOffline ? "Save Offline" : "Create Trail"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
