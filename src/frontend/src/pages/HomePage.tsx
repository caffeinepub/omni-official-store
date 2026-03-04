import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Gem,
  Home,
  ShoppingBag,
  Tag,
  Trophy,
  User,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Banner, Game } from "../backend.d";
import {
  useGetBanners,
  useGetGames,
  useGetSiteConfig,
} from "../hooks/useQueries";

// ─── Static fallbacks ────────────────────────────────────────────────────────

const STATIC_BANNERS = [
  {
    id: "static-1",
    imageUrl:
      "https://kachingku.com/wp-content/uploads/2024/11/mlbb-web-banner46.jpg",
    alt: "Mobile Legends Bang Bang",
    title: "Mobile Legends",
    subtitle: "Top up Diamonds & dominate the battlefield",
    ctaText: "Top Up MLBB",
    ctaLink: "/game/mlbb",
    gradient: "from-blue-950/70 via-blue-900/40 to-transparent",
  },
  {
    id: "static-2",
    imageUrl:
      "https://cdn.pokde.net/wp-content/uploads/2024/10/hokchamps24cover.jpg",
    alt: "Honor of Kings",
    title: "Honor of Kings",
    subtitle: "Get Diamonds & become a legendary warrior",
    ctaText: "Top Up HOK",
    ctaLink: "/game/hok",
    gradient: "from-red-950/70 via-red-900/40 to-transparent",
  },
  {
    id: "static-3",
    imageUrl:
      "https://cdn.store.link/uploads/store21327/cover-image.jpg?versionId=s0a4uKg_7YqVN_DlRnYOH7El.AAIzbc3",
    alt: "Special Promotions",
    title: "Special Offers",
    subtitle: "Best rates for diamond top-ups — every day",
    ctaText: "Shop Now",
    ctaLink: "/",
    gradient: "from-violet-950/70 via-violet-900/40 to-transparent",
  },
];

const STATIC_GAMES = [
  {
    id: "1",
    slug: "mlbb",
    name: "Mobile Legends: Bang Bang",
    subtitle: "Top up Diamonds instantly",
    image:
      "https://static.wikia.nocookie.net/mobile-legends/images/f/fb/MLBB_icon.png/revision/latest?cb=20241013132437",
    logo: "https://static.wikia.nocookie.net/mobile-legends/images/f/fb/MLBB_icon.png/revision/latest?cb=20241013132437",
    link: "/game/mlbb",
    ocid: "game.mlbb.button",
    color: "from-blue-600/20 to-indigo-800/20",
    border: "hover:border-blue-500/60",
    badge: "MLBB",
    bgColor: "#1a2040",
  },
  {
    id: "2",
    slug: "hok",
    name: "Honor of Kings",
    subtitle: "Top up Diamonds instantly",
    image: "/assets/generated/hok-logo-large.dim_300x300.png",
    logo: "/assets/generated/hok-logo-large.dim_300x300.png",
    link: "/game/hok",
    ocid: "game.hok.button",
    color: "from-red-600/20 to-amber-800/20",
    border: "hover:border-amber-500/60",
    badge: "HOK",
    bgColor: "#1a0a00",
  },
];

const GRADIENT_CLASSES = [
  "from-blue-950/70 via-blue-900/40 to-transparent",
  "from-red-950/70 via-red-900/40 to-transparent",
  "from-violet-950/70 via-violet-900/40 to-transparent",
  "from-emerald-950/70 via-emerald-900/40 to-transparent",
  "from-amber-950/70 via-amber-900/40 to-transparent",
];

const GAME_COLORS = [
  {
    color: "from-blue-600/20 to-indigo-800/20",
    border: "hover:border-blue-500/60",
  },
  {
    color: "from-red-600/20 to-amber-800/20",
    border: "hover:border-amber-500/60",
  },
  {
    color: "from-emerald-600/20 to-teal-800/20",
    border: "hover:border-emerald-500/60",
  },
  {
    color: "from-purple-600/20 to-indigo-800/20",
    border: "hover:border-purple-500/60",
  },
];

const quickNavLinks = [
  { to: "/", label: "Home", icon: Home, ocid: "quicknav.home.button" },
  {
    to: "/wallet",
    label: "Wallet",
    icon: Wallet,
    ocid: "quicknav.wallet.button",
  },
  {
    to: "/orders",
    label: "Order",
    icon: ShoppingBag,
    ocid: "quicknav.order.button",
  },
  {
    to: "/leaderboard",
    label: "Leaderboard",
    icon: Trophy,
    ocid: "quicknav.leaderboard.button",
  },
  {
    to: "/account",
    label: "Account",
    icon: User,
    ocid: "quicknav.account.button",
  },
];

// ─── Normalise backend banner to unified shape ────────────────────────────────

type NormalisedBanner = {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  gradient: string;
};

function normaliseBanner(b: Banner, index: number): NormalisedBanner {
  return {
    id: b.id.toString(),
    imageUrl: b.imageUrl,
    alt: b.title,
    title: b.title,
    subtitle: b.subtitle,
    ctaText: b.ctaText,
    ctaLink: b.ctaLink,
    gradient: GRADIENT_CLASSES[index % GRADIENT_CLASSES.length],
  };
}

type NormalisedGame = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  logo: string;
  link: string;
  ocid: string;
  color: string;
  border: string;
  badge: string;
  inStock: boolean;
  bgColor?: string;
};

function normaliseGame(g: Game, index: number): NormalisedGame {
  // Map known game IDs to existing slugs/images/logos
  const knownGames: Record<
    string,
    {
      slug: string;
      image: string;
      logo: string;
      badge: string;
      bgColor: string;
    }
  > = {
    "1": {
      slug: "mlbb",
      image:
        "https://static.wikia.nocookie.net/mobile-legends/images/f/fb/MLBB_icon.png/revision/latest?cb=20241013132437",
      logo: "https://static.wikia.nocookie.net/mobile-legends/images/f/fb/MLBB_icon.png/revision/latest?cb=20241013132437",
      badge: "MLBB",
      bgColor: "#1a2040",
    },
    "2": {
      slug: "hok",
      image: "/assets/generated/hok-logo-large.dim_300x300.png",
      logo: "/assets/generated/hok-logo-large.dim_300x300.png",
      badge: "HOK",
      bgColor: "#1a0a00",
    },
  };
  const known = knownGames[g.id.toString()];
  const { color, border } = GAME_COLORS[index % GAME_COLORS.length];
  return {
    id: g.id.toString(),
    slug: known?.slug ?? `game-${g.id}`,
    name: g.name,
    subtitle: g.description || `Top up ${g.currency} instantly`,
    image:
      known?.image ??
      "https://static.wikia.nocookie.net/mobile-legends/images/f/fb/MLBB_icon.png/revision/latest?cb=20241013132437",
    logo:
      known?.logo ??
      "https://static.wikia.nocookie.net/mobile-legends/images/f/fb/MLBB_icon.png/revision/latest?cb=20241013132437",
    link: `/game/${known?.slug ?? `game-${g.id}`}`,
    ocid: `game.item.${index + 1}.button`,
    color,
    border,
    badge: known?.badge ?? g.currency,
    inStock: g.inStock,
    bgColor: known?.bgColor ?? "#0d0d0d",
  };
}

// ─── HomePage ─────────────────────────────────────────────────────────────────

export function HomePage() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [direction, setDirection] = useState(1);

  const { data: backendBanners } = useGetBanners();
  const { data: backendGames } = useGetGames();
  const { data: siteConfig } = useGetSiteConfig();

  // Derive active data: prefer backend data, fall back to static
  const banners: NormalisedBanner[] =
    backendBanners && backendBanners.length > 0
      ? backendBanners.map(normaliseBanner)
      : STATIC_BANNERS;

  const games: NormalisedGame[] =
    backendGames && backendGames.length > 0
      ? backendGames.map(normaliseGame)
      : STATIC_GAMES.map((g, i) => ({
          ...g,
          logo: g.logo,
          inStock: true,
          ocid: `game.item.${i + 1}.button`,
          bgColor: g.bgColor,
        }));

  const featuredHeading =
    siteConfig?.featuredSectionHeading || "Featured Games";
  const promoText = siteConfig?.promoText || "";

  const next = useCallback(() => {
    setDirection(1);
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentBanner ? 1 : -1);
      setCurrentBanner(index);
    },
    [currentBanner],
  );

  // Reset index if banners change and index is out of range
  useEffect(() => {
    setCurrentBanner((prev) => (prev >= banners.length ? 0 : prev));
  }, [banners.length]);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : "100%",
      opacity: 0,
    }),
  };

  const activeBanner = banners[currentBanner] ?? banners[0];

  return (
    <div className="min-h-screen">
      {/* ─── Banner Carousel ─────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-none md:rounded-2xl mx-0 md:mx-4 lg:mx-8 mt-0 md:mt-4">
        <div
          data-ocid="banner.carousel.panel"
          className="relative w-full aspect-[16/5] min-h-[200px] max-h-[400px] overflow-hidden"
        >
          <AnimatePresence custom={direction} mode="popLayout">
            <motion.div
              key={currentBanner}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0"
            >
              <img
                src={activeBanner.imageUrl}
                alt={activeBanner.alt}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${activeBanner.gradient}`}
              />

              {/* Banner content */}
              <div className="absolute inset-0 flex items-center px-8 md:px-16">
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="max-w-md"
                >
                  <h2 className="font-display text-2xl md:text-4xl font-black text-white mb-2 drop-shadow-lg">
                    {activeBanner.title}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 mb-4 drop-shadow">
                    {activeBanner.subtitle}
                  </p>
                  {activeBanner.ctaText && activeBanner.ctaLink && (
                    <Link to={activeBanner.ctaLink}>
                      <Button
                        size="sm"
                        className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 text-xs md:text-sm"
                      >
                        {activeBanner.ctaText}
                      </Button>
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm border border-white/10"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-sm border border-white/10"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === currentBanner
                    ? "w-6 h-2 bg-primary"
                    : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-7xl">
        {/* ─── Promo Text Banner ────────────────────────────── */}
        {promoText && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex justify-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              {promoText}
            </div>
          </motion.div>
        )}

        {/* ─── Quick Nav Icons ──────────────────────────────── */}
        <section className="py-8">
          <div className="grid grid-cols-5 gap-3 max-w-lg mx-auto md:max-w-2xl">
            {quickNavLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to}>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    data-ocid={item.ocid}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] md:text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── Featured Games ──────────────────────────────── */}
        <section className="pb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 gradient-blue-gold rounded-full" />
            <h2 className="font-display text-xl md:text-2xl font-black">
              {featuredHeading}
            </h2>
            <Gem className="w-5 h-5 text-accent ml-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {games.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card
                  className={`card-game overflow-hidden group ${game.border}`}
                >
                  <div
                    className="relative overflow-hidden aspect-[16/9] min-h-[200px]"
                    style={{ backgroundColor: game.bgColor ?? "#0d0d0d" }}
                  >
                    {/* Game icon fills entire box */}
                    <img
                      src={game.image}
                      alt={`${game.badge} icon`}
                      className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-105 p-4"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = game.logo;
                      }}
                    />
                    {/* Subtle vignette overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    {!game.inStock && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-1 text-xs font-bold rounded-md bg-red-900/70 text-red-300 backdrop-blur-sm border border-red-500/30">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-display text-lg font-black mb-1">
                      {game.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {game.subtitle}
                    </p>
                    <Link to={game.link}>
                      <Button
                        className={`w-full font-bold border-0 hover:opacity-90 ${
                          game.inStock
                            ? "gradient-blue-gold text-white glow-blue"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                        data-ocid={game.ocid}
                        disabled={!game.inStock}
                      >
                        <Gem className="w-4 h-4 mr-2" />
                        {game.inStock ? "Top Up Now" : "Out of Stock"}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
