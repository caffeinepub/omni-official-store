import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DiamondPackage,
  LeaderboardEntry,
  Order,
  UserProfile,
} from "../backend.d";
import { useActor } from "./useActor";

export function useGetPackages(gameId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<DiamondPackage[]>({
    queryKey: ["packages", gameId.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPackages(gameId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetWalletBalance() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["walletBalance"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getWalletBalance();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetLeaderboard() {
  const { actor, isFetching } = useActor();
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile | null>({
    queryKey: ["callerUserProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePlaceOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      playerId,
      gameId,
      packageId,
    }: {
      playerId: string;
      gameId: bigint;
      packageId: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.placeOrder(playerId, gameId, packageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerUserProfile"] });
    },
  });
}
