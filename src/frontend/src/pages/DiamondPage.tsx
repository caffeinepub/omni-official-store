import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Gem, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { DiamondPackage } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetPackages, usePlaceOrder } from "../hooks/useQueries";
import { handleLogin } from "../utils/mobileLogin";

const gameInfo: Record<
  string,
  { name: string; color: string; image: string; gameId: bigint }
> = {
  mlbb: {
    name: "Mobile Legends: Bang Bang",
    color: "from-blue-600/20 to-indigo-900/30",
    image: "/assets/generated/game-mlbb.dim_400x300.jpg",
    gameId: 1n,
  },
  hok: {
    name: "Honor of Kings",
    color: "from-red-600/20 to-amber-900/30",
    image: "/assets/generated/game-hok.dim_400x300.jpg",
    gameId: 2n,
  },
};

function formatPrice(price: bigint): string {
  const num = Number(price);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

const ocidMap: Record<number, string> = {
  0: "diamond.package.item.1",
  1: "diamond.package.item.2",
  2: "diamond.package.item.3",
  3: "diamond.package.item.4",
  4: "diamond.package.item.5",
  5: "diamond.package.item.6",
  6: "diamond.package.item.7",
  7: "diamond.package.item.8",
};

export function DiamondPage() {
  const params = useParams({ from: "/game/$gameId" });
  const gameId = params.gameId as string;
  const game = gameInfo[gameId] ?? gameInfo.mlbb;

  const [selectedPackage, setSelectedPackage] = useState<DiamondPackage | null>(
    null,
  );
  const [playerId, setPlayerId] = useState("");

  const { data: packages, isLoading } = useGetPackages(game.gameId);
  const { mutate: placeOrder, isPending } = usePlaceOrder();
  const { loginStatus, login, identity } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";

  const handleTopUp = () => {
    if (!isLoggedIn) {
      toast.error("Please login first to place an order");
      return;
    }
    if (!selectedPackage) {
      toast.error("Please select a diamond package");
      return;
    }
    if (!playerId.trim()) {
      toast.error("Please enter your Player ID");
      return;
    }

    placeOrder(
      {
        playerId: playerId.trim(),
        gameId: game.gameId,
        packageId: selectedPackage.id,
      },
      {
        onSuccess: (orderId) => {
          toast.success(
            `Order #${orderId} placed successfully! Diamonds will be credited shortly.`,
          );
          setPlayerId("");
          setSelectedPackage(null);
        },
        onError: (err) => {
          toast.error(
            `Order failed: ${err instanceof Error ? err.message : "Unknown error"}`,
          );
        },
      },
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div
        className={`relative overflow-hidden bg-gradient-to-br ${game.color} border-b border-border`}
      >
        <div className="absolute inset-0 opacity-20">
          <img
            src={game.image}
            alt={game.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative container mx-auto px-4 max-w-7xl py-10">
          <div className="flex items-center gap-3 mb-2">
            <Gem className="w-6 h-6 text-primary" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Diamond Top Up
            </span>
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-black">
            {game.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Select a package, enter your Player ID, and top up instantly
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-8">
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                Login required to place orders
              </p>
              <p className="text-xs text-muted-foreground">
                Please login with Internet Identity to top up
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleLogin(login)}
              data-ocid="auth.login.button"
              className="gradient-blue-gold text-white font-bold border-0"
            >
              Login
            </Button>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Package Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 gradient-blue-gold rounded-full" />
              <h2 className="font-display text-lg font-black">
                Select Package
              </h2>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6", "sk7", "sk8"].map(
                  (k) => (
                    <Skeleton key={k} className="h-28 rounded-xl" />
                  ),
                )}
              </div>
            ) : !packages || packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Gem className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-semibold">
                  No packages available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check back later for available packages
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {packages.map((pkg, index) => (
                  <motion.div
                    key={pkg.id.toString()}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => setSelectedPackage(pkg)}
                    data-ocid={
                      ocidMap[index] ?? `diamond.package.item.${index + 1}`
                    }
                    className={`diamond-package-card rounded-xl p-4 text-center ${
                      selectedPackage?.id === pkg.id ? "selected" : ""
                    }`}
                  >
                    {selectedPackage?.id === pkg.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div className="text-2xl mb-1">💎</div>
                    <div className="font-display text-lg font-black text-gradient-gold">
                      {Number(pkg.diamondAmount).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground mb-2">
                      {pkg.name}
                    </div>
                    <div className="text-xs font-bold text-foreground/90">
                      {formatPrice(pkg.price)}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Order Panel */}
          <div className="lg:col-span-1">
            <Card className="card-game sticky top-20">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-5 gradient-blue-gold rounded-full" />
                  <h2 className="font-display text-base font-black">
                    Order Details
                  </h2>
                </div>

                {/* Selected Package Summary */}
                <div
                  className={`rounded-lg p-3 mb-4 text-center transition-all ${
                    selectedPackage
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/30 border border-border"
                  }`}
                >
                  {selectedPackage ? (
                    <>
                      <div className="text-3xl mb-1">💎</div>
                      <div className="font-display text-xl font-black text-gradient-gold">
                        {Number(selectedPackage.diamondAmount).toLocaleString()}{" "}
                        Diamonds
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {selectedPackage.name}
                      </div>
                      <div className="font-bold text-foreground mt-1">
                        {formatPrice(selectedPackage.price)}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-2">
                      No package selected
                    </p>
                  )}
                </div>

                {/* Player ID Input */}
                <div className="mb-5">
                  <Label
                    htmlFor="player-id"
                    className="text-sm font-semibold mb-2 block"
                  >
                    Player ID / User ID
                  </Label>
                  <Input
                    id="player-id"
                    placeholder="Enter your in-game ID"
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    data-ocid="diamond.playerid.input"
                    className="bg-input/50 border-border focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your ID in the game settings
                  </p>
                </div>

                {/* Submit */}
                <Button
                  className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue h-11"
                  onClick={handleTopUp}
                  disabled={isPending || !selectedPackage || !playerId.trim()}
                  data-ocid="diamond.topup.submit_button"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Gem className="w-4 h-4 mr-2" />
                      Top Up Now
                    </>
                  )}
                </Button>

                {identity && (
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Logged in as:{" "}
                    {identity.getPrincipal().toString().slice(0, 16)}...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
