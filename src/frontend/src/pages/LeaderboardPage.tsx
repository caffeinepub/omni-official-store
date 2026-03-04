import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gem, Medal, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useGetLeaderboard } from "../hooks/useQueries";

function truncatePrincipal(principal: { toString: () => string }): string {
  const str = principal.toString();
  if (str.length <= 16) return str;
  return `${str.slice(0, 8)}...${str.slice(-6)}`;
}

const rankStyles: Record<
  number,
  { bg: string; text: string; icon: string; border: string }
> = {
  1: {
    bg: "from-yellow-900/30 to-amber-900/20",
    text: "text-yellow-400",
    icon: "🥇",
    border: "border-yellow-500/40",
  },
  2: {
    bg: "from-gray-700/30 to-gray-800/20",
    text: "text-gray-300",
    icon: "🥈",
    border: "border-gray-400/40",
  },
  3: {
    bg: "from-amber-900/30 to-orange-900/20",
    text: "text-amber-600",
    icon: "🥉",
    border: "border-amber-600/40",
  },
};

export function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();

  return (
    <div className="min-h-screen container mx-auto px-4 max-w-3xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black">
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Top diamond collectors
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {["sk1", "sk2", "sk3", "sk4", "sk5"].map((k) => (
            <Skeleton key={k} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Trophy className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <h3 className="font-display text-lg font-black mb-2">
            No entries yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Be the first to top up and claim the leaderboard!
          </p>
        </div>
      ) : (
        <div data-ocid="leaderboard.list" className="space-y-3">
          {leaderboard.map((entry, i) => {
            const rank = i + 1;
            const style = rankStyles[rank];
            return (
              <motion.div
                key={entry.user.toString()}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                data-ocid={i === 0 ? "leaderboard.item.1" : undefined}
              >
                <Card
                  className={`overflow-hidden transition-all duration-200 ${
                    style
                      ? `bg-gradient-to-r ${style.bg} border ${style.border} hover:shadow-gold`
                      : "card-game"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="shrink-0 w-10 text-center">
                        {style ? (
                          <span className="text-2xl">{style.icon}</span>
                        ) : (
                          <span className="font-display text-lg font-black text-muted-foreground">
                            #{rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar placeholder */}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          style
                            ? `${style.text} bg-white/10`
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {entry.user.toString().slice(0, 2).toUpperCase()}
                      </div>

                      {/* User info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-foreground/80 truncate">
                          {truncatePrincipal(entry.user)}
                        </div>
                        {rank <= 3 && (
                          <div
                            className={`text-xs font-semibold ${style?.text}`}
                          >
                            {rank === 1
                              ? "Top Spender"
                              : rank === 2
                                ? "Runner Up"
                                : "3rd Place"}
                          </div>
                        )}
                      </div>

                      {/* Diamonds */}
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Gem className="w-4 h-4 text-primary" />
                          <span
                            className={`font-display text-base font-black ${
                              style ? style.text : "text-foreground"
                            }`}
                          >
                            {Number(entry.totalDiamonds).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          diamonds
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Medal legend */}
      <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Medal className="w-3 h-3 text-yellow-400" /> Gold
        </div>
        <div className="flex items-center gap-1">
          <Medal className="w-3 h-3 text-gray-300" /> Silver
        </div>
        <div className="flex items-center gap-1">
          <Medal className="w-3 h-3 text-amber-600" /> Bronze
        </div>
      </div>
    </div>
  );
}
