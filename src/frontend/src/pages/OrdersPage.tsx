import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  Package,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { OrderStatus } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetOrders } from "../hooks/useQueries";
import { handleLogin } from "../utils/mobileLogin";

const gameNames: Record<string, string> = {
  "1": "Mobile Legends: Bang Bang",
  "2": "Honor of Kings",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === OrderStatus.completed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold badge-completed">
        <CheckCircle2 className="w-3 h-3" />
        Completed
      </span>
    );
  }
  if (status === OrderStatus.failed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold badge-failed">
        <XCircle className="w-3 h-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold badge-pending">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

function formatDate(timestamp: bigint): string {
  // timestamp is in nanoseconds for Motoko Time
  const ms = Number(timestamp / 1_000_000n);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

export function OrdersPage() {
  const { data: orders, isLoading } = useGetOrders();
  const { login, identity } = useInternetIdentity();
  const isLoggedIn = !!identity;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-xl font-black mb-2">
            Login Required
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Please login to view your orders
          </p>
          <Button
            onClick={() => handleLogin(login)}
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
    <div className="min-h-screen container mx-auto px-4 max-w-4xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black">
            My Orders
          </h1>
          <p className="text-sm text-muted-foreground">Transaction history</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {["sk1", "sk2", "sk3"].map((k) => (
            <Skeleton key={k} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div
          data-ocid="order.list"
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <Package className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <h3 className="font-display text-lg font-black mb-2">
            No orders yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Your diamond top-up orders will appear here
          </p>
        </div>
      ) : (
        <div data-ocid="order.list" className="space-y-3">
          {orders.map((order, i) => (
            <motion.div
              key={order.id.toString()}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              data-ocid={i === 0 ? "order.item.1" : undefined}
            >
              <Card className="card-game overflow-hidden hover:border-primary/40">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                        💎
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {gameNames[order.gameId.toString()] ??
                            `Game #${order.gameId}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Player ID:{" "}
                          <span className="font-mono text-foreground/70">
                            {order.playerId}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Order #{order.id.toString()} ·{" "}
                          {formatDate(order.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
