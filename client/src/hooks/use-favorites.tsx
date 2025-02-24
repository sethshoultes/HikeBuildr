import { useQuery, useMutation } from "@tanstack/react-query";
import { Trail } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useFavorites() {
  const { toast } = useToast();

  const { data: favorites = [], isLoading } = useQuery<Trail[]>({
    queryKey: ["/api/user/favorites"],
    queryFn: async () => {
      const response = await fetch("/api/user/favorites");
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
  });

  const addToFavorites = useMutation({
    mutationFn: async (trailId: number) => {
      const response = await fetch(`/api/trails/${trailId}/favorite`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to add to favorites");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
      toast({
        title: "Trail saved",
        description: "Trail has been added to your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save trail",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromFavorites = useMutation({
    mutationFn: async (trailId: number) => {
      const response = await fetch(`/api/trails/${trailId}/favorite`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to remove from favorites");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
      toast({
        title: "Trail removed",
        description: "Trail has been removed from your favorites",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove trail",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isFavorite = (trailId: number) => {
    return favorites.some(trail => trail.id === trailId);
  };

  return {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
  };
}
