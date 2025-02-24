import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { Home, BarChart2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

// Custom navigation item component to prevent nested anchors
const NavItem = ({ href, icon: Icon, children, isActive }: { 
  href: string;
  icon: any;
  children: React.ReactNode;
  isActive: boolean;
}) => (
  <NavigationMenuItem>
    <Link href={href}>
      <button
        className={cn(
          navigationMenuTriggerStyle(),
          isActive && "bg-accent",
          "w-full flex items-center"
        )}
      >
        <Icon className="h-4 w-4 mr-2" />
        {children}
      </button>
    </Link>
  </NavigationMenuItem>
);

export function NavHeader() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavItem 
              href="/" 
              icon={Home} 
              isActive={location === "/"}>
              Home
            </NavItem>

            {user && (
              <NavItem 
                href="/profile" 
                icon={User} 
                isActive={location === "/profile"}>
                Profile
              </NavItem>
            )}

            {user?.role === "admin" && (
              <NavItem 
                href="/admin" 
                icon={BarChart2} 
                isActive={location === "/admin"}>
                Admin Dashboard
              </NavItem>
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