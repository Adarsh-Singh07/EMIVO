import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, ProductVariant } from '@/types/product'

export interface CartItem {
  id: string;      // Unique cart item ID (typically product.id + variant.id)
  product: Product;
  quantity: number;
  selectedColor?: ProductVariant;
  selectedStorage?: ProductVariant;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  
  // Actions
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  
  // UI Actions
  setIsOpen: (isOpen: boolean) => void;
  toggleCart: () => void;
  
  // Selectors/Computed (Available in state but updated on every change)
  getTotalItems: () => number;
  getSubtotal: () => number;    // Returns base_price sum in paisa
  getEMISubtotal: () => number; // Returns EMI sum per month
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        set((state) => {
          // Generate a composite ID for uniqueness based on variants
          const colorId = newItem.selectedColor?.id || 'base';
          const storageId = newItem.selectedStorage?.id || 'base';
          const itemId = `${newItem.product.id}-${colorId}-${storageId}`;

          const existingItemIndex = state.items.findIndex((item) => item.id === itemId);

          if (existingItemIndex > -1) {
            // Update quantity if item exists
            const newItems = [...state.items];
            newItems[existingItemIndex].quantity += newItem.quantity;
            return { items: newItems, isOpen: true }; // Open cart when adding
          }

          // Add new item
          return { items: [...state.items, { ...newItem, id: itemId }], isOpen: true };
        });
      },

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: quantity > 0 
            ? state.items.map((item) => (item.id === id ? { ...item, quantity } : item))
            : state.items.filter((item) => item.id !== id),
        })),

      clearCart: () => set({ items: [] }),

      setIsOpen: (isOpen) => set({ isOpen }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      getTotalItems: () => get().items.reduce((total, item) => total + item.quantity, 0),
      
      getSubtotal: () =>
        get().items.reduce((total, item) => total + item.product.basePrice * item.quantity, 0),
        
      getEMISubtotal: () =>
        get().items.reduce((total, item) => total + (item.product.baseEMI || 0) * item.quantity, 0),
    }),
    {
      name: 'emivo-cart-storage',
      // Only persist the items array, skip UI state like isOpen
      partialize: (state) => ({ items: state.items }),
    }
  )
)