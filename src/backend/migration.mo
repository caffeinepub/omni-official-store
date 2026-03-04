import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import List "mo:core/List";

module {
  // Old Types
  type OldUserProfile = {
    name : Text;
    email : ?Text;
  };

  type OldGame = {
    id : Nat;
    name : Text;
    description : Text;
  };

  type OldDiamondPackage = {
    id : Nat;
    gameId : Nat;
    name : Text;
    diamondAmount : Nat;
    price : Nat;
  };

  type OrderStatus = {
    #pending;
    #completed;
    #failed;
  };

  type OldOrder = {
    id : Nat;
    user : Principal;
    playerId : Text;
    gameId : Nat;
    packageId : Nat;
    status : OrderStatus;
    timestamp : Time.Time;
  };

  type OldLeaderboardEntry = {
    user : Principal;
    totalDiamonds : Nat;
  };

  type OldRedeemCode = {
    code : Text;
    amount : Nat;
    redeemed : Bool;
    createdAt : Time.Time;
    redeemedBy : ?Principal;
  };

  type PaymentConfig = {
    upiId : ?Text;
    bankName : ?Text;
    accountNumber : ?Text;
    accountHolder : ?Text;
    ifscCode : ?Text;
  };

  type PaymentMethod = {
    #upi;
    #bank;
  };

  type TopUpRequestStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type OldTopUpRequest = {
    id : Nat;
    user : Principal;
    amount : Nat;
    paymentMethod : PaymentMethod;
    utrRef : Text;
    status : TopUpRequestStatus;
    createdAt : Time.Time;
  };

  // New Types
  type NewGame = {
    id : Nat;
    name : Text;
    description : Text;
    currency : Text;
    inStock : Bool;
  };

  type NewBanner = {
    id : Nat;
    imageUrl : Text;
    title : Text;
    subtitle : Text;
    ctaText : Text;
    ctaLink : Text;
  };

  type NewSiteConfig = {
    siteName : Text;
    tagline : Text;
    logoUrl : Text;
    featuredSectionHeading : Text;
    footerText : Text;
    discountPercent : Nat;
    promoText : Text;
    primaryColor : Text;
    backgroundColor : Text;
    banners : [NewBanner];
  };

  // Old Actor State
  type OldActor = {
    nextOrderId : Nat;
    nextPackageId : Nat;
    nextTopUpRequestId : Nat;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    games : Map.Map<Nat, OldGame>;
    packages : Map.Map<Nat, OldDiamondPackage>;
    orders : Map.Map<Nat, OldOrder>;
    wallets : Map.Map<Principal, Nat>;
    diamondsPurchased : Map.Map<Principal, Nat>;
    redeemCodes : Map.Map<Text, OldRedeemCode>;
    topUpRequests : Map.Map<Nat, OldTopUpRequest>;
    paymentConfig : ?PaymentConfig;
  };

  // New Actor State
  type NewActor = {
    nextOrderId : Nat;
    nextPackageId : Nat;
    nextTopUpRequestId : Nat;
    nextGameId : Nat;
    nextBannerId : Nat;
    userProfiles : Map.Map<Principal, OldUserProfile>;
    games : Map.Map<Nat, NewGame>;
    packages : Map.Map<Nat, OldDiamondPackage>;
    orders : Map.Map<Nat, OldOrder>;
    wallets : Map.Map<Principal, Nat>;
    diamondsPurchased : Map.Map<Principal, Nat>;
    redeemCodes : Map.Map<Text, OldRedeemCode>;
    topUpRequests : Map.Map<Nat, OldTopUpRequest>;
    paymentConfig : ?PaymentConfig;
    banners : Map.Map<Nat, NewBanner>;
    userRegistrations : Map.Map<Principal, Time.Time>;
    siteConfig : NewSiteConfig;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate old games to new format, add seeded games (MLBB, HOK)
    let newGames = old.games.map<Nat, OldGame, NewGame>(
      func(_id, oldGame) {
        { oldGame with currency = "INR"; inStock = true };
      }
    );

    // Seed MLBB and HOK games if not present
    let hasMLBB = newGames.values().toArray().find(func(game) { game.id == 1 }) != null;
    let hasHOK = newGames.values().toArray().find(func(game) { game.id == 2 }) != null;

    let withMLBB = if (hasMLBB) { newGames } else {
      let mlbb : NewGame = {
        id = 1;
        name = "Mobile Legends";
        description = "Mobile Legends: Bang Bang official top-up.";
        currency = "INR";
        inStock = true;
      };
      let tmp = newGames.clone();
      tmp.add(1, mlbb);
      tmp;
    };

    let withHOK = if (hasHOK) { withMLBB } else {
      let hok : NewGame = {
        id = 2;
        name = "Honor of Kings";
        description = "Honor of Kings India store - recharge credits.";
        currency = "INR";
        inStock = true;
      };
      let tmp = withMLBB.clone();
      tmp.add(2, hok);
      tmp;
    };

    // Initialize new fields
    let banners = Map.empty<Nat, NewBanner>();
    let userRegistrations = Map.empty<Principal, Time.Time>();
    let siteConfig : NewSiteConfig = {
      siteName = "Omni Official Store";
      tagline = "Instant Top-Ups for Your Favorite Games";
      logoUrl = "";
      featuredSectionHeading = "Featured Packs";
      footerText = "© Omni Official Store 2024";
      discountPercent = 0;
      promoText = " ";
      primaryColor = "#3fbdf1";
      backgroundColor = "#151717";
      banners = [];
    };

    {
      nextOrderId = old.nextOrderId;
      nextPackageId = old.nextPackageId;
      nextTopUpRequestId = old.nextTopUpRequestId;
      nextGameId = 3; // Initialize to 3 during migration
      nextBannerId = 0;
      userProfiles = old.userProfiles;
      games = withHOK;
      packages = old.packages;
      orders = old.orders;
      wallets = old.wallets;
      diamondsPurchased = old.diamondsPurchased;
      redeemCodes = old.redeemCodes;
      topUpRequests = old.topUpRequests;
      paymentConfig = old.paymentConfig;
      banners;
      userRegistrations;
      siteConfig;
    };
  };
};
