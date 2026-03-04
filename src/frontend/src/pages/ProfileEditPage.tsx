import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Save,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useSaveCallerUserProfile,
} from "../hooks/useQueries";

export function ProfileEditPage() {
  const { identity } = useInternetIdentity();
  const isLoggedIn = !!identity;
  const navigate = useNavigate();

  const { data: profile, isLoading } = useGetCallerUserProfile();
  const {
    mutate: saveProfile,
    isPending: isSaving,
    isFetchingActor,
  } = useSaveCallerUserProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setEmail(profile.email ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    setNameError("");
    if (!name.trim()) {
      setNameError("Display name is required");
      return;
    }

    const updatedProfile: UserProfile = {
      name: name.trim(),
      email: email.trim() || undefined,
    };

    saveProfile(updatedProfile, {
      onSuccess: () => {
        setSaved(true);
        toast.success("Profile updated successfully!");
        setTimeout(() => {
          navigate({ to: "/account" });
        }, 1000);
      },
      onError: (err) => {
        toast.error(
          `Failed to update profile: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      },
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
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="font-display text-xl font-black mb-2">
            Sign In Required
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            You need to be signed in to edit your profile.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate({ to: "/account" })}
            data-ocid="profile_edit.cancel.button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Account
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-4 max-w-2xl py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl hover:bg-primary/10 shrink-0"
          onClick={() => navigate({ to: "/account" })}
          data-ocid="profile_edit.cancel.button"
          aria-label="Back to account"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black">
            Edit Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Update your display name and email
          </p>
        </div>
      </div>

      {/* Loading skeleton */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-ocid="profile_edit.loading_state"
          >
            <Card className="card-game overflow-hidden">
              <div className="h-1 gradient-blue-gold" />
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
                <div className="flex gap-3 pt-1">
                  <Skeleton className="h-10 flex-1 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : saved ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
            data-ocid="profile_edit.success_state"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center"
            >
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </motion.div>
            <p className="font-display text-lg font-black text-center">
              Profile Updated!
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your account…
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="card-game overflow-hidden">
              <div className="h-1 gradient-blue-gold" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display font-black">
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-3 space-y-5">
                {/* Name field */}
                <div>
                  <Label
                    htmlFor="edit-name"
                    className="text-sm font-semibold mb-2 flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-primary" />
                    Display Name
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    id="edit-name"
                    placeholder="Your display name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError("");
                    }}
                    className={`bg-input/50 border-border focus:border-primary transition-colors ${
                      nameError
                        ? "border-destructive focus:border-destructive"
                        : ""
                    }`}
                    autoComplete="name"
                    data-ocid="profile_edit.name.input"
                    aria-describedby={nameError ? "name-error" : undefined}
                    aria-invalid={!!nameError}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                  />
                  <AnimatePresence>
                    {nameError && (
                      <motion.p
                        id="name-error"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-xs text-destructive mt-1.5 font-medium"
                        role="alert"
                      >
                        {nameError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Email field */}
                <div>
                  <Label
                    htmlFor="edit-email"
                    className="text-sm font-semibold mb-2 flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    Email
                    <span className="text-muted-foreground font-normal text-xs ml-1">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input/50 border-border focus:border-primary transition-colors"
                    autoComplete="email"
                    data-ocid="profile_edit.email.input"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                    }}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <Button
                    className="flex-1 gradient-blue-gold text-white font-bold border-0 hover:opacity-90 h-10"
                    onClick={handleSave}
                    disabled={isSaving || isFetchingActor}
                    data-ocid="profile_edit.save.submit_button"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : isFetchingActor ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-24 border-border hover:bg-muted/50"
                    onClick={() => navigate({ to: "/account" })}
                    disabled={isSaving}
                    data-ocid="profile_edit.cancel.button"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
