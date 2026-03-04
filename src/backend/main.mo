import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
    email : ?Text;
  };

  type Game = {
    id : Nat;
    name : Text;
    description : Text;
  };

  type DiamondPackage = {
    id : Nat;
    gameId : Nat;
    name : Text;
    diamondAmount : Nat;
    price : Nat; // In "cents" for simplicity
  };

  type OrderStatus = {
    #pending;
    #completed;
    #failed;
  };

  type Order = {
    id : Nat;
    user : Principal;
    playerId : Text;
    gameId : Nat;
    packageId : Nat;
    status : OrderStatus;
    timestamp : Time.Time;
  };

  type LeaderboardEntry = {
    user : Principal;
    totalDiamonds : Nat;
  };

  module LeaderboardEntry {
    public func compare(l1 : LeaderboardEntry, l2 : LeaderboardEntry) : Order.Order {
      Nat.compare(l2.totalDiamonds, l1.totalDiamonds);
    };
  };

  var nextOrderId = 1;
  var nextPackageId = 1;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let games = Map.empty<Nat, Game>();
  let packages = Map.empty<Nat, DiamondPackage>();
  let orders = Map.empty<Nat, Order>();
  let wallets = Map.empty<Principal, Nat>(); // Maps user Principal to wallet balance
  let diamondsPurchased = Map.empty<Principal, Nat>(); // Maps user Principal to total diamonds purchased

  // Initialize games
  func initGames() {
    let mlbb : Game = {
      id = 1;
      name = "Mobile Legends: Bang Bang";
      description = "MLBB is a fast-paced 5v5 MOBA game.";
    };
    let hok : Game = {
      id = 2;
      name = "Honor of Kings";
      description = "HOK is a popular MOBA game in China.";
    };
    games.add(mlbb.id, mlbb);
    games.add(hok.id, hok);
  };

  // Initialize diamond packages for both games
  func initPackages() {
    let mlbbPackages : [DiamondPackage] = [
      { id = nextPackageId; gameId = 1; name = "60 Diamonds"; diamondAmount = 60; price = 14900 },
      { id = nextPackageId + 1; gameId = 1; name = "170 Diamonds"; diamondAmount = 170; price = 39900 },
      { id = nextPackageId + 2; gameId = 1; name = "290 Diamonds"; diamondAmount = 290; price = 59900 },
      { id = nextPackageId + 3; gameId = 1; name = "400 Diamonds"; diamondAmount = 400; price = 79900 },
      { id = nextPackageId + 4; gameId = 1; name = "830 Diamonds"; diamondAmount = 830; price = 159900 },
      { id = nextPackageId + 5; gameId = 1; name = "2100 Diamonds"; diamondAmount = 2100; price = 399900 },
      { id = nextPackageId + 6; gameId = 1; name = "4260 Diamonds"; diamondAmount = 4260; price = 799900 },
      { id = nextPackageId + 7; gameId = 1; name = "Mobile Legends Summer Pass"; diamondAmount = 10000; price = 1999900 },
    ];

    let hokPackages : [DiamondPackage] = [
      { id = nextPackageId + 8; gameId = 2; name = "60 Diamonds"; diamondAmount = 60; price = 14900 },
      { id = nextPackageId + 9; gameId = 2; name = "170 Diamonds"; diamondAmount = 170; price = 39900 },
      { id = nextPackageId + 10; gameId = 2; name = "290 Diamonds"; diamondAmount = 290; price = 59900 },
      { id = nextPackageId + 11; gameId = 2; name = "400 Diamonds"; diamondAmount = 400; price = 79900 },
      { id = nextPackageId + 12; gameId = 2; name = "830 Diamonds"; diamondAmount = 830; price = 159900 },
      { id = nextPackageId + 13; gameId = 2; name = "2100 Diamonds"; diamondAmount = 2100; price = 399900 },
      { id = nextPackageId + 14; gameId = 2; name = "4260 Diamonds"; diamondAmount = 4260; price = 799900 },
      { id = nextPackageId + 15; gameId = 2; name = "Fairy Tale Crossover Pass"; diamondAmount = 10000; price = 1999900 },
    ];

    for (pkg in mlbbPackages.values()) {
      packages.add(pkg.id, pkg);
    };
    for (pkg in hokPackages.values()) {
      packages.add(pkg.id, pkg);
    };

    nextPackageId += 16; // Increment packageId for future packages
  };

  // Initialize persistent state
  initGames();
  initPackages();

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Public query functions
  public query ({ caller }) func getGames() : async [Game] {
    // No authorization check - accessible to everyone including guests
    games.values().toArray();
  };

  public query ({ caller }) func getPackages(gameId : Nat) : async [DiamondPackage] {
    // No authorization check - accessible to everyone including guests
    packages.values().toArray().filter(func(pkg) { pkg.gameId == gameId });
  };

  public query ({ caller }) func getOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view orders");
    };
    orders.values().toArray().filter(func(order) { order.user == caller });
  };

  public query ({ caller }) func getWalletBalance() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view wallet balance");
    };
    switch (wallets.get(caller)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
  };

  public query ({ caller }) func getLeaderboard() : async [LeaderboardEntry] {
    // No authorization check - accessible to everyone including guests
    let iter = diamondsPurchased.entries();
    let entriesArray = iter.toArray().map(func((user, totalDiamonds)) { { user; totalDiamonds } });
    entriesArray.sort();
  };

  // Place a new order
  public shared ({ caller }) func placeOrder(playerId : Text, gameId : Nat, packageId : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place orders");
    };

    let package = switch (packages.get(packageId)) {
      case (null) { Runtime.trap("Package not found") };
      case (?pkg) { pkg };
    };

    let orderId = nextOrderId;
    nextOrderId += 1;

    let order : Order = {
      id = orderId;
      user = caller;
      playerId;
      gameId;
      packageId;
      status = #pending;
      timestamp = Time.now();
    };

    orders.add(orderId, order);
    orderId;
  };

  // Admin-only function to update order status
  public shared ({ caller }) func updateOrderStatus(orderId : Nat, status : OrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update order status");
    };

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        orders.add(
          orderId,
          {
            id = order.id;
            user = order.user;
            playerId = order.playerId;
            gameId = order.gameId;
            packageId = order.packageId;
            status;
            timestamp = order.timestamp;
          },
        );

        // Update diamondsPurchased if order is completed
        if (status == #completed) {
          switch (packages.get(order.packageId)) {
            case (?pkg) {
              let currentTotal = switch (diamondsPurchased.get(order.user)) {
                case (null) { 0 };
                case (?total) { total };
              };
              diamondsPurchased.add(order.user, currentTotal + pkg.diamondAmount);
            };
            case (null) {};
          };
        };
      };
    };
  };

  // Admin-only function to add new diamond packages
  public shared ({ caller }) func addPackage(gameId : Nat, name : Text, diamondAmount : Nat, price : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add packages");
    };

    let packageId = nextPackageId;
    nextPackageId += 1;

    let package : DiamondPackage = {
      id = packageId;
      gameId;
      name;
      diamondAmount;
      price;
    };

    packages.add(packageId, package);
    packageId;
  };

  // Admin-only function to credit user wallets
  public shared ({ caller }) func creditWallet(user : Principal, amount : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can credit wallets");
    };

    let currentBalance = switch (wallets.get(user)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    wallets.add(user, currentBalance + amount);
  };
};
