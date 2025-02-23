import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapView } from "@/components/map-view";
import { SearchBar } from "@/components/search-bar";
import { TrailCard } from "@/components/trail-card";
import { Trail } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: trails, isLoading } = useQuery<Trail[]>({
    queryKey: [searchQuery ? `/api/trails/search?q=${searchQuery}` : "/api/trails"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">
          Discover Amazing Trails
        </h1>

        <SearchBar onSearch={setSearchQuery} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className="lg:col-span-1 h-[600px]">
            <MapView trails={trails || []} />
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
                <TrailCard key={trail.id} trail={trail} />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}