"use client";

import { mockAdminDashboard } from "@/lib/mock/dashboards";
import { formatINR } from "@/lib/utils";
import { LineChart, Users, Store, ShieldAlert, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const data = mockAdminDashboard;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Platform Overview</h1>
          <p className="text-[var(--color-text-secondary)]">EMIVO Admin Control Center</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold border border-green-200">
          <Activity className="w-4 h-4" /> Systems Operational
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total GMV (MTD)", value: formatINR(data.totalGmvPaisa), icon: LineChart, highlight: true },
          { label: "Orders Today", value: data.ordersToday, icon: Activity },
          { label: "Active Retailers", value: data.activeRetailers, icon: Store },
          { label: "Active Customers", value: data.activeCustomers, icon: Users }
        ].map((stat, idx) => (
          <Card key={idx} className={stat.highlight ? "border-[var(--color-primary)] shadow-md" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-[var(--color-text-secondary)]">{stat.label}</div>
                <div className={`p-2 rounded-md ${stat.highlight ? 'bg-[var(--color-primary)] text-[var(--color-surface)]' : 'bg-[var(--color-surface-elevated)]'}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Mock Chart Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>GMV Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-end justify-between gap-2 pt-10">
              {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                <div key={i} className="w-full relative group">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                    ₹{(height * 1.5).toFixed(1)}L
                  </div>
                  <div 
                    className="w-full bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] rounded-t-sm transition-all duration-300"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-center mt-2 text-xs text-[var(--color-text-muted)]">Day {i+1}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Retailer Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Retailers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.retailerPerformance.slice(0,5).map((retailer, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-lg border border-[var(--color-border)]">
                  <div>
                    <div className="font-bold flex items-center gap-2">
                      {retailer.name}
                      {retailer.status === 'Warning' && <ShieldAlert className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">{retailer.location} • {retailer.orders} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{formatINR(retailer.gmv_paisa)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
