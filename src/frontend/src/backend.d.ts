import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UserProfile {
    name: string;
    email?: string;
}
export interface LeaderboardEntry {
    user: Principal;
    totalDiamonds: bigint;
}
export interface Game {
    id: bigint;
    inStock: boolean;
    name: string;
    description: string;
    currency: string;
}
export type Time = bigint;
export interface SiteConfig {
    backgroundColor: string;
    tagline: string;
    primaryColor: string;
    banners: Array<Banner>;
    discountPercent: bigint;
    siteName: string;
    promoText: string;
    logoUrl: string;
    featuredSectionHeading: string;
    footerText: string;
}
export interface TopUpRequest {
    id: bigint;
    status: TopUpRequestStatus;
    paymentMethod: PaymentMethod;
    createdAt: Time;
    user: Principal;
    amount: bigint;
    utrRef: string;
}
export interface Order {
    id: bigint;
    status: OrderStatus;
    playerId: string;
    user: Principal;
    gameId: bigint;
    timestamp: Time;
    packageId: bigint;
}
export interface Banner {
    id: bigint;
    title: string;
    ctaLink: string;
    imageUrl: string;
    ctaText: string;
    subtitle: string;
}
export interface DiamondPackage {
    id: bigint;
    diamondAmount: bigint;
    name: string;
    gameId: bigint;
    price: bigint;
}
export interface RedeemCode {
    redeemedBy?: Principal;
    code: string;
    redeemed: boolean;
    createdAt: Time;
    amount: bigint;
}
export interface UserStats {
    totalOrders: bigint;
    usersThisMonth: bigint;
    activeCustomers: bigint;
    pendingOrders: bigint;
    pendingTopUps: bigint;
    completedOrders: bigint;
    totalUsers: bigint;
    totalRevenue: bigint;
}
export interface PaymentConfig {
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    accountNumber?: string;
    accountHolder?: string;
}
export enum OrderStatus {
    pending = "pending",
    completed = "completed",
    failed = "failed"
}
export enum PaymentMethod {
    upi = "upi",
    bank = "bank"
}
export enum TopUpRequestStatus {
    pending = "pending",
    approved = "approved",
    rejected = "rejected"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBanner(imageUrl: string, title: string, subtitle: string, ctaText: string, ctaLink: string): Promise<bigint>;
    addGame(name: string, description: string, currency: string): Promise<bigint>;
    addPackage(gameId: bigint, name: string, diamondAmount: bigint, price: bigint): Promise<bigint>;
    approveTopUpRequest(requestId: bigint): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createTopUpRequest(amount: bigint, paymentMethod: PaymentMethod, utrRef: string): Promise<bigint>;
    creditWallet(user: Principal, amount: bigint): Promise<void>;
    generateRedeemCode(amount: bigint, codeLength: bigint): Promise<string>;
    getAllOrders(): Promise<Array<Order>>;
    getAllRedeemCodes(): Promise<Array<RedeemCode>>;
    getAllTopUpRequests(): Promise<Array<TopUpRequest>>;
    getBanners(): Promise<Array<Banner>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGames(): Promise<Array<Game>>;
    getLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getMyTopUpRequests(): Promise<Array<TopUpRequest>>;
    getOrders(): Promise<Array<Order>>;
    getPackages(gameId: bigint): Promise<Array<DiamondPackage>>;
    getPaymentConfig(): Promise<PaymentConfig | null>;
    getSiteConfig(): Promise<SiteConfig | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserStats(): Promise<UserStats>;
    getWalletBalance(): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    placeOrder(playerId: string, gameId: bigint, packageId: bigint): Promise<bigint>;
    redeemCode(code: string): Promise<bigint>;
    rejectTopUpRequest(requestId: bigint): Promise<void>;
    removeBanner(bannerId: bigint): Promise<void>;
    removeGame(gameId: bigint): Promise<void>;
    removePackage(packageId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setPaymentConfig(newConfig: PaymentConfig): Promise<void>;
    setSiteConfig(newConfig: SiteConfig): Promise<void>;
    updateBanner(bannerId: bigint, imageUrl: string, title: string, subtitle: string, ctaText: string, ctaLink: string): Promise<void>;
    updateGame(gameId: bigint, name: string, description: string, currency: string, inStock: boolean): Promise<void>;
    updateOrderStatus(orderId: bigint, status: OrderStatus): Promise<void>;
    updatePackage(packageId: bigint, name: string, diamondAmount: bigint, price: bigint): Promise<void>;
    upgradeToAdmin(userProvidedToken: string): Promise<boolean>;
}
