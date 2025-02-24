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
    <div className="min-h-screen bg-background text-foreground">
      <NavHeader />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <ProtectedRoute path="/admin" component={AdminPage} />
        <Route path="/trail/:id" component={TrailDetails} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('App initialization error:', error);
    return <div>Something went wrong. Please refresh the page.</div>;
  }
}

export default App;