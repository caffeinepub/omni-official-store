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
import { Switch } from "@/components/ui/switch";
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
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Diamond,
  GamepadIcon,
  Image,
  KeyRound,
  Landmark,
  Loader2,
  LogOut,
  PackagePlus,
  Paintbrush,
  Pencil,
  QrCode,
  ReceiptText,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
  Wallet,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Banner,
  DiamondPackage,
  Game,
  Order,
  PaymentConfig,
  RedeemCode,
  SiteConfig,
  TopUpRequest,
} from "../backend.d";
import { OrderStatus, PaymentMethod, TopUpRequestStatus } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddBanner,
  useAddGame,
  useAddPackage,
  useApproveTopUpRequest,
  useCreditWallet,
  useGenerateRedeemCode,
  useGetAllOrders,
  useGetAllRedeemCodes,
  useGetAllTopUpRequests,
  useGetBanners,
  useGetGames,
  useGetPackages,
  useGetPaymentConfig,
  useGetSiteConfig,
  useGetUserStats,
  useRejectTopUpRequest,
  useRemoveBanner,
  useRemoveGame,
  useRemovePackage,
  useSetPaymentConfig,
  useSetSiteConfig,
  useUpdateBanner,
  useUpdateGame,
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

// Default packages to seed when the store is empty
const DEFAULT_MLBB_PACKAGES = [
  { name: "Starter", diamondAmount: 86n, price: 75n },
  { name: "Basic", diamondAmount: 172n, price: 149n },
  { name: "Value", diamondAmount: 257n, price: 219n },
  { name: "Standard", diamondAmount: 344n, price: 289n },
  { name: "Plus", diamondAmount: 706n, price: 579n },
  { name: "Pro", diamondAmount: 2195n, price: 1749n },
  { name: "Elite", diamondAmount: 4390n, price: 3499n },
  { name: "Ultimate", diamondAmount: 9288n, price: 7299n },
];

const DEFAULT_HOK_PACKAGES = [
  { name: "Starter", diamondAmount: 100n, price: 85n },
  { name: "Basic", diamondAmount: 200n, price: 165n },
  { name: "Value", diamondAmount: 300n, price: 245n },
  { name: "Standard", diamondAmount: 500n, price: 399n },
  { name: "Plus", diamondAmount: 1000n, price: 789n },
  { name: "Pro", diamondAmount: 2000n, price: 1549n },
  { name: "Elite", diamondAmount: 4000n, price: 3099n },
  { name: "Ultimate", diamondAmount: 8000n, price: 5999n },
];

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
  // Also fetch MLBB packages to detect if we need to seed (always watch game 1)
  const { data: mlbbPackages, isLoading: mlbbLoading } = useGetPackages(1n);
  const addPackage = useAddPackage();
  const updatePackage = useUpdatePackage();
  const removePackage = useRemovePackage();

  // Auto-seed default packages when store is empty
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (seeded) return;
    if (mlbbLoading) return;
    if (!mlbbPackages) return;
    if (mlbbPackages.length > 0) {
      // Already has packages — no need to seed
      setSeeded(true);
      return;
    }

    // Packages are empty — seed defaults for both games
    const seedAll = async () => {
      setSeeded(true); // prevent re-runs
      toast.loading("Setting up default packages...", { id: "seed-toast" });

      try {
        // Seed MLBB packages (gameId = 1n)
        for (const pkg of DEFAULT_MLBB_PACKAGES) {
          await addPackage.mutateAsync({
            gameId: 1n,
            name: pkg.name,
            diamondAmount: pkg.diamondAmount,
            price: pkg.price,
          });
        }

        // Seed HOK packages (gameId = 2n)
        for (const pkg of DEFAULT_HOK_PACKAGES) {
          await addPackage.mutateAsync({
            gameId: 2n,
            name: pkg.name,
            diamondAmount: pkg.diamondAmount,
            price: pkg.price,
          });
        }

        toast.success("Default packages ready!", { id: "seed-toast" });
      } catch {
        toast.error("Failed to set up default packages. Please try again.", {
          id: "seed-toast",
        });
      }
    };

    seedAll();
  }, [mlbbPackages, mlbbLoading, seeded, addPackage.mutateAsync]);

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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: stats, isLoading, refetch, isFetching } = useGetUserStats();

  const statCards = [
    {
      key: "usersThisMonth",
      label: "Monthly Registrations",
      value: stats?.usersThisMonth,
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    },
    {
      key: "activeCustomers",
      label: "Active Customers",
      value: stats?.activeCustomers,
      icon: UserCheck,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      key: "totalUsers",
      label: "Total Users",
      value: stats?.totalUsers,
      icon: Users2,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      key: "totalOrders",
      label: "Total Orders",
      value: stats?.totalOrders,
      icon: ShoppingBag,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    },
    {
      key: "pendingOrders",
      label: "Pending Orders",
      value: stats?.pendingOrders,
      icon: Clock,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10 border-yellow-500/20",
    },
    {
      key: "completedOrders",
      label: "Completed Orders",
      value: stats?.completedOrders,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      key: "totalRevenue",
      label: "Total Revenue",
      value: stats?.totalRevenue,
      icon: TrendingUp,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      isRevenue: true,
    },
    {
      key: "pendingTopUps",
      label: "Pending Top-ups",
      value: stats?.pendingTopUps,
      icon: ReceiptText,
      color: "text-orange-400",
      bg: "bg-orange-500/10 border-orange-500/20",
    },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-black">Store Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            End-of-month statistics and activity summary
          </p>
        </div>
        <Button
          data-ocid="admin.overview.refresh.button"
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-border text-muted-foreground hover:text-foreground hover:border-primary/50 shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh Stats
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-ocid={`admin.overview.${card.key}.card`}
            >
              <Card className={`card-game border ${card.bg}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide leading-tight">
                      {card.label}
                    </p>
                    <div
                      className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </div>
                  {isLoading ? (
                    <Skeleton
                      className="h-8 w-20 mt-1"
                      data-ocid="admin.overview.loading_state"
                    />
                  ) : (
                    <p
                      className={`text-2xl font-black font-display ${card.color}`}
                    >
                      {"isRevenue" in card && card.isRevenue
                        ? formatPrice(card.value ?? 0n)
                        : Number(card.value ?? 0n).toLocaleString("en-IN")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Monthly highlight callout */}
      {!isLoading && stats && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl p-5 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border border-primary/20"
        >
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                This Month
              </p>
              <p className="text-3xl font-black font-display text-cyan-400 mt-0.5">
                {Number(stats.usersThisMonth).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-muted-foreground">new registrations</p>
            </div>
            <Separator
              orientation="vertical"
              className="h-14 bg-border/50 hidden sm:block"
            />
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Active Now
              </p>
              <p className="text-3xl font-black font-display text-emerald-400 mt-0.5">
                {Number(stats.activeCustomers).toLocaleString("en-IN")}
              </p>
              <p className="text-sm text-muted-foreground">active customers</p>
            </div>
            <Separator
              orientation="vertical"
              className="h-14 bg-border/50 hidden sm:block"
            />
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Total Revenue
              </p>
              <p className="text-3xl font-black font-display text-amber-400 mt-0.5">
                {formatPrice(stats.totalRevenue)}
              </p>
              <p className="text-sm text-muted-foreground">all time</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Customize Tab ────────────────────────────────────────────────────────────

const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: "Omni Official Store",
  tagline: "Your #1 Diamond Top-up Destination",
  logoUrl: "",
  featuredSectionHeading: "Featured Games",
  footerText: "",
  primaryColor: "#3b82f6",
  backgroundColor: "#020617",
  discountPercent: 0n,
  promoText: "",
  banners: [],
};

function CustomizeTab() {
  const { data: siteConfig, isLoading: configLoading } = useGetSiteConfig();
  const setSiteConfig = useSetSiteConfig();
  const config = siteConfig ?? DEFAULT_SITE_CONFIG;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-black">
          Website Customization
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Control all aspects of your store's appearance and content
        </p>
      </div>

      <Tabs defaultValue="branding">
        <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger
            value="branding"
            data-ocid="customize.branding.tab"
            className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs"
          >
            <Paintbrush className="w-3.5 h-3.5 mr-1.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger
            value="banners"
            data-ocid="customize.banners.tab"
            className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs"
          >
            <Image className="w-3.5 h-3.5 mr-1.5" />
            Banners
          </TabsTrigger>
          <TabsTrigger
            value="games"
            data-ocid="customize.games.tab"
            className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs"
          >
            <GamepadIcon className="w-3.5 h-3.5 mr-1.5" />
            Games
          </TabsTrigger>
          <TabsTrigger
            value="promo"
            data-ocid="customize.promo.tab"
            className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs"
          >
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            Discount & Promo
          </TabsTrigger>
          <TabsTrigger
            value="theme"
            data-ocid="customize.theme.tab"
            className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold text-xs"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Theme Colors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <BrandingSection
            config={config}
            configLoading={configLoading}
            setSiteConfig={setSiteConfig}
          />
        </TabsContent>
        <TabsContent value="banners">
          <BannersSection />
        </TabsContent>
        <TabsContent value="games">
          <GamesSection />
        </TabsContent>
        <TabsContent value="promo">
          <PromoSection
            config={config}
            configLoading={configLoading}
            setSiteConfig={setSiteConfig}
          />
        </TabsContent>
        <TabsContent value="theme">
          <ThemeSection
            config={config}
            configLoading={configLoading}
            setSiteConfig={setSiteConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Branding Section ──────────────────────────────────────────────────────────

function BrandingSection({
  config,
  configLoading,
  setSiteConfig,
}: {
  config: SiteConfig;
  configLoading: boolean;
  setSiteConfig: ReturnType<typeof useSetSiteConfig>;
}) {
  const [form, setForm] = useState({
    siteName: "",
    tagline: "",
    logoUrl: "",
    featuredSectionHeading: "",
    footerText: "",
  });

  useEffect(() => {
    if (config) {
      setForm({
        siteName: config.siteName ?? "",
        tagline: config.tagline ?? "",
        logoUrl: config.logoUrl ?? "",
        featuredSectionHeading: config.featuredSectionHeading ?? "",
        footerText: config.footerText ?? "",
      });
    }
  }, [config]);

  const handleSave = () => {
    setSiteConfig.mutate(
      { ...config, ...form },
      {
        onSuccess: () => toast.success("Branding saved successfully"),
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  if (configLoading) return <Skeleton className="h-80 w-full rounded-xl" />;

  return (
    <Card className="card-game max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-primary" />
          Branding Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Site Name</Label>
          <Input
            data-ocid="customize.branding.sitename.input"
            value={form.siteName}
            onChange={(e) =>
              setForm((f) => ({ ...f, siteName: e.target.value }))
            }
            placeholder="e.g. Omni Official Store"
            className="bg-input/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Tagline</Label>
          <Input
            data-ocid="customize.branding.tagline.input"
            value={form.tagline}
            onChange={(e) =>
              setForm((f) => ({ ...f, tagline: e.target.value }))
            }
            placeholder="e.g. Your #1 Diamond Top-up Destination"
            className="bg-input/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Logo URL</Label>
          <Input
            data-ocid="customize.branding.logo.input"
            value={form.logoUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, logoUrl: e.target.value }))
            }
            placeholder="https://... or /assets/logo.png"
            className="bg-input/50 border-border focus:border-primary"
          />
          {form.logoUrl && (
            <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-2">Preview:</p>
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="h-10 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">
            Featured Section Heading
          </Label>
          <Input
            data-ocid="customize.branding.heading.input"
            value={form.featuredSectionHeading}
            onChange={(e) =>
              setForm((f) => ({ ...f, featuredSectionHeading: e.target.value }))
            }
            placeholder="e.g. Featured Games"
            className="bg-input/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Footer Text</Label>
          <Input
            data-ocid="customize.branding.footer.input"
            value={form.footerText}
            onChange={(e) =>
              setForm((f) => ({ ...f, footerText: e.target.value }))
            }
            placeholder="e.g. © 2025 Omni Official Store. All rights reserved."
            className="bg-input/50 border-border focus:border-primary"
          />
        </div>
        <Button
          data-ocid="customize.branding.save.submit_button"
          onClick={handleSave}
          disabled={setSiteConfig.isPending}
          className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
        >
          {setSiteConfig.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Paintbrush className="w-4 h-4 mr-2" />
          )}
          {setSiteConfig.isPending ? "Saving..." : "Save Branding"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Banners Section ──────────────────────────────────────────────────────────

type BannerFormData = {
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
};

const emptyBannerForm: BannerFormData = {
  imageUrl: "",
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
};

function BannersSection() {
  const { data: banners, isLoading } = useGetBanners();
  const addBanner = useAddBanner();
  const updateBanner = useUpdateBanner();
  const removeBanner = useRemoveBanner();

  const [addOpen, setAddOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormData>(emptyBannerForm);

  const openAdd = () => {
    setForm(emptyBannerForm);
    setAddOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner(b);
    setForm({
      imageUrl: b.imageUrl,
      title: b.title,
      subtitle: b.subtitle,
      ctaText: b.ctaText,
      ctaLink: b.ctaLink,
    });
  };

  const handleAdd = () => {
    if (!form.imageUrl || !form.title) {
      toast.error("Image URL and Title are required");
      return;
    }
    addBanner.mutate(form, {
      onSuccess: () => {
        toast.success("Banner added");
        setAddOpen(false);
      },
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  const handleEdit = () => {
    if (!editBanner) return;
    if (!form.imageUrl || !form.title) {
      toast.error("Image URL and Title are required");
      return;
    }
    updateBanner.mutate(
      { bannerId: editBanner.id, ...form },
      {
        onSuccess: () => {
          toast.success("Banner updated");
          setEditBanner(null);
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteBanner) return;
    removeBanner.mutate(deleteBanner.id, {
      onSuccess: () => {
        toast.success("Banner deleted");
        setDeleteBanner(null);
      },
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Banners</h3>
        <Button
          data-ocid="customize.banners.add.button"
          size="sm"
          onClick={openAdd}
          className="gradient-blue-gold text-white font-bold border-0"
        >
          <Image className="w-3.5 h-3.5 mr-2" />
          Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : !banners || banners.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-14 text-center card-game rounded-xl"
          data-ocid="customize.banners.empty_state"
        >
          <Image className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-semibold">No banners yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add your first banner above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id.toString()}
              data-ocid={`customize.banner.item.${index + 1}`}
              className="card-game rounded-xl p-4 flex items-center gap-4"
            >
              {banner.imageUrl && (
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-20 h-14 object-cover rounded-lg shrink-0 border border-border/50"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{banner.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {banner.subtitle}
                </p>
                <p className="text-xs text-primary/70 truncate mt-0.5">
                  CTA: {banner.ctaText} → {banner.ctaLink}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  data-ocid={`customize.banner.edit_button.${index + 1}`}
                  onClick={() => openEdit(banner)}
                  className="text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-ocid={`customize.banner.delete_button.${index + 1}`}
                  onClick={() => setDeleteBanner(banner)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Banner Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="bg-card border-border"
          data-ocid="customize.banner.add.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Add Banner
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new banner to your homepage carousel
            </DialogDescription>
          </DialogHeader>
          <BannerFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              data-ocid="customize.banner.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="customize.banner.add.submit_button"
              onClick={handleAdd}
              disabled={addBanner.isPending}
              className="gradient-blue-gold text-white font-bold border-0"
            >
              {addBanner.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Image className="w-4 h-4 mr-2" />
              )}
              {addBanner.isPending ? "Adding..." : "Add Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Banner Dialog */}
      <Dialog
        open={!!editBanner}
        onOpenChange={(o) => !o && setEditBanner(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Edit Banner
            </DialogTitle>
          </DialogHeader>
          <BannerFormFields form={form} setForm={setForm} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditBanner(null)}
              data-ocid="customize.banner.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="customize.banner.edit.submit_button"
              onClick={handleEdit}
              disabled={updateBanner.isPending}
              className="gradient-blue-gold text-white font-bold border-0"
            >
              {updateBanner.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {updateBanner.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Banner Dialog */}
      <Dialog
        open={!!deleteBanner}
        onOpenChange={(o) => !o && setDeleteBanner(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">
              Delete Banner
            </DialogTitle>
            <DialogDescription>
              Delete{" "}
              <strong className="text-foreground">{deleteBanner?.title}</strong>
              ? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteBanner(null)}
              data-ocid="customize.banner.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-ocid="customize.banner.delete.confirm_button"
              onClick={handleDelete}
              disabled={removeBanner.isPending}
            >
              {removeBanner.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {removeBanner.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BannerFormFields({
  form,
  setForm,
}: {
  form: BannerFormData;
  setForm: (f: BannerFormData) => void;
}) {
  return (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Image URL *</Label>
        <Input
          data-ocid="customize.banner.imageurl.input"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://... or /assets/banner.jpg"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Title *</Label>
        <Input
          data-ocid="customize.banner.title.input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Mobile Legends"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Subtitle</Label>
        <Input
          data-ocid="customize.banner.subtitle.input"
          value={form.subtitle}
          onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
          placeholder="e.g. Top up Diamonds instantly"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">CTA Button Text</Label>
          <Input
            data-ocid="customize.banner.ctatext.input"
            value={form.ctaText}
            onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
            placeholder="e.g. Top Up Now"
            className="bg-input/50 border-border focus:border-primary"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">CTA Link</Label>
          <Input
            data-ocid="customize.banner.ctalink.input"
            value={form.ctaLink}
            onChange={(e) => setForm({ ...form, ctaLink: e.target.value })}
            placeholder="e.g. /game/mlbb"
            className="bg-input/50 border-border focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Games Section ────────────────────────────────────────────────────────────

type GameFormData = {
  name: string;
  description: string;
  currency: string;
  inStock: boolean;
};

const emptyGameForm: GameFormData = {
  name: "",
  description: "",
  currency: "Diamonds",
  inStock: true,
};

function GamesSection() {
  const { data: games, isLoading } = useGetGames();
  const addGame = useAddGame();
  const updateGame = useUpdateGame();
  const removeGame = useRemoveGame();

  const [addOpen, setAddOpen] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [deleteGame, setDeleteGame] = useState<Game | null>(null);
  const [form, setForm] = useState<GameFormData>(emptyGameForm);

  const openAdd = () => {
    setForm(emptyGameForm);
    setAddOpen(true);
  };

  const openEdit = (g: Game) => {
    setEditGame(g);
    setForm({
      name: g.name,
      description: g.description,
      currency: g.currency,
      inStock: g.inStock,
    });
  };

  const handleAdd = () => {
    if (!form.name || !form.currency) {
      toast.error("Name and Currency are required");
      return;
    }
    addGame.mutate(
      {
        name: form.name,
        description: form.description,
        currency: form.currency,
      },
      {
        onSuccess: () => {
          toast.success("Game added");
          setAddOpen(false);
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  const handleEdit = () => {
    if (!editGame) return;
    if (!form.name || !form.currency) {
      toast.error("Name and Currency are required");
      return;
    }
    updateGame.mutate(
      {
        gameId: editGame.id,
        name: form.name,
        description: form.description,
        currency: form.currency,
        inStock: form.inStock,
      },
      {
        onSuccess: () => {
          toast.success("Game updated");
          setEditGame(null);
        },
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteGame) return;
    removeGame.mutate(deleteGame.id, {
      onSuccess: () => {
        toast.success("Game deleted");
        setDeleteGame(null);
      },
      onError: (e) =>
        toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
    });
  };

  const handleToggleStock = (g: Game) => {
    updateGame.mutate(
      {
        gameId: g.id,
        name: g.name,
        description: g.description,
        currency: g.currency,
        inStock: !g.inStock,
      },
      {
        onSuccess: () =>
          toast.success(
            `${g.name} marked as ${!g.inStock ? "In Stock" : "Out of Stock"}`,
          ),
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Games</h3>
        <Button
          data-ocid="customize.games.add.button"
          size="sm"
          onClick={openAdd}
          className="gradient-blue-gold text-white font-bold border-0"
        >
          <GamepadIcon className="w-3.5 h-3.5 mr-2" />
          Add Game
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : !games || games.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-14 text-center card-game rounded-xl"
          data-ocid="customize.games.empty_state"
        >
          <GamepadIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-semibold">No games yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add games to display on the homepage
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game, index) => (
            <div
              key={game.id.toString()}
              data-ocid={`customize.game.item.${index + 1}`}
              className="card-game rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <GamepadIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm">{game.name}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold border ${
                      game.inStock
                        ? "border-emerald-500/40 text-emerald-400"
                        : "border-red-500/40 text-red-400"
                    }`}
                  >
                    {game.inStock ? "In Stock" : "Out of Stock"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Currency: {game.currency}
                  {game.description && ` • ${game.description}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {game.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                  <Switch
                    checked={game.inStock}
                    onCheckedChange={() => handleToggleStock(game)}
                    data-ocid={`customize.game.stock.switch.${index + 1}`}
                    disabled={updateGame.isPending}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  data-ocid={`customize.game.edit_button.${index + 1}`}
                  onClick={() => openEdit(game)}
                  className="text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  data-ocid={`customize.game.delete_button.${index + 1}`}
                  onClick={() => setDeleteGame(game)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Game Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          className="bg-card border-border"
          data-ocid="customize.game.add.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Add Game</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Add a new game to your store
            </DialogDescription>
          </DialogHeader>
          <GameFormFields form={form} setForm={setForm} showStock={false} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              data-ocid="customize.game.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="customize.game.add.submit_button"
              onClick={handleAdd}
              disabled={addGame.isPending}
              className="gradient-blue-gold text-white font-bold border-0"
            >
              {addGame.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {addGame.isPending ? "Adding..." : "Add Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Game Dialog */}
      <Dialog open={!!editGame} onOpenChange={(o) => !o && setEditGame(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Edit Game
            </DialogTitle>
          </DialogHeader>
          <GameFormFields form={form} setForm={setForm} showStock={true} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditGame(null)}
              data-ocid="customize.game.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              data-ocid="customize.game.edit.submit_button"
              onClick={handleEdit}
              disabled={updateGame.isPending}
              className="gradient-blue-gold text-white font-bold border-0"
            >
              {updateGame.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {updateGame.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Game Dialog */}
      <Dialog
        open={!!deleteGame}
        onOpenChange={(o) => !o && setDeleteGame(null)}
      >
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-destructive">
              Delete Game
            </DialogTitle>
            <DialogDescription>
              Delete{" "}
              <strong className="text-foreground">{deleteGame?.name}</strong>?
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteGame(null)}
              data-ocid="customize.game.cancel_button"
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-ocid="customize.game.delete.confirm_button"
              onClick={handleDelete}
              disabled={removeGame.isPending}
            >
              {removeGame.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {removeGame.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GameFormFields({
  form,
  setForm,
  showStock,
}: {
  form: GameFormData;
  setForm: (f: GameFormData) => void;
  showStock: boolean;
}) {
  return (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Game Name *</Label>
        <Input
          data-ocid="customize.game.name.input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Mobile Legends: Bang Bang"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Description</Label>
        <Input
          data-ocid="customize.game.description.input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="e.g. Top up Diamonds instantly"
          className="bg-input/50 border-border focus:border-primary"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">In-game Currency *</Label>
        <Input
          data-ocid="customize.game.currency.input"
          value={form.currency}
          onChange={(e) => setForm({ ...form, currency: e.target.value })}
          placeholder="e.g. Diamonds, Tokens, Coins"
          className="bg-input/50 border-border focus:border-primary"
        />
        <p className="text-xs text-muted-foreground">
          Used in the top-up page (e.g. "Get 500 Diamonds")
        </p>
      </div>
      {showStock && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <Switch
            id="game-instock"
            checked={form.inStock}
            onCheckedChange={(v) => setForm({ ...form, inStock: v })}
            data-ocid="customize.game.instock.switch"
          />
          <Label
            htmlFor="game-instock"
            className="text-sm font-semibold cursor-pointer"
          >
            In Stock{" "}
            <span className="text-muted-foreground font-normal">
              (uncheck to show "Out of Stock" on the top-up page)
            </span>
          </Label>
        </div>
      )}
    </div>
  );
}

// ─── Promo Section ────────────────────────────────────────────────────────────

function PromoSection({
  config,
  configLoading,
  setSiteConfig,
}: {
  config: SiteConfig;
  configLoading: boolean;
  setSiteConfig: ReturnType<typeof useSetSiteConfig>;
}) {
  const [discount, setDiscount] = useState("");
  const [promoText, setPromoText] = useState("");

  useEffect(() => {
    if (config) {
      setDiscount(config.discountPercent?.toString() ?? "0");
      setPromoText(config.promoText ?? "");
    }
  }, [config]);

  const handleSave = () => {
    const discountNum = Number(discount);
    if (Number.isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      toast.error("Discount must be between 0 and 100");
      return;
    }
    setSiteConfig.mutate(
      {
        ...config,
        discountPercent: BigInt(Math.floor(discountNum)),
        promoText,
      },
      {
        onSuccess: () => toast.success("Promo settings saved"),
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  if (configLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <Card className="card-game max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" />
          Discount & Promo Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">
            Discount Percent (0–100)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              data-ocid="customize.promo.discount.input"
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
              className="bg-input/50 border-border focus:border-primary w-28"
            />
            {Number(discount) > 0 && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold">
                {discount}% OFF
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Set to 0 to disable discounts. Discount applies to all packages.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Promo Banner Text</Label>
          <Input
            data-ocid="customize.promo.text.input"
            value={promoText}
            onChange={(e) => setPromoText(e.target.value)}
            placeholder="e.g. ⚡ Flash Sale! 10% off all packages today only"
            className="bg-input/50 border-border focus:border-primary"
          />
          <p className="text-xs text-muted-foreground">
            Displayed as a pill/banner below the carousel on the homepage. Leave
            empty to hide.
          </p>
        </div>

        {promoText && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center gap-2">
            <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-sm text-amber-300 font-semibold">
              {promoText}
            </span>
          </div>
        )}

        <Button
          data-ocid="customize.promo.save.submit_button"
          onClick={handleSave}
          disabled={setSiteConfig.isPending}
          className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
        >
          {setSiteConfig.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Tag className="w-4 h-4 mr-2" />
          )}
          {setSiteConfig.isPending ? "Saving..." : "Save Promo Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Theme Section ────────────────────────────────────────────────────────────

function ThemeSection({
  config,
  configLoading,
  setSiteConfig,
}: {
  config: SiteConfig;
  configLoading: boolean;
  setSiteConfig: ReturnType<typeof useSetSiteConfig>;
}) {
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [bgColor, setBgColor] = useState("#020617");

  useEffect(() => {
    if (config) {
      setPrimaryColor(config.primaryColor || "#3b82f6");
      setBgColor(config.backgroundColor || "#020617");
    }
  }, [config]);

  const handleSave = () => {
    setSiteConfig.mutate(
      { ...config, primaryColor, backgroundColor: bgColor },
      {
        onSuccess: () => toast.success("Theme colors saved"),
        onError: (e) =>
          toast.error(`Failed: ${e instanceof Error ? e.message : "Error"}`),
      },
    );
  };

  if (configLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <Card className="card-game max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Theme Colors
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Primary Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                data-ocid="customize.theme.primary.input"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <div className="flex-1">
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3b82f6"
                  className="bg-input/50 border-border focus:border-primary font-mono text-sm"
                />
              </div>
            </div>
            <div
              className="h-10 rounded-lg border border-border/50 flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: primaryColor, color: "#fff" }}
            >
              Primary Color Preview
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Background Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                data-ocid="customize.theme.bg.input"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-border cursor-pointer bg-transparent"
              />
              <div className="flex-1">
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  placeholder="#020617"
                  className="bg-input/50 border-border focus:border-primary font-mono text-sm"
                />
              </div>
            </div>
            <div
              className="h-10 rounded-lg border border-border/50 flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: bgColor,
                color:
                  bgColor.toLowerCase() === "#020617" ||
                  bgColor.toLowerCase().startsWith("#0")
                    ? "#fff"
                    : "#000",
              }}
            >
              Background Preview
            </div>
          </div>
        </div>

        {/* Combined preview */}
        <div
          className="rounded-xl p-4 border border-border/50 flex items-center gap-4"
          style={{ backgroundColor: bgColor }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            O
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: primaryColor }}>
              Omni Official Store
            </p>
            <p className="text-xs" style={{ color: `${primaryColor}80` }}>
              Combined color preview
            </p>
          </div>
        </div>

        <Button
          data-ocid="customize.theme.save.submit_button"
          onClick={handleSave}
          disabled={setSiteConfig.isPending}
          className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
        >
          {setSiteConfig.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Settings2 className="w-4 h-4 mr-2" />
          )}
          {setSiteConfig.isPending ? "Saving..." : "Save Theme Colors"}
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

// ─── Admin Credentials ────────────────────────────────────────────────────────

const ADMIN_USERNAME = "omni_admin";
// Never stored in plain text — hashed at runtime against the entered password
const ADMIN_PASSWORD = "Omni@2024";
// The Caffeine admin token — stored to localStorage so useActor can use it after II redirect
const CAFFEINE_ADMIN_TOKEN =
  "377fe7b083febffb7257d67a8c154bad9645538e0995c97c99df493c63c7be68";

async function hashString(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

// Login step states:
// "password" → username/password form
// "identity" → password OK, now connect II
// "upgrading" → II connected, calling upgradeToAdmin
// "done" → fully authenticated, show admin panel
type LoginStep = "password" | "identity" | "upgrading" | "done";

export function AdminPage() {
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();

  // Determine initial step: if session says authed AND identity is already loaded,
  // skip straight to "upgrading" to verify the stored session.
  const [loginStep, setLoginStep] = useState<LoginStep>(() => {
    if (sessionStorage.getItem("omni_admin_authed") === "true") {
      // Will be resolved in the useEffect below once identity/actor are ready
      return "upgrading";
    }
    return "password";
  });

  const [passwordVerified, setPasswordVerified] = useState<boolean>(
    () => sessionStorage.getItem("omni_admin_authed") === "true",
  );

  const [enteredUsername, setEnteredUsername] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [isCheckingPwd, setIsCheckingPwd] = useState(false);

  // ── Step 1: Password gate ──────────────────────────────────────────────────
  const handleAdminLogin = async () => {
    if (!enteredUsername.trim() || !enteredPassword) {
      setLoginError("Please enter both username and password");
      return;
    }
    setLoginError("");
    setIsCheckingPwd(true);
    try {
      const [inputHash, correctHash] = await Promise.all([
        hashString(enteredPassword),
        hashString(ADMIN_PASSWORD),
      ]);
      if (
        enteredUsername.trim() === ADMIN_USERNAME &&
        inputHash === correctHash
      ) {
        // Store the admin token BEFORE triggering II login so useActor picks it up
        localStorage.setItem("caffeineAdminToken", CAFFEINE_ADMIN_TOKEN);
        sessionStorage.setItem("caffeineAdminToken", CAFFEINE_ADMIN_TOKEN);
        setPasswordVerified(true);
        setLoginStep("identity");
      } else {
        setLoginError("Invalid username or password");
      }
    } catch {
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsCheckingPwd(false);
    }
  };

  // ── Step 2: Trigger II login ───────────────────────────────────────────────
  const handleConnectII = () => {
    // Token must be stored before login() is called so it survives the redirect
    localStorage.setItem("caffeineAdminToken", CAFFEINE_ADMIN_TOKEN);
    sessionStorage.setItem("caffeineAdminToken", CAFFEINE_ADMIN_TOKEN);
    login();
  };

  // ── Step 3: upgradeToAdmin after identity + actor are ready ───────────────
  // Flag to prevent double-calling upgradeToAdmin
  const [upgradeAttemptedFlag, setUpgradeAttemptedFlag] = useState(false);

  useEffect(() => {
    if (!passwordVerified || loginStep === "password" || loginStep === "done") {
      return;
    }

    // We need: identity present + actor ready + not already upgrading/done
    if (!identity || actorFetching || !actor) {
      return;
    }

    if (upgradeAttemptedFlag) return;

    setUpgradeAttemptedFlag(true);
    setLoginStep("upgrading");
    setIsVerifyingAdmin(true);

    actor
      .upgradeToAdmin(CAFFEINE_ADMIN_TOKEN)
      .then((success) => {
        if (success) {
          sessionStorage.setItem("omni_admin_authed", "true");
          setLoginStep("done");
        } else {
          setLoginError("Admin token verification failed. Access denied.");
          setLoginStep("identity");
          setUpgradeAttemptedFlag(false);
        }
      })
      .catch((err: unknown) => {
        setLoginError(
          `Admin verification error: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        setLoginStep("identity");
        setUpgradeAttemptedFlag(false);
      })
      .finally(() => {
        setIsVerifyingAdmin(false);
      });
  }, [
    identity,
    actor,
    actorFetching,
    passwordVerified,
    loginStep,
    upgradeAttemptedFlag,
  ]);

  // If we start in "upgrading" (restored session), but identity never loads
  // (II session expired), fall back to password step after initialization
  useEffect(() => {
    if (
      loginStep === "upgrading" &&
      !isInitializing &&
      !identity &&
      !actorFetching
    ) {
      // Wait a tick, then if still no identity, send back to password
      const timer = setTimeout(() => {
        if (!identity) {
          sessionStorage.removeItem("omni_admin_authed");
          setPasswordVerified(false);
          setLoginStep("password");
          setUpgradeAttemptedFlag(false);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loginStep, isInitializing, identity, actorFetching]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    sessionStorage.removeItem("omni_admin_authed");
    localStorage.removeItem("caffeineAdminToken");
    sessionStorage.removeItem("caffeineAdminToken");
    setPasswordVerified(false);
    setLoginStep("password");
    setUpgradeAttemptedFlag(false);
    setEnteredUsername("");
    setEnteredPassword("");
    setLoginError("");
    clear();
  };

  // ─── Step 1: Password Form ──────────────────────────────────────────────────

  if (loginStep === "password") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Card className="card-game border border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-2xl gradient-blue-gold flex items-center justify-center mx-auto mb-4 glow-blue">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="font-display text-2xl font-black">
                Admin Login
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Enter your admin credentials to continue
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-username"
                  className="text-sm font-semibold"
                >
                  Username
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="admin-username"
                    data-ocid="admin.login.username.input"
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    value={enteredUsername}
                    onChange={(e) => {
                      setEnteredUsername(e.target.value);
                      setLoginError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    className="pl-10 bg-input/50 border-border focus:border-primary"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="admin-password"
                  className="text-sm font-semibold"
                >
                  Password
                </Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="admin-password"
                    data-ocid="admin.login.password.input"
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={enteredPassword}
                    onChange={(e) => {
                      setEnteredPassword(e.target.value);
                      setLoginError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    className="pl-10 bg-input/50 border-border focus:border-primary"
                  />
                </div>
              </div>

              {/* Error */}
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-ocid="admin.login.error_state"
                  className="text-sm text-destructive font-semibold text-center bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
                >
                  {loginError}
                </motion.p>
              )}

              {/* Login Button */}
              <Button
                data-ocid="admin.login.submit_button"
                onClick={handleAdminLogin}
                disabled={isCheckingPwd}
                className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue h-11"
              >
                {isCheckingPwd ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Login to Admin Panel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Step 2: Connect Internet Identity ─────────────────────────────────────

  if (loginStep === "identity") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <Card className="card-game border border-border shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-2xl gradient-blue-gold flex items-center justify-center mx-auto mb-4 glow-blue">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="font-display text-2xl font-black">
                Verify Admin Identity
              </CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                One more step – connect with Internet Identity to authenticate
                your admin session
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  data-ocid="admin.identity.error_state"
                  className="text-sm text-destructive font-semibold text-center bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
                >
                  {loginError}
                </motion.p>
              )}

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                <p className="text-xs text-muted-foreground">
                  Password verified ✓ — now connect your Internet Identity to
                  authorize admin operations on the blockchain.
                </p>
              </div>

              <Button
                data-ocid="admin.identity.connect.button"
                onClick={handleConnectII}
                disabled={isLoggingIn || isInitializing}
                className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue h-11"
              >
                {isLoggingIn || isInitializing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Connect with Internet Identity
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                data-ocid="admin.identity.back.button"
                onClick={() => {
                  setLoginStep("password");
                  setPasswordVerified(false);
                  setLoginError("");
                }}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                ← Back to password
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ─── Step 3: Upgrading / verifying admin role ───────────────────────────────

  if (loginStep === "upgrading" || isVerifyingAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-2xl gradient-blue-gold flex items-center justify-center mx-auto mb-4 glow-blue">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="font-display text-xl font-black mb-2">
            Verifying admin access...
          </h2>
          <p
            className="text-muted-foreground text-sm"
            data-ocid="admin.upgrading.loading_state"
          >
            Please wait while we confirm your admin privileges.
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Admin Panel ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* Header Banner */}
      <div className="border-b border-border bg-gradient-to-r from-primary/10 via-transparent to-accent/10">
        <div className="container mx-auto px-4 max-w-7xl py-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
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
            </div>
            <Button
              data-ocid="admin.logout.button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-border text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <Tabs defaultValue="overview">
          <TabsList className="bg-card border border-border mb-6 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger
              value="overview"
              data-ocid="admin.overview.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="customize"
              data-ocid="admin.customize.tab"
              className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold"
            >
              <Paintbrush className="w-4 h-4 mr-2" />
              Customize
            </TabsTrigger>
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

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="customize">
            <CustomizeTab />
          </TabsContent>
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
