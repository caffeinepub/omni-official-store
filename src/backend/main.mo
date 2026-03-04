import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Char "mo:core/Char";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
    email : ?Text;
  };

  public type Game = {
    id : Nat;
    name : Text;
    description : Text;
  };

  public type DiamondPackage = {
    id : Nat;
    gameId : Nat;
    name : Text;
    diamondAmount : Nat;
    price : Nat;
  };

  public type OrderStatus = {
    #pending;
    #completed;
    #failed;
  };

  public type Order = {
    id : Nat;
    user : Principal;
    playerId : Text;
    gameId : Nat;
    packageId : Nat;
    status : OrderStatus;
    timestamp : Time.Time;
  };

  public type LeaderboardEntry = {
    user : Principal;
    totalDiamonds : Nat;
  };

  module LeaderboardEntry {
    public func compare(l1 : LeaderboardEntry, l2 : LeaderboardEntry) : Order.Order {
      Nat.compare(l2.totalDiamonds, l1.totalDiamonds);
    };
  };

  // Redeem code persistent state
  public type RedeemCode = {
    code : Text;
    amount : Nat;
    redeemed : Bool;
    createdAt : Time.Time;
    redeemedBy : ?Principal;
  };

  // New Types
  public type PaymentConfig = {
    upiId : ?Text;
    bankName : ?Text;
    accountNumber : ?Text;
    accountHolder : ?Text;
    ifscCode : ?Text;
  };

  public type PaymentMethod = {
    #upi;
    #bank;
  };

  public type TopUpRequestStatus = {
    #pending;
    #approved;
    #rejected;
  };

  public type TopUpRequest = {
    id : Nat;
    user : Principal;
    amount : Nat;
    paymentMethod : PaymentMethod;
    utrRef : Text;
    status : TopUpRequestStatus;
    createdAt : Time.Time;
  };

  // Persistent state stores
  var nextOrderId = 1;
  var nextPackageId = 1;
  var nextTopUpRequestId = 1;

  let userProfiles = Map.empty<Principal, UserProfile>();
  let games = Map.empty<Nat, Game>();
  let packages = Map.empty<Nat, DiamondPackage>();
  let orders = Map.empty<Nat, Order>();
  let wallets = Map.empty<Principal, Nat>();
  let diamondsPurchased = Map.empty<Principal, Nat>();
  let redeemCodes = Map.empty<Text, RedeemCode>();
  let topUpRequests = Map.empty<Nat, TopUpRequest>();

  var paymentConfig : ?PaymentConfig = null;

  // Returns all available games
  public query ({ caller }) func getGames() : async [Game] {
    games.values().toArray();
  };

  // Returns all packages for a specific game
  public query ({ caller }) func getPackages(gameId : Nat) : async [DiamondPackage] {
    packages.values().toArray().filter(func(pkg) { pkg.gameId == gameId });
  };

  // Returns leaderboard sorted by total diamonds purchased
  public query ({ caller }) func getLeaderboard() : async [LeaderboardEntry] {
    let iter = diamondsPurchased.entries();
    let entriesArray = iter.toArray().map(func((user, totalDiamonds)) { { user; totalDiamonds } });
    entriesArray.sort();
  };

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

  // Returns only the caller's orders
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

  // Returns all orders in the system (admin only)
  public query ({ caller }) func getAllOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all orders");
    };
    orders.values().toArray();
  };

  // User place order
  public shared ({ caller }) func placeOrder(playerId : Text, gameId : Nat, packageId : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place orders");
    };

    switch (packages.get(packageId)) {
      case (null) { Runtime.trap("Package not found") };
      case (?package) {
        let currentBalance = switch (wallets.get(caller)) {
          case (null) { 0 };
          case (?balance) { balance };
        };

        if (currentBalance < package.price) {
          Runtime.trap("Insufficient funds in wallet");
        };

        // Deduct price from user's wallet
        wallets.add(caller, currentBalance - package.price);

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
    };
  };

  // Admin update order status
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

  // Admin add package
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

  // Admin update package
  public shared ({ caller }) func updatePackage(packageId : Nat, name : Text, diamondAmount : Nat, price : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update packages");
    };

    switch (packages.get(packageId)) {
      case (null) { Runtime.trap("Package not found") };
      case (?existingPackage) {
        let updatedPackage : DiamondPackage = {
          id = existingPackage.id;
          gameId = existingPackage.gameId;
          name;
          diamondAmount;
          price;
        };
        packages.add(packageId, updatedPackage);
      };
    };
  };

  // Admin remove package
  public shared ({ caller }) func removePackage(packageId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can remove packages");
    };

    if (not packages.containsKey(packageId)) {
      Runtime.trap("Package not found");
    };

    packages.remove(packageId);
  };

  // Admin credit user wallet
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

  // RedeemCode System

  func randomNat(upperBound : Nat) : Nat {
    let timestamp : Time.Time = Time.now();
    let positiveTimestamp = if (timestamp < 0) { -timestamp } else { timestamp };
    Int.abs(positiveTimestamp) % upperBound;
  };

  func randomChar() : Char {
    let choice = randomNat(3);
    switch (choice) {
      case (0) { Char.fromNat32(48 + Nat32.fromNat(randomNat(10))) }; // 0-9
      case (1) { Char.fromNat32(65 + Nat32.fromNat(randomNat(26))) }; // A-Z
      case (2) { Char.fromNat32(97 + Nat32.fromNat(randomNat(26))) }; // a-z
      case (_) { '0' };
    };
  };

  func isAlphanumeric(code : Text) : Bool {
    for (c in code.chars()) {
      if ((c < '0' or c > '9') and (c < 'A' or c > 'Z') and (c < 'a' or c > 'z')) {
        return false;
      };
    };
    true;
  };

  func generateRandomCode(length : Nat) : Text {
    let chars = List.empty<Char>();
    var i = 0;
    while (i < length) {
      chars.add(randomChar());
      i += 1;
    };
    Text.fromIter(chars.values());
  };

  public shared ({ caller }) func generateRedeemCode(amount : Nat, codeLength : Nat) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can generate redeem codes");
    };
    if (codeLength < 12 or codeLength > 16) {
      Runtime.trap("Code length must be between 12 and 16 chars");
    };

    // Repeat until valid code is found
    func findValidCode() : Text {
      let code = generateRandomCode(codeLength);
      if (isAlphanumeric(code) and not redeemCodes.containsKey(code)) {
        code;
      } else { findValidCode() };
    };

    let code = findValidCode();
    let codeRecord : RedeemCode = {
      code;
      amount;
      redeemed = false;
      createdAt = Time.now();
      redeemedBy = null;
    };
    redeemCodes.add(code, codeRecord);
    code;
  };

  public shared ({ caller }) func redeemCode(code : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can redeem codes");
    };
    if (code.size() < 12 or code.size() > 16) {
      Runtime.trap("Invalid code length, must be 12 to 16 characters");
    };

    switch (redeemCodes.get(code)) {
      case (null) { Runtime.trap("Code not found") };
      case (?record) {
        if (record.redeemed) {
          Runtime.trap("Code already redeemed");
        };

        let updatedRecord : RedeemCode = {
          code = record.code;
          amount = record.amount;
          redeemed = true;
          createdAt = record.createdAt;
          redeemedBy = ?caller;
        };
        redeemCodes.add(code, updatedRecord);

        let currentBalance = switch (wallets.get(caller)) {
          case (null) { 0 };
          case (?balance) { balance };
        };
        wallets.add(caller, currentBalance + record.amount);

        record.amount;
      };
    };
  };

  public query ({ caller }) func getAllRedeemCodes() : async [RedeemCode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all codes");
    };
    redeemCodes.values().toArray();
  };

  // --- NEW PAYMENT/FUND REQUEST FEATURES ---

  public shared ({ caller }) func setPaymentConfig(newConfig : PaymentConfig) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set payment config");
    };
    paymentConfig := ?newConfig;
  };

  public query ({ caller }) func getPaymentConfig() : async ?PaymentConfig {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payment config");
    };
    paymentConfig;
  };

  public shared ({ caller }) func createTopUpRequest(amount : Nat, paymentMethod : PaymentMethod, utrRef : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create top-up requests");
    };

    let reqId = nextTopUpRequestId;
    nextTopUpRequestId += 1;

    let request : TopUpRequest = {
      id = reqId;
      user = caller;
      amount;
      paymentMethod;
      utrRef;
      status = #pending;
      createdAt = Time.now();
    };

    topUpRequests.add(reqId, request);
    reqId;
  };

  public query ({ caller }) func getAllTopUpRequests() : async [TopUpRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all top-up requests");
    };
    topUpRequests.values().toArray();
  };

  public query ({ caller }) func getMyTopUpRequests() : async [TopUpRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their top-up requests");
    };

    let userRequests = List.empty<TopUpRequest>();
    for ((_, req) in topUpRequests.entries()) {
      if (req.user == caller) {
        userRequests.add(req);
      };
    };

    userRequests.toArray();
  };

  public shared ({ caller }) func approveTopUpRequest(requestId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can approve top-up requests");
    };

    let request = switch (topUpRequests.get(requestId)) {
      case (null) {
        Runtime.trap("Request not found");
      };
      case (?req) { req };
    };

    switch (request.status) {
      case (#rejected or #approved) {
        Runtime.trap("Request already processed");
      };
      case (#pending) {};
    };

    let updatedRequest = {
      request with
      status = #approved;
    };
    topUpRequests.add(requestId, updatedRequest);

    let currentBalance = switch (wallets.get(request.user)) {
      case (null) { 0 };
      case (?balance) { balance };
    };
    wallets.add(request.user, currentBalance + request.amount);
  };

  public shared ({ caller }) func rejectTopUpRequest(requestId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reject top-up requests");
    };

    let request = switch (topUpRequests.get(requestId)) {
      case (null) {
        Runtime.trap("Request not found");
      };
      case (?req) { req };
    };

    switch (request.status) {
      case (#approved or #rejected) {
        Runtime.trap("Request already processed");
      };
      case (#pending) {};
    };

    let updatedRequest = {
      request with
      status = #rejected;
    };
    topUpRequests.add(requestId, updatedRequest);
  };
};
