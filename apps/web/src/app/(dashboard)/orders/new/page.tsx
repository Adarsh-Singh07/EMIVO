'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchApi<Product[]>('/products/');
        setProducts(data);
        if (data.length > 0) {
          setSelectedProductId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load products');
      }
    }
    loadProducts();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProductId) return;
    
    setLoading(true);
    setError('');

    const payload = {
      items: [
        {
          product_id: selectedProductId,
          quantity: quantity
        }
      ]
    };

    try {
      await fetchApi('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push('/orders');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Order</h1>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6 flex flex-col gap-6">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="product" className="text-sm font-medium leading-none">Select Product</label>
              <select 
                id="product" 
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
              >
                <option value="" disabled>Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {(p.price / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="quantity" className="text-sm font-medium leading-none">Quantity</label>
              <input 
                type="number" 
                id="quantity" 
                min="1"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required 
              />
            </div>

            <Button type="submit" disabled={loading || !selectedProductId} className="mt-4">
              {loading ? 'Creating...' : 'Create Order'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
