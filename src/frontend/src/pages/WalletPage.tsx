import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  QrCode,
  ReceiptText,
  Ticket,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { PaymentMethod, TopUpRequestStatus } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useCreateTopUpRequest,
  useGetMyTopUpRequests,
  useGetPaymentConfig,
  useGetWalletBalance,
  useRedeemCode,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBalance(balance: bigint): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(balance));
}

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

// ─── Redeem Code Card ─────────────────────────────────────────────────────────

function RedeemCard() {
  const [code, setCode] = useState("");
  const [lastSuccess, setLastSuccess] = useState<bigint | null>(null);
  const redeemCode = useRedeemCode();

  const handleRedeem = () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Please enter a redeem code");
      return;
    }
    if (trimmed.length < 12 || trimmed.length > 16) {
      toast.error("Code must be 12–16 characters long");
      return;
    }

    redeemCode.mutate(trimmed, {
      onSuccess: (amount) => {
        const formatted = formatBalance(amount);
        toast.success(
          `Successfully redeemed! ${formatted} added to your wallet`,
        );
        setLastSuccess(amount);
        setCode("");
      },
      onError: (e) => {
        toast.error(
          e instanceof Error
            ? e.message
            : "Failed to redeem code. Please try again.",
        );
        setLastSuccess(null);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleRedeem();
  };

  return (
    <Card className="card-game overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Ticket className="w-4 h-4 text-emerald-400" />
          Redeem Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Input
              data-ocid="wallet.redeem.input"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setLastSuccess(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter your redeem code..."
              maxLength={16}
              className="bg-input/50 border-border focus:border-emerald-500/60 font-mono tracking-widest text-sm uppercase placeholder:normal-case placeholder:tracking-normal"
              disabled={redeemCode.isPending}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground pl-0.5">
              Enter your 12–16 character redeem code
            </p>
          </div>
          <Button
            data-ocid="wallet.redeem.submit_button"
            onClick={handleRedeem}
            disabled={redeemCode.isPending || !code.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold border-0 shrink-0 sm:self-start transition-colors"
          >
            {redeemCode.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redeeming...
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4 mr-2" />
                Redeem
              </>
            )}
          </Button>
        </div>

        {lastSuccess !== null && (
          <motion.div
            data-ocid="wallet.redeem.success_state"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <p className="text-sm font-semibold">
              {formatBalance(lastSuccess)} has been added to your wallet!
            </p>
          </motion.div>
        )}

        {redeemCode.isError && (
          <div
            data-ocid="wallet.redeem.error_state"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive"
          >
            <p className="text-sm font-semibold">
              {redeemCode.error instanceof Error
                ? redeemCode.error.message
                : "Invalid or already used code"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Funds (multi-step) ───────────────────────────────────────────────────

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type AddFundsStep = "amount" | "method" | "success";

function AddFundsSection() {
  const [step, setStep] = useState<AddFundsStep>("amount");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [utrRef, setUtrRef] = useState("");

  const { data: paymentConfig, isLoading: configLoading } =
    useGetPaymentConfig();
  const createTopUp = useCreateTopUpRequest();

  const effectiveAmount =
    selectedAmount ?? (customAmount ? Number(customAmount) : 0);

  const handleContinue = () => {
    if (effectiveAmount < 1) {
      toast.error("Please select or enter a valid amount");
      return;
    }
    setStep("method");
  };

  const handleSubmit = () => {
    if (!selectedMethod) {
      toast.error("Please choose a payment method");
      return;
    }
    if (!utrRef.trim()) {
      toast.error("Please enter the UTR / payment reference number");
      return;
    }

    createTopUp.mutate(
      {
        amount: BigInt(effectiveAmount),
        paymentMethod: selectedMethod,
        utrRef: utrRef.trim(),
      },
      {
        onSuccess: () => {
          setStep("success");
        },
        onError: (e) => {
          toast.error(
            e instanceof Error ? e.message : "Failed to submit request",
          );
        },
      },
    );
  };

  const reset = () => {
    setStep("amount");
    setSelectedAmount(null);
    setCustomAmount("");
    setSelectedMethod(null);
    setUtrRef("");
  };

  const hasUpiConfig = !!paymentConfig?.upiId;
  const hasBankConfig =
    !!paymentConfig?.bankName &&
    !!paymentConfig?.accountNumber &&
    !!paymentConfig?.accountHolder;

  return (
    <Card className="card-game overflow-hidden">
      <div className="h-1 gradient-blue-gold" />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Add Funds
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {/* ── Step 1: Select Amount ── */}
          {step === "amount" && (
            <motion.div
              key="amount"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
              data-ocid="wallet.addfunds.panel"
            >
              <div>
                <p className="text-sm font-semibold mb-3 text-foreground/80">
                  Select amount to add (₹)
                </p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      data-ocid="wallet.addfunds.toggle"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount("");
                      }}
                      className={`rounded-lg py-2.5 text-sm font-bold transition-all duration-200 ${
                        selectedAmount === amt
                          ? "gradient-blue-gold text-white shadow-md"
                          : "bg-card border border-border text-foreground hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      ₹{amt.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-semibold">
                    Or enter custom amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                      ₹
                    </span>
                    <Input
                      data-ocid="wallet.addfunds.input"
                      type="number"
                      min="1"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      placeholder="e.g. 750"
                      className="pl-7 bg-input/50 border-border focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              {effectiveAmount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 text-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground/80">
                    Amount selected:{" "}
                    <strong className="text-foreground">
                      ₹{effectiveAmount.toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>
              )}

              <Button
                data-ocid="wallet.addfunds.primary_button"
                onClick={handleContinue}
                disabled={effectiveAmount < 1}
                className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
              >
                Continue →
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: Choose Method + Submit ── */}
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
              data-ocid="wallet.payment.panel"
            >
              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => setStep("amount")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  data-ocid="wallet.payment.cancel_button"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="text-sm font-semibold">
                  Paying{" "}
                  <span className="text-gradient-gold">
                    ₹{effectiveAmount.toLocaleString("en-IN")}
                  </span>
                </p>
              </div>

              {/* Payment Method Cards */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Choose payment method
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-ocid="wallet.payment.upi.toggle"
                    onClick={() => setSelectedMethod(PaymentMethod.upi)}
                    className={`rounded-xl p-4 text-left transition-all duration-200 border ${
                      selectedMethod === PaymentMethod.upi
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <QrCode
                      className={`w-5 h-5 mb-2 ${selectedMethod === PaymentMethod.upi ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <p className="text-sm font-bold">UPI Transfer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Instant payment
                    </p>
                  </button>
                  <button
                    type="button"
                    data-ocid="wallet.payment.bank.toggle"
                    onClick={() => setSelectedMethod(PaymentMethod.bank)}
                    className={`rounded-xl p-4 text-left transition-all duration-200 border ${
                      selectedMethod === PaymentMethod.bank
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <Landmark
                      className={`w-5 h-5 mb-2 ${selectedMethod === PaymentMethod.bank ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <p className="text-sm font-bold">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      NEFT / IMPS
                    </p>
                  </button>
                </div>
              </div>

              {/* Payment Details */}
              <AnimatePresence>
                {selectedMethod && (
                  <motion.div
                    key={selectedMethod}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {configLoading ? (
                      <Skeleton className="h-24 w-full rounded-lg" />
                    ) : !paymentConfig ||
                      (selectedMethod === PaymentMethod.upi && !hasUpiConfig) ||
                      (selectedMethod === PaymentMethod.bank &&
                        !hasBankConfig) ? (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="text-xs font-semibold">
                          Payment details will be available soon. Please contact
                          admin via official channels to proceed.
                        </p>
                      </div>
                    ) : selectedMethod === PaymentMethod.upi ? (
                      <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/25 space-y-2">
                        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                          UPI Payment Details
                        </p>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            UPI ID
                          </p>
                          <p className="font-mono font-bold text-sm text-foreground">
                            {paymentConfig.upiId}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Send exactly{" "}
                          <strong className="text-foreground">
                            ₹{effectiveAmount.toLocaleString("en-IN")}
                          </strong>{" "}
                          to this UPI ID and enter the UTR number below.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/25 space-y-2">
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                          Bank Transfer Details
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Bank Name</p>
                            <p className="font-semibold text-foreground">
                              {paymentConfig.bankName}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Account Holder
                            </p>
                            <p className="font-semibold text-foreground">
                              {paymentConfig.accountHolder}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Account Number
                            </p>
                            <p className="font-mono font-bold text-foreground">
                              {paymentConfig.accountNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">IFSC Code</p>
                            <p className="font-mono font-bold text-foreground">
                              {paymentConfig.ifscCode ?? "—"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                          Transfer exactly{" "}
                          <strong className="text-foreground">
                            ₹{effectiveAmount.toLocaleString("en-IN")}
                          </strong>{" "}
                          and save the UTR/reference number.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* UTR Input */}
              {selectedMethod && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1.5"
                >
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ReceiptText className="w-3.5 h-3.5 text-primary" />
                    UTR / Payment Reference Number
                  </Label>
                  <Input
                    data-ocid="wallet.payment.utr.input"
                    value={utrRef}
                    onChange={(e) => setUtrRef(e.target.value)}
                    placeholder="e.g. 423612345678"
                    className="bg-input/50 border-border focus:border-primary font-mono"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the 12-digit UTR number from your bank/UPI app after
                    payment
                  </p>
                </motion.div>
              )}

              <Button
                data-ocid="wallet.payment.submit_button"
                onClick={handleSubmit}
                disabled={
                  !selectedMethod || !utrRef.trim() || createTopUp.isPending
                }
                className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
              >
                {createTopUp.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4"
              data-ocid="wallet.payment.success_state"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-display text-lg font-black mb-1">
                  Request Submitted!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your top-up request for{" "}
                  <strong className="text-foreground">
                    ₹{effectiveAmount.toLocaleString("en-IN")}
                  </strong>{" "}
                  has been received. Admin will verify and credit your wallet
                  within 24 hours.
                </p>
              </div>
              <Button
                onClick={reset}
                variant="outline"
                className="border-border"
                data-ocid="wallet.payment.secondary_button"
              >
                Add More Funds
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Top-up History ───────────────────────────────────────────────────────────

function TopUpHistorySection() {
  const { data: requests, isLoading } = useGetMyTopUpRequests();

  const sorted = requests
    ? [...requests].sort((a, b) => Number(b.createdAt - a.createdAt))
    : [];

  const statusConfig = {
    [TopUpRequestStatus.pending]: {
      label: "Pending",
      className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    },
    [TopUpRequestStatus.approved]: {
      label: "Approved",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    },
    [TopUpRequestStatus.rejected]: {
      label: "Rejected",
      className: "bg-red-500/15 text-red-400 border-red-500/25",
    },
  };

  return (
    <Card className="card-game overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <ReceiptText className="w-4 h-4 text-violet-400" />
          My Top-up History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 text-center px-4"
            data-ocid="wallet.topup.empty_state"
          >
            <ReceiptText className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground font-semibold text-sm">
              No top-up requests yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your fund requests will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((req, index) => {
              const config = statusConfig[req.status];
              return (
                <div
                  key={req.id.toString()}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-primary/3 transition-colors"
                  data-ocid={`wallet.topup.item.${index + 1}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm">
                    {req.paymentMethod === PaymentMethod.upi ? "📱" : "🏦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {formatBalance(req.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {req.paymentMethod === PaymentMethod.upi
                          ? "UPI"
                          : "Bank"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Ref: {req.utrRef} · {formatDate(req.createdAt)}
                    </div>
                  </div>
                  <Badge
                    className={`text-xs font-semibold border px-2 py-0.5 ${config.className}`}
                  >
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main WalletPage ──────────────────────────────────────────────────────────

export function WalletPage() {
  const { data: balance, isLoading } = useGetWalletBalance();
  const { loginStatus, login } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-xl font-black mb-2">
            Login Required
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Please login to view your wallet balance
          </p>
          <Button
            onClick={login}
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
    <div className="min-h-screen container mx-auto px-4 max-w-3xl py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-black">
            My Wallet
          </h1>
          <p className="text-sm text-muted-foreground">
            Store credits & balance
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        data-ocid="wallet.balance.panel"
        className="mb-6"
      >
        <Card className="card-game overflow-hidden">
          <div className="h-1 gradient-blue-gold" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            {isLoading ? (
              <Skeleton className="h-12 w-48 rounded-lg" />
            ) : (
              <>
                <div className="font-display text-4xl md:text-5xl font-black text-gradient-gold">
                  {formatBalance(balance ?? 0n)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Store credits (INR)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Funds */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="mb-6"
      >
        <AddFundsSection />
      </motion.div>

      {/* Redeem Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="mb-6"
      >
        <RedeemCard />
      </motion.div>

      {/* Top-up History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="mb-6"
      >
        <TopUpHistorySection />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="mt-2 p-4 rounded-xl border border-border bg-muted/20 text-center"
      >
        <p className="text-xs text-muted-foreground">
          Wallet balances are updated after admin approval. For any
          discrepancies, please contact support.
        </p>
      </motion.div>
    </div>
  );
}
