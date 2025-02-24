import { Button } from "@/components/ui/button";
import { Heart, HeartOff } from "lucide-react";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

interface FavoriteButtonProps {
  trailId: number;
  variant?: "icon" | "default";
}

export function FavoriteButton({ trailId, variant = "default" }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();
  const isFavorited = isFavorite(trailId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent event bubbling to parent Link component
    e.stopPropagation();

    if (!user) {
      navigate("/auth");
      return;
    }

    if (isFavorited) {
      removeFromFavorites.mutate(trailId);
    } else {
      addToFavorites.mutate(trailId);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background/90 z-10"
      >
        {isFavorited ? (
          <Heart className="h-[1.2rem] w-[1.2rem] fill-red-500 text-red-500" />
        ) : (
          <Heart className="h-[1.2rem] w-[1.2rem]" />
        )}
        <span className="sr-only">
          {isFavorited ? "Remove from favorites" : "Add to favorites"}
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant={isFavorited ? "destructive" : "secondary"}
      onClick={handleClick}
      className="w-full"
    >
      {isFavorited ? (
        <>
          <HeartOff className="mr-2 h-4 w-4" />
          Remove from Favorites
        </>
      ) : (
        <>
          <Heart className="mr-2 h-4 w-4" />
          Add to Favorites
        </>
      )}
    </Button>
  );
}