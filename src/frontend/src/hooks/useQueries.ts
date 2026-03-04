import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { backendInterface } from "../backend";
import type {
  Banner,
  DiamondPackage,
  Game,
  LeaderboardEntry,
  Order,
  OrderStatus,
  PaymentConfig,
  PaymentMethod,
  RedeemCode,
  SiteConfig,
  TopUpRequest,
  UserProfile,
  UserStats,
} from "../backend.d";
import { ensureAdmin } from "../utils/adminAuth";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

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
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
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
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
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
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
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
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
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
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  return {
    isFetchingActor: isFetching,
    ...useMutation({
      mutationFn: async (profile: UserProfile) => {
        if (!identity) throw new Error("Not connected");
        const principalStr = identity.getPrincipal().toString();
        const cachedActor =
          queryClient.getQueryData<backendInterface>(["actor", principalStr]) ??
          actor;
        if (!cachedActor) throw new Error("Not connected");
        // Ensure user is registered before saving profile
        try {
          await (cachedActor as any)._initializeAccessControlWithSecret("");
        } catch {
          // ignore — user may already be registered
        }
        return cachedActor.saveCallerUserProfile(profile);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["callerUserProfile"] });
      },
    }),
  };
}

// ─── Admin Hooks ──────────────────────────────────────────────────────────────

export function useUpgradeToAdmin() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminToken: string) => {
      if (!actor) throw new Error("Not connected");
      // First try normal initialization (works for brand new principals)
      try {
        await actor._initializeAccessControlWithSecret(adminToken);
      } catch {
        // ignore — principal may already be registered
      }
      // Then upgrade to admin in case principal was previously registered as user
      return actor.upgradeToAdmin(adminToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
    },
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  // Include the principal in the query key so the result is never served from
  // cache when the logged-in user changes (e.g. after Internet Identity redirect).
  const principalKey = identity?.getPrincipal().toString() ?? "anon";
  return useQuery<boolean>({
    queryKey: ["isAdmin", principalKey],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    // Never serve a cached false — always re-check when the actor or identity changes
    staleTime: 0,
  });
}

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["allOrders"],
    queryFn: async () => {
      if (!actor) return [];
      await ensureAdmin(actor);
      return actor.getAllOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: bigint;
      status: OrderStatus;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useAddPackage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameId,
      name,
      diamondAmount,
      price,
    }: {
      gameId: bigint;
      name: string;
      diamondAmount: bigint;
      price: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.addPackage(gameId, name, diamondAmount, price);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useUpdatePackage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      packageId,
      name,
      diamondAmount,
      price,
    }: {
      packageId: bigint;
      name: string;
      diamondAmount: bigint;
      price: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.updatePackage(packageId, name, diamondAmount, price);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useRemovePackage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (packageId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.removePackage(packageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
  });
}

export function useCreditWallet() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      user,
      amount,
    }: {
      user: Principal;
      amount: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.creditWallet(user, amount);
    },
  });
}

// ─── Redeem Code Hooks ────────────────────────────────────────────────────────

export function useGetAllRedeemCodes() {
  const { actor, isFetching } = useActor();
  return useQuery<RedeemCode[]>({
    queryKey: ["redeemCodes"],
    queryFn: async () => {
      if (!actor) return [];
      await ensureAdmin(actor);
      return actor.getAllRedeemCodes();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGenerateRedeemCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      codeLength,
    }: {
      amount: bigint;
      codeLength: bigint;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.generateRedeemCode(amount, codeLength);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redeemCodes"] });
    },
  });
}

export function useRedeemCode() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      if (!actor) throw new Error("Not connected");
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
      return actor.redeemCode(code);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      queryClient.invalidateQueries({ queryKey: ["redeemCodes"] });
    },
  });
}

// ─── Payment / TopUp Hooks ────────────────────────────────────────────────────

export function useGetPaymentConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentConfig | null>({
    queryKey: ["paymentConfig"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPaymentConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTopUpRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      paymentMethod,
      utrRef,
    }: {
      amount: bigint;
      paymentMethod: PaymentMethod;
      utrRef: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
      return actor.createTopUpRequest(amount, paymentMethod, utrRef);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTopUpRequests"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useGetMyTopUpRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<TopUpRequest[]>({
    queryKey: ["myTopUpRequests"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        await (actor as any)._initializeAccessControlWithSecret("");
      } catch {
        // ignore — user may already be registered
      }
      return actor.getMyTopUpRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllTopUpRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<TopUpRequest[]>({
    queryKey: ["allTopUpRequests"],
    queryFn: async () => {
      if (!actor) return [];
      await ensureAdmin(actor);
      return actor.getAllTopUpRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveTopUpRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.approveTopUpRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTopUpRequests"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
    },
  });
}

export function useRejectTopUpRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.rejectTopUpRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allTopUpRequests"] });
    },
  });
}

export function useSetPaymentConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newConfig: PaymentConfig) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.setPaymentConfig(newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentConfig"] });
    },
  });
}

// ─── Games Hooks ──────────────────────────────────────────────────────────────

export function useGetGames() {
  const { actor, isFetching } = useActor();
  return useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getGames();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddGame() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      currency,
    }: {
      name: string;
      description: string;
      currency: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.addGame(name, description, currency);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
  });
}

export function useUpdateGame() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      gameId,
      name,
      description,
      currency,
      inStock,
    }: {
      gameId: bigint;
      name: string;
      description: string;
      currency: string;
      inStock: boolean;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.updateGame(gameId, name, description, currency, inStock);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
  });
}

export function useRemoveGame() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gameId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.removeGame(gameId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["games"] });
    },
  });
}

// ─── Banners Hooks ────────────────────────────────────────────────────────────

export function useGetBanners() {
  const { actor, isFetching } = useActor();
  return useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBanners();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddBanner() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      imageUrl,
      title,
      subtitle,
      ctaText,
      ctaLink,
    }: {
      imageUrl: string;
      title: string;
      subtitle: string;
      ctaText: string;
      ctaLink: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.addBanner(imageUrl, title, subtitle, ctaText, ctaLink);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
  });
}

export function useUpdateBanner() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bannerId,
      imageUrl,
      title,
      subtitle,
      ctaText,
      ctaLink,
    }: {
      bannerId: bigint;
      imageUrl: string;
      title: string;
      subtitle: string;
      ctaText: string;
      ctaLink: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.updateBanner(
        bannerId,
        imageUrl,
        title,
        subtitle,
        ctaText,
        ctaLink,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
  });
}

export function useRemoveBanner() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bannerId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.removeBanner(bannerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] });
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
  });
}

// ─── Site Config Hooks ────────────────────────────────────────────────────────

export function useGetSiteConfig() {
  const { actor, isFetching } = useActor();
  return useQuery<SiteConfig | null>({
    queryKey: ["siteConfig"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getSiteConfig();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetSiteConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newConfig: SiteConfig) => {
      if (!actor) throw new Error("Not connected");
      await ensureAdmin(actor);
      return actor.setSiteConfig(newConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
  });
}

// ─── User Stats Hook ──────────────────────────────────────────────────────────

export function useGetUserStats() {
  const { actor, isFetching } = useActor();
  return useQuery<UserStats | null>({
    queryKey: ["userStats"],
    queryFn: async () => {
      if (!actor) return null;
      await ensureAdmin(actor);
      return actor.getUserStats();
    },
    enabled: !!actor && !isFetching,
  });
}
