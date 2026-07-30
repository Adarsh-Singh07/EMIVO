"use client";

import { mockRetailerDashboard } from "@/lib/mock/dashboards";
import { formatINR } from "@/lib/utils";
import { TrendingUp, ShoppingBag, IndianRupee, Store, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RetailDashboard() {
  const data = mockRetailerDashboard;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Retailer Hub</h1>
          <p className="text-[var(--color-text-secondary)]">Welcome back, <span className="font-semibold text-[var(--color-text-primary)]">{data.name}</span></p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><Search className="w-4 h-4 mr-2" /> Catalog</Button>
          <Button><Plus className="w-4 h-4 mr-2" /> New Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Orders This Month", value: data.ordersThisMonth, icon: ShoppingBag },
          { label: "Total GMV", value: formatINR(data.gmvPaisa), icon: TrendingUp },
          { label: "Commission Earned", value: formatINR(data.commissionEarnedPaisa), icon: IndianRupee, highlight: true },
          { label: "Pending Payout", value: formatINR(data.pendingCommissionPaisa), icon: Store }
        ].map((stat, idx) => (
          <Card key={idx} className={stat.highlight ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${stat.highlight ? 'bg-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-elevated)]'}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-[var(--color-text-secondary)] font-medium mb-1">{stat.label}</div>
                  <div className={`text-xl font-bold ${stat.highlight ? 'text-[var(--color-accent)]' : ''}`}>{stat.value}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-secondary)]">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((sale, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-4 text-xs font-mono text-[var(--color-text-secondary)]">{sale.id}</td>
                      <td className="py-4 font-medium">{sale.customer}</td>
                      <td className="py-4">{sale.product}</td>
                      <td className="py-4 text-[var(--color-text-secondary)]">{sale.date}</td>
                      <td className="py-4 font-bold text-right">{formatINR(sale.amount_paisa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.commissionLedger.map((entry, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                  <div>
                    <div className="text-sm font-medium mb-1">{entry.description}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{entry.date} • {entry.id}</div>
                  </div>
                  <div className="font-bold text-[var(--color-accent)]">
                    +{formatINR(entry.amount_paisa)}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-6">View Full Ledger</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
