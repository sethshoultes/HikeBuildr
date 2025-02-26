import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ViewOnlyMap } from "@/components/view-only-map";
import { SearchBar } from "@/components/search-bar";
import { TrailCard } from "@/components/trail-card";
import { Trail } from "@shared/schema";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrails, setSelectedTrails] = useState<number[]>([]);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  const { data: trails, isLoading } = useQuery<Trail[]>({
    queryKey: [searchQuery ? `/api/trails/search?q=${searchQuery}` : "/api/trails"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (trailIds: number[]) => {
      const results = await Promise.all(
        trailIds.map(id =>
          apiRequest("DELETE", `/api/trails/${id}`).then(res => {
            if (!res.ok) throw new Error(`Failed to delete trail ${id}`);
            return id;
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trails"] });
      toast({
        title: "Success",
        description: `${selectedTrails.length} trails deleted successfully.`,
      });
      setSelectedTrails([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTrailClick = (trail: Trail) => {
    setLocation(`/trails/${trail.id}`);
  };

  const handleTrailSelect = (trailId: number) => {
    setSelectedTrails(prev =>
      prev.includes(trailId)
        ? prev.filter(id => id !== trailId)
        : [...prev, trailId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedTrails.length > 0) {
      bulkDeleteMutation.mutate(selectedTrails);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">
            Discover Amazing Trails
          </h1>
          <div className="flex gap-2 items-center">
            {isAdmin && selectedTrails.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedTrails.length})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {selectedTrails.length} selected trails
                      and remove all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      disabled={bulkDeleteMutation.isPending}
                    >
                      {bulkDeleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Delete All"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {isAdmin && (
              <Button onClick={() => setLocation("/trails/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Trail
              </Button>
            )}
          </div>
        </div>

        <SearchBar onSearch={setSearchQuery} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="lg:col-span-1 h-[600px]">
            <ViewOnlyMap
              trails={trails || []}
              onTrailClick={handleTrailClick}
            />
          </div>

          <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[600px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : trails?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">
                  No trails found. Try a different search term.
                </p>
              </div>
            ) : (
              trails?.map((trail) => (
                <div key={trail.id} className="relative">
                  {isAdmin && (
                    <div className="absolute top-2 right-2 z-10">
                      <Checkbox
                        checked={selectedTrails.includes(trail.id)}
                        onCheckedChange={() => handleTrailSelect(trail.id)}
                      />
                    </div>
                  )}
                  <TrailCard
                    trail={trail}
                    onClick={() => handleTrailClick(trail)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}