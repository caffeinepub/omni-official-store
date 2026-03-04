import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, LogIn, LogOut, Save, User } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";
import { handleLogin } from "../utils/mobileLogin";

export function AccountPage() {
  const { loginStatus, login, clear, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const isLoggedIn = !!identity;

  const { data: profile, isLoading } = useGetCallerUserProfile();
  const { mutate: saveProfile, isPending: isSaving } =
    useSaveCallerUserProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    const updatedProfile: UserProfile = {
      name: name.trim(),
      email: email.trim() || undefined,
    };
    saveProfile(updatedProfile, {
      onSuccess: () => toast.success("Profile updated successfully!"),
      onError: (err) =>
        toast.error(
          `Failed to update profile: ${err instanceof Error ? err.message : "Unknown error"}`,
        ),
    });
  };

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

      {/* Profile Form */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="card-game overflow-hidden mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display font-black">
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-3 space-y-4">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </>
            ) : (
              <>
                <div>
                  <Label
                    htmlFor="profile-name"
                    className="text-sm font-semibold mb-2 block"
                  >
                    Display Name
                  </Label>
                  <Input
                    id="profile-name"
                    placeholder="Your display name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-input/50 border-border focus:border-primary"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="profile-email"
                    className="text-sm font-semibold mb-2 block"
                  >
                    Email{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="profile-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input/50 border-border focus:border-primary"
                  />
                </div>
                <Button
                  className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 h-10"
                  onClick={handleSave}
                  disabled={isSaving}
                  data-ocid="account.profile.save_button"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </>
                  )}
                </Button>
              </>
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
