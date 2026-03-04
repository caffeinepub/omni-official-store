import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
  // Old types
  type OrderStatus = {
    #pending;
    #completed;
    #failed;
  };

  type Order = {
    id : Nat;
    user : Principal.Principal;
    playerId : Text;
    gameId : Nat;
    packageId : Nat;
    status : OrderStatus;
    timestamp : Time.Time;
  };

  type RedeemCode = {
    code : Text;
    amount : Nat;
    redeemed : Bool;
    createdAt : Time.Time;
    redeemedBy : ?Principal;
  };

  type OldActor = {
    nextOrderId : Nat;
    nextPackageId : Nat;
    userProfiles : Map.Map<Principal, { name : Text; email : ?Text }>;
    games : Map.Map<Nat, { id : Nat; name : Text; description : Text }>;
    packages : Map.Map<Nat, { id : Nat; gameId : Nat; name : Text; diamondAmount : Nat; price : Nat }>;
    orders : Map.Map<Nat, Order>;
    wallets : Map.Map<Principal, Nat>;
    diamondsPurchased : Map.Map<Principal, Nat>;
    redeemCodes : Map.Map<Text, RedeemCode>;
  };

  // New types for TopUp system
  type PaymentMethod = {
    #upi;
    #bank;
  };

  type TopUpRequestStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type TopUpRequest = {
    id : Nat;
    user : Principal.Principal;
    amount : Nat;
    paymentMethod : PaymentMethod;
    utrRef : Text;
    status : TopUpRequestStatus;
    createdAt : Time.Time;
  };

  type NewActor = {
    nextOrderId : Nat;
    nextPackageId : Nat;
    nextTopUpRequestId : Nat;
    userProfiles : Map.Map<Principal, { name : Text; email : ?Text }>;
    games : Map.Map<Nat, { id : Nat; name : Text; description : Text }>;
    packages : Map.Map<Nat, { id : Nat; gameId : Nat; name : Text; diamondAmount : Nat; price : Nat }>;
    orders : Map.Map<Nat, Order>;
    wallets : Map.Map<Principal, Nat>;
    diamondsPurchased : Map.Map<Principal, Nat>;
    redeemCodes : Map.Map<Text, RedeemCode>;
    topUpRequests : Map.Map<Nat, TopUpRequest>;
    paymentConfig : ?{ upiId : ?Text; bankName : ?Text; accountNumber : ?Text; accountHolder : ?Text; ifscCode : ?Text };
  };

  // Migration function
  public func run(old : OldActor) : NewActor {
    {
      old with
      nextTopUpRequestId = 1 : Nat;
      topUpRequests = Map.empty<Nat, TopUpRequest>();
      paymentConfig = null;
    };
  };
};
