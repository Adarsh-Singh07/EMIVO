"use client";

import { mockUser, mockOrders } from "@/lib/mock/user";
import { formatINR } from "@/lib/utils";
import { Package, Heart, CreditCard, Gift, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CustomerDashboard() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {mockUser.name}</h1>
        <p className="text-[var(--color-text-secondary)]">Manage your orders, EMIs, and rewards from one place.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Orders", value: mockUser.totalOrders, icon: Package },
          { label: "Wishlist Items", value: mockUser.wishlistItems, icon: Heart },
          { label: "Active EMIs", value: mockUser.activeEMIs, icon: CreditCard },
          { label: "Referral Credits", value: formatINR(mockUser.referralCreditsPaisa), icon: Gift, highlight: true }
        ].map((stat, idx) => (
          <Card key={idx} className={stat.highlight ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${stat.highlight ? 'bg-[var(--color-accent)]/20 text-[var(--color-accent)]' : 'bg-[var(--color-surface-elevated)]'}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${stat.highlight ? 'text-[var(--color-accent)]' : ''}`}>{stat.value}</div>
                <div className="text-sm text-[var(--color-text-secondary)] font-medium">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-secondary)]">
                      <th className="pb-3 font-medium">Order ID</th>
                      <th className="pb-3 font-medium">Product</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockOrders.map((order, idx) => (
                      <tr key={idx} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-4 font-medium">{order.id}</td>
                        <td className="py-4">{order.product}</td>
                        <td className="py-4 text-[var(--color-text-secondary)]">{order.date}</td>
                        <td className="py-4 font-medium">{formatINR(order.amount_paisa)}</td>
                        <td className="py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-[var(--color-primary)] text-[var(--color-surface)] border-none">
            <CardContent className="p-8">
              <Gift className="w-10 h-10 mb-4 text-[var(--color-accent)]" />
              <h3 className="text-xl font-bold mb-2">Refer & Earn</h3>
              <p className="text-sm text-[var(--color-surface)]/80 mb-6">
                Invite friends to EMIVO and earn ₹500 credits when they make their first purchase.
              </p>
              <div className="flex bg-white/10 rounded-lg p-1 border border-white/20">
                <div className="flex-1 py-2 px-3 font-mono text-sm tracking-wider flex items-center justify-center font-bold">
                  {mockUser.referralCode}
                </div>
                <Button variant="secondary" size="sm" className="rounded-md">
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
