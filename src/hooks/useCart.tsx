import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  photoId: string;
  eventName: string;
  photoTitle: string;
  previewPath: string;
  productType: "digital" | "print";
  priceCents: number;
};

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (photoId: string, productType: CartItem["productType"]) => void;
  clear: () => void;
  has: (photoId: string, productType: CartItem["productType"]) => boolean;
  totalCents: number;
  count: number;
};

const CartContext = createContext<CartState | undefined>(undefined);
const STORAGE_KEY = "visual-axis-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartState>(
    () => ({
      items,
      add: (item) =>
        setItems((prev) =>
          prev.some((i) => i.photoId === item.photoId && i.productType === item.productType)
            ? prev
            : [...prev, item],
        ),
      remove: (photoId, productType) =>
        setItems((prev) =>
          prev.filter((i) => !(i.photoId === photoId && i.productType === productType)),
        ),
      clear: () => setItems([]),
      has: (photoId, productType) =>
        items.some((i) => i.photoId === photoId && i.productType === productType),
      totalCents: items.reduce((sum, i) => sum + i.priceCents, 0),
      count: items.length,
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
