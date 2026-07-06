"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import ProductIllustration from "@/components/ProductIllustration";
import { CATEGORY_GRADIENTS, formatPrice } from "@/lib/products";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    subtotal,
    itemCount,
  } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-ocean-950/40 backdrop-blur-sm"
        onClick={closeCart}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        role="dialog"
        aria-label="Shopping cart"
      >
        <div className="flex items-center justify-between border-b border-ocean-100 px-6 py-4">
          <h2 className="font-display text-xl font-bold text-ocean-900">
            Your Cart ({itemCount})
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="rounded-full p-2 text-ocean-500 hover:bg-ocean-50"
            aria-label="Close cart"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-ocean-500">
              <span className="text-5xl mb-4">🏄</span>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm mt-1">Add some gear and catch a wave!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map(({ product, quantity }) => {
                const gradient = CATEGORY_GRADIENTS[product.category] || "from-ocean-500 to-ocean-700";
                return (
                <li key={product.id} className="flex gap-4 border-b border-ocean-50 pb-4">
                  <Link
                    href={`/products/${product.id}`}
                    onClick={closeCart}
                    className={`h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center p-2`}
                  >
                    <ProductIllustration product={product} className="h-11 w-auto max-w-[36px]" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${product.id}`}
                      onClick={closeCart}
                      className="font-semibold text-ocean-900 truncate block hover:text-ocean-600"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-ocean-600">{formatPrice(product.price)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="h-7 w-7 rounded-full border border-ocean-200 text-ocean-600 hover:bg-ocean-50"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        className="h-7 w-7 rounded-full border border-ocean-200 text-ocean-600 hover:bg-ocean-50"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id)}
                        className="ml-auto text-xs text-coral-500 hover:text-coral-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );})}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ocean-100 px-6 py-4 space-y-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-ocean-500 text-center">
              Demo cart only — checkout is not connected.
            </p>
            <button
              type="button"
              disabled
              className="btn-primary w-full opacity-60 cursor-not-allowed"
              title="Checkout not implemented"
            >
              Checkout (Coming Soon)
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
