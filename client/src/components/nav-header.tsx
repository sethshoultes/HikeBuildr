import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Home, BarChart2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NavHeader() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/">
                <NavigationMenuLink
                  asChild
                  className={cn(
                    navigationMenuTriggerStyle(),
                    location === "/" && "bg-accent"
                  )}
                >
                  <span>
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </span>
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            {user && (
              <NavigationMenuItem>
                <Link href="/profile">
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),
                      location === "/profile" && "bg-accent"
                    )}
                  >
                    <span>
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </span>
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}

            {user?.role === "admin" && (
              <NavigationMenuItem>
                <Link href="/admin">
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),
                      location === "/admin" && "bg-accent"
                    )}
                  >
                    <span>
                      <BarChart2 className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </span>
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                Welcome, {user.username}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}