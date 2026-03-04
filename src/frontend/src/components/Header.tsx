import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "@tanstack/react-router";
import {
  Diamond,
  Home,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useIsAdmin } from "../hooks/useQueries";
import { handleLogin } from "../utils/mobileLogin";

const navLinks = [
  { to: "/", label: "Home", icon: Home, ocid: "nav.home.link" },
  { to: "/wallet", label: "Wallet", icon: Wallet, ocid: "nav.wallet.link" },
  { to: "/orders", label: "Order", icon: ShoppingBag, ocid: "nav.order.link" },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    ocid: "nav.leaderboard.link",
  },
  { to: "/account", label: "Account", icon: User, ocid: "nav.account.link" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const location = useLocation();
  const isLoggedIn = loginStatus === "success";
  const isLoggingIn = loginStatus === "logging-in";
  const { data: isAdmin } = useIsAdmin();

  return (
    <header className="header-glass sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/assets/generated/omni-logo-transparent.dim_200x60.png"
            alt="Omni Official Store"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const sibling = target.nextElementSibling as HTMLElement;
              if (sibling) sibling.style.display = "flex";
            }}
          />
          <div className="hidden items-center gap-1.5">
            <Diamond className="w-6 h-6 text-primary" />
            <span className="font-display font-black text-lg text-gradient-gold">
              OMNI
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                data-ocid={link.ocid}
                className={`nav-link px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to="/admin"
              data-ocid="nav.admin.link"
              className={`nav-link px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                location.pathname === "/admin"
                  ? "text-accent bg-accent/10"
                  : "text-accent/70 hover:text-accent hover:bg-accent/5"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Button
              variant="outline"
              size="sm"
              onClick={clear}
              data-ocid="auth.logout.button"
              className="border-border text-foreground hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
            >
              Logout
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleLogin(login)}
              disabled={isLoggingIn}
              data-ocid="auth.login.button"
              className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
            >
              {isLoggingIn ? "Connecting..." : "Login"}
            </Button>
          )}
        </div>

        {/* Mobile Toggle */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              data-ocid="nav.mobile.toggle"
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="open"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-72 bg-card border-border p-0">
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-2">
                  <Diamond className="w-5 h-5 text-primary" />
                  <span className="font-display font-black text-base text-gradient-gold">
                    OMNI STORE
                  </span>
                </div>
              </div>

              <nav className="flex-1 p-4 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      data-ocid={link.ocid}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    data-ocid="nav.admin.link"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                      location.pathname === "/admin"
                        ? "bg-accent/15 text-accent"
                        : "text-accent/70 hover:bg-accent/10 hover:text-accent"
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Admin
                  </Link>
                )}
              </nav>

              <div className="p-4 border-t border-border">
                {isLoggedIn ? (
                  <Button
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      clear();
                      setMobileOpen(false);
                    }}
                    data-ocid="auth.logout.button"
                  >
                    Logout
                  </Button>
                ) : (
                  <Button
                    className="w-full gradient-blue-gold text-white font-bold border-0"
                    onClick={() => {
                      handleLogin(login);
                      setMobileOpen(false);
                    }}
                    disabled={isLoggingIn}
                    data-ocid="auth.login.button"
                  >
                    {isLoggingIn ? "Connecting..." : "Login"}
                  </Button>
                )}
                {identity && (
                  <p className="text-xs text-muted-foreground text-center mt-2 truncate">
                    {identity.getPrincipal().toString().slice(0, 20)}...
                  </p>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
