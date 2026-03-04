import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Principal } from "@icp-sdk/core/principal";
import {
  CheckCircle2,
  Copy,
  Diamond,
  Landmark,
  Loader2,
  PackagePlus,
  Pencil,
  QrCode,
  ReceiptText,
  Settings2,
  ShieldCheck,
  ShieldX,
  Ticket,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  DiamondPackage,
  Order,
  PaymentConfig,
  RedeemCode,
  TopUpRequest,
} from "../backend.d";
import { OrderStatus, PaymentMethod, TopUpRequestStatus } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddPackage,
  useApproveTopUpRequest,
  useCreditWallet,
  useGenerateRedeemCode,
  useGetAllOrders,
  useGetAllRedeemCodes,
  useGetAllTopUpRequests,
  useGetPackages,
  useGetPaymentConfig,
  useIsAdmin,
  useRejectTopUpRequest,
  useRemovePackage,
  useSetPaymentConfig,
  useUpdateOrderStatus,
  useUpdatePackage,
} from "../hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: bigint): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(Number(price));
}

function formatDate(timestamp: bigint): string {
  // ICP timestamps are in nanoseconds
  const ms = Number(timestamp / 1_000_000n);
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const GAME_NAMES: Record<string, string> = {
  "1": "MLBB",
  "2": "HOK",
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: OrderStatus }) {
  const classes = {
    [OrderStatus.pending]: "badge-pending",
    [OrderStatus.completed]: "badge-completed",
    [OrderStatus.failed]: "badge-failed",
  }[status];

  const icons = {
    [OrderStatus.pending]: "⏳",
    [OrderStatus.completed]: "✅",
    [OrderStatus.failed]: "❌",
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${classes}`}
    >
      {icons} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Packages Tab ─────────────────────────────────────────────────────────────

type PackageFormData = {
  name: string;
  diamondAmount: string;
  price: string;
};

function PackagesTab() {
  const [selectedGame, setSelectedGame] = useState<bigint>(1n);
  const [addOpen, setAddOpen] = useState(false);
  const [editPkg, setEditPkg] = useState<DiamondPackage | null>(null);
  const [deleteConfirmPkg, setDeleteConfirmPkg] =
    useState<DiamondPackage | null>(null);
  const [formData, setFormData] = useState<PackageFormData>({
    name: "",
    diamondAmount: "",
    price: "",
  });

  const { data: packages, isLoading } = useGetPackages(selectedGame);
  const addPackage = useAddPackage();
  const updatePackage = useUpdatePackage();
  const removePackage = useRemovePackage();

  const openAdd = () => {
    setFormData({ name: "", diamondAmount: "", price: "" });
    setAddOpen(true);
  };

  const openEdit = (pkg: DiamondPackage) => {
    setEditPkg(pkg);
    setFormData({
      name: pkg.name,
      diamondAmount: pkg.diamondAmount.toString(),
      price: pkg.price.toString(),
    });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.diamondAmount || !formData.price) {
      toast.error("All fields are required");
      return;
    }
    addPackage.mutate(
      {
        gameId: selectedGame,
        name: formData.name,
        diamondAmount: BigInt(formData.diamondAmount),
        price: BigInt(formData.price),
      },
      {
        onSuccess: () => {
          toast.success("Package added successfully");
          setAddOpen(false);
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  const handleEdit = async () => {
    if (!editPkg) return;
    if (!formData.name || !formData.diamondAmount || !formData.price) {
      toast.error("All fields are required");
      return;
    }
    updatePackage.mutate(
      {
        packageId: editPkg.id,
        name: formData.name,
        diamondAmount: BigInt(formData.diamondAmount),
        price: BigInt(formData.price),
      },
      {
        onSuccess: () => {
          toast.success("Package updated successfully");
          setEditPkg(null);
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  const handleDelete = async () => {
    if (!deleteConfirmPkg) return;
    removePackage.mutate(deleteConfirmPkg.id, {
      onSuccess: () => {
        toast.success("Package deleted");
        setDeleteConfirmPkg(null);
      },
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  const sortedPackages = packages
    ? [...packages].sort((a, b) => Number(a.diamondAmount - b.diamondAmount))
    : [];

  return (
    <div className="space-y-6">
      {/* Game Toggle + Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-ocid="admin.mlbb.toggle"
            onClick={() => setSelectedGame(1n)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              selectedGame === 1n
                ? "gradient-blue-gold text-white shadow-lg"
                : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            💎 MLBB
          </button>
          <button
            type="button"
            data-ocid="admin.hok.toggle"
            onClick={() => setSelectedGame(2n)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              selectedGame === 2n
                ? "gradient-blue-gold text-white shadow-lg"
                : "bg-card border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            ⚔️ HOK
          </button>
        </div>
        <Button
          data-ocid="admin.add_package.button"
          onClick={openAdd}
          className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
          size="sm"
        >
          <PackagePlus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Packages Table */}
      <div className="card-game rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : sortedPackages.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="admin.packages.empty_state"
          >
            <Diamond className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-semibold">
              No packages yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add the first package for this game
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold">
                  Name
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold">
                  Diamonds
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold">
                  Price
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPackages.map((pkg, index) => (
                <TableRow
                  key={pkg.id.toString()}
                  className="border-border hover:bg-primary/5 transition-colors"
                  data-ocid="admin.package.row"
                >
                  <TableCell className="font-semibold">{pkg.name}</TableCell>
                  <TableCell>
                    <span className="text-gradient-gold font-bold">
                      💎 {Number(pkg.diamondAmount).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground/90">
                    {formatPrice(pkg.price)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        data-ocid={`admin.package.edit_button.${index + 1}`}
                        onClick={() => openEdit(pkg)}
                        className="text-primary hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-ocid={`admin.package.delete_button.${index + 1}`}
                        onClick={() => setDeleteConfirmPkg(pkg)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Package Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="bg-card border-border"
          data-ocid="admin.add_package.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Add New Package
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Adding to {selectedGame === 1n ? "MLBB" : "HOK"} packages
            </DialogDescription>
          </DialogHeader>
          <PackageForm data={formData} onChange={setFormData} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              className="border-border"
              data-ocid="admin.package.cancel_button"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.package.save.submit_button"
              onClick={handleAdd}
              disabled={addPackage.isPending}
              className="gradient-blue-gold text-white font-bold border-0"
            >
              {addPackage.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PackagePlus className="w-4 h-4 mr-2" />
              )}
              {addPackage.isPending ? "Adding..." : "Add Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={!!editPkg} onOpenChange={(o) => !o && setEditPkg(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Edit Package
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update diamond package details
            </DialogDescription>
          </DialogHeader>
          <PackageForm data={formData} onChange={setFormData} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPkg(null)}
              className="border-border"
              data-ocid="admin.package.cancel_button"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.package.save.submit_button"
              onClick={handleEdit}
              disabled={updatePackage.isPending}
              className="gradient-blue-gold text-white font-bold border-0"
            >
              {updatePackage.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4 mr-2" />
              )}
              {updatePackage.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirmPkg}
        onOpenChange={(o) => !o && setDeleteConfirmPkg(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">
              Delete Package
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                {deleteConfirmPkg?.name}
              </strong>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmPkg(null)}
              className="border-border"
              data-ocid="admin.package.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-ocid="admin.package.delete_button.confirm"
              onClick={handleDelete}
              disabled={removePackage.isPending}
            >
              {removePackage.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {removePackage.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Package Form ─────────────────────────────────────────────────────────────

function PackageForm({
  data,
  onChange,
}: {
  data: PackageFormData;
  onChange: (d: PackageFormData) => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="pkg-name" className="text-sm font-semibold">
          Package Name
        </Label>
        <Input
          id="pkg-name"
          data-ocid="admin.package.name.input"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="e.g. Starter Pack"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg-diamonds" className="text-sm font-semibold">
          Diamond Amount
        </Label>
        <Input
          id="pkg-diamonds"
          data-ocid="admin.package.diamonds.input"
          type="number"
          min="1"
          value={data.diamondAmount}
          onChange={(e) => onChange({ ...data, diamondAmount: e.target.value })}
          placeholder="e.g. 86"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg-price" className="text-sm font-semibold">
          Price (INR ₹)
        </Label>
        <Input
          id="pkg-price"
          data-ocid="admin.package.price.input"
          type="number"
          min="1"
          value={data.price}
          onChange={(e) => onChange({ ...data, price: e.target.value })}
          placeholder="e.g. 14900"
          className="bg-input/50 border-border focus:border-primary"
        />
        {data.price && !Number.isNaN(Number(data.price)) && (
          <p className="text-xs text-muted-foreground">
            Preview: {formatPrice(BigInt(data.price))}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: orders, isLoading } = useGetAllOrders();
  const updateStatus = useUpdateOrderStatus();

  const sorted = orders
    ? [...orders].sort((a, b) => Number(b.timestamp - a.timestamp))
    : [];

  const filtered =
    statusFilter === "all"
      ? sorted
      : sorted.filter((o) => o.status === statusFilter);

  const counts = {
    all: sorted.length,
    pending: sorted.filter((o) => o.status === OrderStatus.pending).length,
    completed: sorted.filter((o) => o.status === OrderStatus.completed).length,
    failed: sorted.filter((o) => o.status === OrderStatus.failed).length,
  };

  const handleStatus = (
    orderId: bigint,
    status: OrderStatus,
    label: string,
  ) => {
    updateStatus.mutate(
      { orderId, status },
      {
        onSuccess: () => toast.success(`Order marked as ${label}`),
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            { key: "all", label: "Total", color: "text-foreground" },
            {
              key: "pending",
              label: "Pending",
              color: "text-yellow-400",
            },
            {
              key: "completed",
              label: "Completed",
              color: "text-emerald-400",
            },
            { key: "failed", label: "Failed", color: "text-red-400" },
          ] as const
        ).map((stat) => (
          <Card key={stat.key} className="card-game">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {stat.label}
              </p>
              <p className={`text-2xl font-black font-display ${stat.color}`}>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mt-1" />
                ) : (
                  counts[stat.key]
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-semibold shrink-0">
          Filter:
        </span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger
            className="w-36 bg-card border-border"
            data-ocid="admin.order.status.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value={OrderStatus.pending}>Pending</SelectItem>
            <SelectItem value={OrderStatus.completed}>Completed</SelectItem>
            <SelectItem value={OrderStatus.failed}>Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="card-game rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="admin.orders.empty_state"
          >
            <ShoppingBagIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-semibold">
              No orders found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">
                    Order ID
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Player ID
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Game
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Pkg ID
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order: Order, index: number) => (
                  <TableRow
                    key={order.id.toString()}
                    className="border-border hover:bg-primary/5 transition-colors"
                    data-ocid="admin.order.row"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id.toString()}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">
                      {order.playerId}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-primary/30 text-primary text-xs font-bold"
                      >
                        {GAME_NAMES[order.gameId.toString()] ??
                          `G${order.gameId}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      #{order.packageId.toString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(order.timestamp)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === OrderStatus.pending && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            data-ocid={`admin.order.complete_button.${index + 1}`}
                            onClick={() =>
                              handleStatus(
                                order.id,
                                OrderStatus.completed,
                                "completed",
                              )
                            }
                            disabled={updateStatus.isPending}
                            className="text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-400 h-7 px-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            data-ocid={`admin.order.fail_button.${index + 1}`}
                            onClick={() =>
                              handleStatus(
                                order.id,
                                OrderStatus.failed,
                                "failed",
                              )
                            }
                            disabled={updateStatus.isPending}
                            className="text-red-400 hover:bg-red-400/10 hover:text-red-400 h-7 px-2"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Fail
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Wallet Tab ───────────────────────────────────────────────────────────────

function WalletTab() {
  const [principal, setPrincipal] = useState("");
  const [amount, setAmount] = useState("");
  const creditWallet = useCreditWallet();

  const handleCredit = () => {
    if (!principal.trim()) {
      toast.error("Please enter a Principal ID");
      return;
    }
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    let parsedPrincipal: Principal;
    try {
      parsedPrincipal = Principal.fromText(principal.trim());
    } catch {
      toast.error("Invalid Principal ID format");
      return;
    }

    creditWallet.mutate(
      { user: parsedPrincipal, amount: BigInt(Math.floor(Number(amount))) },
      {
        onSuccess: () => {
          toast.success(
            `Successfully credited ₹${Number(amount).toLocaleString("en-IN")} to wallet`,
          );
          setPrincipal("");
          setAmount("");
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Credit Wallet */}
      <Card className="card-game">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Credit User Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wallet-principal" className="text-sm font-semibold">
              User Principal ID
            </Label>
            <Input
              id="wallet-principal"
              data-ocid="admin.wallet.principal.input"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="e.g. 2vxsx-fae..."
              className="bg-input/50 border-border focus:border-primary font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter the user's Internet Identity principal
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wallet-amount" className="text-sm font-semibold">
              Amount (INR ₹)
            </Label>
            <Input
              id="wallet-amount"
              data-ocid="admin.wallet.amount.input"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="bg-input/50 border-border focus:border-primary"
            />
            {amount && !Number.isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                Preview:{" "}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 0,
                }).format(Number(amount))}
              </p>
            )}
          </div>

          <Button
            data-ocid="admin.wallet.credit.submit_button"
            className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
            onClick={handleCredit}
            disabled={creditWallet.isPending}
          >
            {creditWallet.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Credit Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Config */}
      <PaymentConfigSection />
    </div>
  );
}

// ─── Redeem Codes Tab ─────────────────────────────────────────────────────────

function RedeemCodesTab() {
  const [amount, setAmount] = useState("");
  const [codeLength, setCodeLength] = useState("16");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const { data: codes, isLoading: codesLoading } = useGetAllRedeemCodes();
  const generateCode = useGenerateRedeemCode();

  const handleGenerate = () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const len = Number(codeLength);
    if (len < 12 || len > 16) {
      toast.error("Code length must be between 12 and 16");
      return;
    }

    generateCode.mutate(
      { amount: BigInt(Math.floor(Number(amount))), codeLength: BigInt(len) },
      {
        onSuccess: (code) => {
          setGeneratedCode(code);
          toast.success("Code generated successfully!");
          setAmount("");
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Code copied to clipboard!"))
      .catch(() => toast.error("Failed to copy"));
  };

  const sortedCodes: RedeemCode[] = codes
    ? [...codes].sort((a, b) => Number(b.createdAt - a.createdAt))
    : [];

  return (
    <div className="space-y-6">
      {/* Generate Code Section */}
      <Card className="card-game max-w-lg">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Ticket className="w-5 h-5 text-emerald-400" />
            Generate Redeem Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="redeem-amount" className="text-sm font-semibold">
              Amount (INR ₹)
            </Label>
            <Input
              id="redeem-amount"
              data-ocid="admin.redeem.amount.input"
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="bg-input/50 border-border focus:border-primary"
            />
            {amount && !Number.isNaN(Number(amount)) && Number(amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                Preview:{" "}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 0,
                }).format(Number(amount))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="redeem-length" className="text-sm font-semibold">
              Code Length (12–16 digits)
            </Label>
            <Input
              id="redeem-length"
              data-ocid="admin.redeem.length.input"
              type="number"
              min="12"
              max="16"
              value={codeLength}
              onChange={(e) => setCodeLength(e.target.value)}
              placeholder="16"
              className="bg-input/50 border-border focus:border-primary"
            />
          </div>

          <Button
            data-ocid="admin.redeem.generate.submit_button"
            className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
            onClick={handleGenerate}
            disabled={generateCode.isPending}
          >
            {generateCode.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Ticket className="w-4 h-4 mr-2" />
                Generate Code
              </>
            )}
          </Button>

          {/* Generated code display */}
          {generatedCode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30"
            >
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide mb-2">
                Generated Code
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-lg font-black tracking-widest text-emerald-300 break-all">
                  {generatedCode}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedCode)}
                  className="shrink-0 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code with the recipient. It can only be redeemed
                once.
              </p>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Codes Table */}
      <div>
        <h3 className="font-display text-base font-bold mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4 text-primary" />
          All Redeem Codes
          {sortedCodes.length > 0 && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary text-xs ml-1"
            >
              {sortedCodes.length}
            </Badge>
          )}
        </h3>

        <div className="card-game rounded-xl overflow-hidden">
          {codesLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : sortedCodes.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="admin.redeem.codes.empty_state"
            >
              <Ticket className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground font-semibold">
                No redeem codes yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Generate your first redeem code above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-semibold">
                      Code
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Created
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold">
                      Redeemed By
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCodes.map((rc, index) => (
                    <TableRow
                      key={rc.code}
                      className="border-border hover:bg-primary/5 transition-colors"
                      data-ocid="admin.redeem.code.row"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm font-bold tracking-wider text-foreground/90">
                            {rc.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-ocid={`admin.redeem.copy.button.${index + 1}`}
                            onClick={() => copyToClipboard(rc.code)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {formatPrice(rc.amount)}
                      </TableCell>
                      <TableCell>
                        {rc.redeemed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted/50 text-muted-foreground border border-border">
                            ✓ Redeemed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                            ● Available
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(rc.createdAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rc.redeemedBy
                          ? `${rc.redeemedBy.toString().slice(0, 12)}...`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Top-up Status Badge ──────────────────────────────────────────────────────

function TopUpStatusBadge({ status }: { status: TopUpRequestStatus }) {
  const config = {
    [TopUpRequestStatus.pending]: {
      label: "Pending",
      className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    },
    [TopUpRequestStatus.approved]: {
      label: "Approved",
      className:
        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    },
    [TopUpRequestStatus.rejected]: {
      label: "Rejected",
      className: "bg-red-500/15 text-red-400 border border-red-500/30",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// ─── Top-up Requests Tab ──────────────────────────────────────────────────────

function TopUpRequestsTab() {
  const { data: requests, isLoading } = useGetAllTopUpRequests();
  const approveRequest = useApproveTopUpRequest();
  const rejectRequest = useRejectTopUpRequest();

  const sorted: TopUpRequest[] = requests
    ? [...requests].sort((a, b) => Number(b.createdAt - a.createdAt))
    : [];

  const counts = {
    total: sorted.length,
    pending: sorted.filter((r) => r.status === TopUpRequestStatus.pending)
      .length,
    approved: sorted.filter((r) => r.status === TopUpRequestStatus.approved)
      .length,
    rejected: sorted.filter((r) => r.status === TopUpRequestStatus.rejected)
      .length,
  };

  const handleApprove = (requestId: bigint) => {
    approveRequest.mutate(requestId, {
      onSuccess: () =>
        toast.success("Top-up request approved and wallet credited"),
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  const handleReject = (requestId: bigint) => {
    rejectRequest.mutate(requestId, {
      onSuccess: () => toast.success("Top-up request rejected"),
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            { key: "total" as const, label: "Total", color: "text-foreground" },
            {
              key: "pending" as const,
              label: "Pending",
              color: "text-yellow-400",
            },
            {
              key: "approved" as const,
              label: "Approved",
              color: "text-emerald-400",
            },
            {
              key: "rejected" as const,
              label: "Rejected",
              color: "text-red-400",
            },
          ] as const
        ).map((stat) => (
          <Card key={stat.key} className="card-game">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                {stat.label}
              </p>
              <p className={`text-2xl font-black font-display ${stat.color}`}>
                {isLoading ? (
                  <Skeleton className="h-7 w-10 mt-1" />
                ) : (
                  counts[stat.key]
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Requests Table */}
      <div className="card-game rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-center"
            data-ocid="admin.topup.empty_state"
          >
            <ReceiptText className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-semibold">
              No top-up requests yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">
                    ID
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    User
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Amount
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Method
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    UTR Ref
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold">
                    Date
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((req, index) => (
                  <TableRow
                    key={req.id.toString()}
                    className="border-border hover:bg-primary/5 transition-colors"
                    data-ocid="admin.topup.row"
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{req.id.toString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {req.user.toString().slice(0, 12)}...
                    </TableCell>
                    <TableCell className="font-bold text-sm">
                      {formatPrice(req.amount)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                        {req.paymentMethod === PaymentMethod.upi ? (
                          <>
                            <QrCode className="w-3 h-3 text-primary" />
                            UPI
                          </>
                        ) : (
                          <>
                            <Landmark className="w-3 h-3 text-primary" />
                            Bank
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground/80">
                      {req.utrRef}
                    </TableCell>
                    <TableCell>
                      <TopUpStatusBadge status={req.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === TopUpRequestStatus.pending && (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            data-ocid={`admin.topup.approve.button.${index + 1}`}
                            onClick={() => handleApprove(req.id)}
                            disabled={
                              approveRequest.isPending ||
                              rejectRequest.isPending
                            }
                            className="text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-400 h-7 px-2"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            data-ocid={`admin.topup.reject.button.${index + 1}`}
                            onClick={() => handleReject(req.id)}
                            disabled={
                              approveRequest.isPending ||
                              rejectRequest.isPending
                            }
                            className="text-red-400 hover:bg-red-400/10 hover:text-red-400 h-7 px-2"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Payment Config Section ───────────────────────────────────────────────────

function PaymentConfigSection() {
  const { data: config, isLoading: configLoading } = useGetPaymentConfig();
  const setPaymentConfig = useSetPaymentConfig();

  const [form, setForm] = useState<PaymentConfig>({
    upiId: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
  });

  // Pre-fill from backend when data loads
  useEffect(() => {
    if (config) {
      setForm({
        upiId: config.upiId ?? "",
        bankName: config.bankName ?? "",
        accountHolder: config.accountHolder ?? "",
        accountNumber: config.accountNumber ?? "",
        ifscCode: config.ifscCode ?? "",
      });
    }
  }, [config]);

  const handleSave = () => {
    setPaymentConfig.mutate(form, {
      onSuccess: () => toast.success("Payment config saved successfully"),
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  if (configLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <Card className="card-game">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Payment Details Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* UPI */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold">UPI Details</h4>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cfg-upi" className="text-sm font-semibold">
              UPI ID
            </Label>
            <Input
              id="cfg-upi"
              data-ocid="admin.payconfig.upi.input"
              value={form.upiId ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, upiId: e.target.value }))
              }
              placeholder="e.g. merchant@upi"
              className="bg-input/50 border-border focus:border-primary"
            />
          </div>
        </div>

        <Separator className="border-border/50" />

        {/* Bank */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold">Bank Transfer Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cfg-bank" className="text-sm font-semibold">
                Bank Name
              </Label>
              <Input
                id="cfg-bank"
                data-ocid="admin.payconfig.bank.input"
                value={form.bankName ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bankName: e.target.value }))
                }
                placeholder="e.g. State Bank of India"
                className="bg-input/50 border-border focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-holder" className="text-sm font-semibold">
                Account Holder Name
              </Label>
              <Input
                id="cfg-holder"
                data-ocid="admin.payconfig.holder.input"
                value={form.accountHolder ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountHolder: e.target.value }))
                }
                placeholder="e.g. Omni Store Pvt Ltd"
                className="bg-input/50 border-border focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-accno" className="text-sm font-semibold">
                Account Number
              </Label>
              <Input
                id="cfg-accno"
                data-ocid="admin.payconfig.account.input"
                value={form.accountNumber ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accountNumber: e.target.value }))
                }
                placeholder="e.g. 1234567890"
                className="bg-input/50 border-border focus:border-primary font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cfg-ifsc" className="text-sm font-semibold">
                IFSC Code
              </Label>
              <Input
                id="cfg-ifsc"
                data-ocid="admin.payconfig.ifsc.input"
                value={form.ifscCode ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ifscCode: e.target.value }))
                }
                placeholder="e.g. SBIN0001234"
                className="bg-input/50 border-border focus:border-primary font-mono uppercase"
              />
            </div>
          </div>
        </div>

        <Button
          data-ocid="admin.payconfig.save.submit_button"
          onClick={handleSave}
          disabled={setPaymentConfig.isPending}
          className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
        >
          {setPaymentConfig.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Settings2 className="w-4 h-4 mr-2" />
              Save Payment Config
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Shopping bag icon placeholder ───────────────────────────────────────────
function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      role="img"
      aria-label="Orders"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
      />
    </svg>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

export function AdminPage() {
  const { login, loginStatus } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success";
  const isLoggingIn = loginStatus === "logging-in";

  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();

  // Not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl gradient-blue-gold flex items-center justify-center mx-auto mb-6 glow-blue">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-black mb-2">
            Admin Access
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Please log in to access the admin panel
          </p>
          <Button
            onClick={login}
            disabled={isLoggingIn}
            className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
            data-ocid="auth.login.button"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Login to Continue"
            )}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Checking admin status
  if (checkingAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center" data-ocid="admin.loading_state">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
          data-ocid="admin.error_state"
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/20 border border-destructive/30 flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-black mb-2 text-destructive">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm">
            You don't have admin privileges to access this page.
          </p>
        </motion.div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="min-h-screen">
      {/* Header Banner */}
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
        <div className="container mx-auto px-4 max-w-7xl py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl gradient-blue-gold flex items-center justify-center shrink-0 glow-blue">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-black">
                Admin Panel
              </h1>
              <p className="text-muted-foreground text-sm">
                Omni Official Store — Manage packages, orders, and wallets
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <Tabs defaultValue="packages">
          <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger
              value="packages"
              data-ocid="admin.packages.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <Diamond className="w-4 h-4 mr-2" />
              Packages
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              data-ocid="admin.orders.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <ShoppingBagIcon className="w-4 h-4 mr-2 inline" />
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="wallet"
              data-ocid="admin.wallet.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger
              value="topup"
              data-ocid="admin.topup.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <ReceiptText className="w-4 h-4 mr-2" />
              Top-up Requests
            </TabsTrigger>
            <TabsTrigger
              value="redeem"
              data-ocid="admin.redeem.codes.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Redeem Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            <PackagesTab />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="wallet">
            <WalletTab />
          </TabsContent>
          <TabsContent value="topup">
            <TopUpRequestsTab />
          </TabsContent>
          <TabsContent value="redeem">
            <RedeemCodesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
