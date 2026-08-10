'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await fetchApi<Order>(`/orders/${params.id}`);
        setOrder(data);
      } catch (error) {
        console.error('Failed to load order');
      } finally {
        setLoading(false);
      }
    }
    if (params.id) {
      loadOrder();
    }
  }, [params.id]);

  if (loading) return <div className="p-8 text-center">Loading order...</div>;
  if (!order) return <div className="p-8 text-center">Order not found</div>;

  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/orders">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Order {order.id.split('-')[0]}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <h3 className="font-semibold leading-none tracking-tight mb-4">Order Details</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Date</dt><dd>{new Date(order.created_at).toLocaleString()}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{order.status}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-medium">{(order.total_amount / 100).toFixed(2)}</dd></div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
        <h3 className="font-semibold leading-none tracking-tight mb-4">Items</h3>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Product ID</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Unit Price</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Quantity</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {order.items.map((item) => (
                <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <td className="p-4 align-middle">{item.product_id.split('-')[0]}</td>
                  <td className="p-4 align-middle">{(item.unit_price / 100).toFixed(2)}</td>
                  <td className="p-4 align-middle">{item.quantity}</td>
                  <td className="p-4 align-middle">{((item.unit_price * item.quantity) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
