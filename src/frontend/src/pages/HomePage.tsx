import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Gem,
  Home,
  ShoppingBag,
  Trophy,
  User,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";

const banners = [
  {
    src: "/assets/generated/banner-mlbb.dim_1200x400.jpg",
    alt: "Mobile Legends Bang Bang",
    title: "Mobile Legends",
    subtitle: "Top up Diamonds & dominate the battlefield",
    cta: "Top Up MLBB",
    link: "/game/mlbb",
    gradient: "from-blue-950/70 via-blue-900/40 to-transparent",
  },
  {
    src: "/assets/generated/banner-hok.dim_1200x400.jpg",
    alt: "Honor of Kings",
    title: "Honor of Kings",
    subtitle: "Get Diamonds & become a legendary warrior",
    cta: "Top Up HOK",
    link: "/game/hok",
    gradient: "from-red-950/70 via-red-900/40 to-transparent",
  },
  {
    src: "/assets/generated/banner-promo.dim_1200x400.jpg",
    alt: "Special Promotions",
    title: "Special Offers",
    subtitle: "Best rates for diamond top-ups — every day",
    cta: "Shop Now",
    link: "/",
    gradient: "from-violet-950/70 via-violet-900/40 to-transparent",
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

const featuredGames = [
  {
    id: "mlbb",
    name: "Mobile Legends: Bang Bang",
    subtitle: "Top up Diamonds instantly",
    image: "/assets/generated/game-mlbb.dim_400x300.jpg",
    link: "/game/mlbb",
    ocid: "game.mlbb.button",
    color: "from-blue-600/20 to-indigo-800/20",
    border: "hover:border-blue-500/60",
    badge: "MLBB",
  },
  {
    id: "hok",
    name: "Honor of Kings",
    subtitle: "Top up Diamonds instantly",
    image: "/assets/generated/game-hok.dim_400x300.jpg",
    link: "/game/hok",
    ocid: "game.hok.button",
    color: "from-red-600/20 to-amber-800/20",
    border: "hover:border-amber-500/60",
    badge: "HOK",
  },
];

export function HomePage() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = useCallback(() => {
    setDirection(1);
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  }, []);

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentBanner ? 1 : -1);
      setCurrentBanner(index);
    },
    [currentBanner],
  );

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
                src={banners[currentBanner].src}
                alt={banners[currentBanner].alt}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${banners[currentBanner].gradient}`}
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
                    {banners[currentBanner].title}
                  </h2>
                  <p className="text-sm md:text-base text-white/80 mb-4 drop-shadow">
                    {banners[currentBanner].subtitle}
                  </p>
                  <Link to={banners[currentBanner].link}>
                    <Button
                      size="sm"
                      className="gradient-blue-gold text-white font-bold border-0 hover:opacity-90 text-xs md:text-sm"
                    >
                      {banners[currentBanner].cta}
                    </Button>
                  </Link>
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
                key={banner.alt}
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
              Featured Games
            </h2>
            <Gem className="w-5 h-5 text-accent ml-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredGames.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card
                  className={`card-game overflow-hidden group ${game.border}`}
                >
                  <div className="relative overflow-hidden aspect-[4/3]">
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-t ${game.color} opacity-60`}
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2 py-1 text-xs font-bold rounded-md bg-black/50 text-white/90 backdrop-blur-sm border border-white/10">
                        {game.badge}
                      </span>
                    </div>
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
                        className="w-full gradient-blue-gold text-white font-bold border-0 hover:opacity-90 glow-blue"
                        data-ocid={game.ocid}
                      >
                        <Gem className="w-4 h-4 mr-2" />
                        Top Up Now
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
