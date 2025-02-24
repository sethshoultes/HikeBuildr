import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { NavHeader } from "@/components/nav-header";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import TrailDetails from "@/pages/trail-details";
import ProfilePage from "@/pages/profile-page";
import AdminPage from "@/pages/admin-page";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route path="/admin" component={AdminPage} />
        <ProtectedRoute path="/trail/:id" component={TrailDetails} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;