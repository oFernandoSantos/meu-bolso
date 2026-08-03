import {
  Car,
  CircleDashed,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  Dumbbell,
  PawPrint,
  Wifi,
  Fuel,
  Coffee,
  Baby,
  Wrench,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "gamepad-2": Gamepad2,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  plane: Plane,
  gift: Gift,
  "circle-dashed": CircleDashed,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  wifi: Wifi,
  fuel: Fuel,
  coffee: Coffee,
  baby: Baby,
  wrench: Wrench,
  wallet: Wallet,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export const CATEGORY_COLORS = [
  "#16a34a",
  "#0ea5e9",
  "#8b5cf6",
  "#f97316",
  "#ef4444",
  "#eab308",
  "#ec4899",
  "#14b8a6",
  "#2563eb",
  "#64748b",
];

interface CategoryIconProps {
  icon: string;
  color: string;
  size?: "sm" | "md";
}

export function CategoryIcon({ icon, color, size = "md" }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[icon] ?? CircleDashed;
  const box = size === "sm" ? "size-8" : "size-10";
  const glyph = size === "sm" ? "size-4" : "size-5";
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className={glyph} />
    </span>
  );
}
