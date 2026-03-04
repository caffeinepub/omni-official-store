import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LeaderboardEntry {
    user: Principal;
    totalDiamonds: bigint;
}
export type Time = bigint;
export interface Game {
    id: bigint;
    name: string;
    description: string;
}
export interface DiamondPackage {
    id: bigint;
    diamondAmount: bigint;
    name: string;
    gameId: bigint;
    price: bigint;
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
export interface UserProfile {
    name: string;
    email?: string;
}
export enum OrderStatus {
    pending = "pending",
    completed = "completed",
    failed = "failed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addPackage(gameId: bigint, name: string, diamondAmount: bigint, price: bigint): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    creditWallet(user: Principal, amount: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGames(): Promise<Array<Game>>;
    getLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getOrders(): Promise<Array<Order>>;
    getPackages(gameId: bigint): Promise<Array<DiamondPackage>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWalletBalance(): Promise<bigint>;
    isCallerAdmin(): Promise<boolean>;
    placeOrder(playerId: string, gameId: bigint, packageId: bigint): Promise<bigint>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateOrderStatus(orderId: bigint, status: OrderStatus): Promise<void>;
}
