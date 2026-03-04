import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, CreditCard, Info, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetWalletBalance } from "../hooks/useQueries";

function formatBalance(balance: bigint): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(balance));
}

export function WalletPage() {
  const { data: balance, isLoading } = useGetWalletBalance();
  const { loginStatus, login } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-xl font-black mb-2">
            Login Required
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Please login to view your wallet balance
          </p>
          <Button
            onClick={login}
            data-ocid="auth.login.button"
            className="gradient-blue-gold text-white font-bold border-0"
          >
            Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen container mx-auto px-4 max-w-3xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black">
            My Wallet
          </h1>
          <p className="text-sm text-muted-foreground">
            Store credits & balance
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-ocid="wallet.balance.panel"
      >
        <Card className="card-game overflow-hidden mb-6">
          <div className="h-1 gradient-blue-gold" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            {isLoading ? (
              <Skeleton className="h-12 w-48 rounded-lg" />
            ) : (
              <>
                <div className="font-display text-4xl md:text-5xl font-black text-gradient-gold">
                  {formatBalance(balance ?? 0n)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Store credits
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Top up info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="card-game overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">
                  How to top up your wallet
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Contact admin to top up your wallet. Wallet credits can be
                  used to purchase diamond packages.
                </p>
                <div className="flex items-center gap-2 text-xs text-primary font-semibold">
                  <ArrowUpRight className="w-3 h-3" />
                  Contact admin via our official channels
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 p-4 rounded-xl border border-border bg-muted/20 text-center"
      >
        <p className="text-xs text-muted-foreground">
          Wallet balances are updated in real-time. For any discrepancies,
          please contact support.
        </p>
      </motion.div>
    </div>
  );
}
