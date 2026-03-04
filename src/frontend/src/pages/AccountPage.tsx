import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Edit, LogIn, LogOut, Mail, User } from "lucide-react";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { handleLogin } from "../utils/mobileLogin";

export function AccountPage() {
  const { loginStatus, login, clear, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const isLoggedIn = !!identity;
  const navigate = useNavigate();

  const { data: profile, isLoading } = useGetCallerUserProfile();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-8 max-w-sm w-full"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-black mb-2">
            Welcome Back
          </h2>
          <p className="text-muted-foreground text-sm mb-1">
            Sign in to access your account
          </p>
          <p className="text-xs text-muted-foreground/70 mb-6">
            Supports Google, passkey, or phone number via Internet Identity
          </p>
          <Button
            className="w-full gradient-blue-gold text-white font-bold border-0 glow-blue h-11"
            onClick={() => handleLogin(login)}
            disabled={isLoggingIn || isInitializing}
            data-ocid="auth.login.button"
          >
            {isLoggingIn || isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isInitializing ? "Loading..." : "Connecting..."}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </Button>
          {loginStatus === "loginError" && (
            <p className="text-xs text-destructive mt-3 text-center">
              Login failed. Please try again.
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-4 max-w-2xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black">
            My Account
          </h1>
          <p className="text-sm text-muted-foreground">Manage your profile</p>
        </div>
      </div>

      {/* Principal display */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="card-game overflow-hidden mb-6">
          <div className="h-1 gradient-blue-gold" />
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center font-bold text-sm text-primary shrink-0">
                {identity?.getPrincipal().toString().slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold mb-0.5">Principal ID</div>
                <div className="font-mono text-xs text-muted-foreground break-all">
                  {identity?.getPrincipal().toString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Summary */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="card-game overflow-hidden mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-display font-black">
                Profile Information
              </CardTitle>
              <Button
                size="sm"
                className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 h-8 px-3 text-xs gap-1.5"
                onClick={() => navigate({ to: "/profile/edit" })}
                data-ocid="account.edit_profile.button"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Display Name
                    </div>
                    <div className="text-sm font-semibold">
                      {profile?.name || (
                        <span className="text-muted-foreground italic font-normal">
                          Not set
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">
                      Email
                    </div>
                    <div className="text-sm font-semibold">
                      {profile?.email || (
                        <span className="text-muted-foreground italic font-normal">
                          Not set
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          variant="outline"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
          onClick={clear}
          data-ocid="auth.logout.button"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </motion.div>
    </div>
  );
}
