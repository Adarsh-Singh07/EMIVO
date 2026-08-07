import { TrendingUp, Users, DollarSign, ShoppingBag, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Analytics Overview</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Monitor your store's performance and key metrics.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">\,231.89</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +20.1%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">+2350</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +15.3%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </div>

        {/* Visitors */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Visitors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">12,234</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-green-600 dark:text-green-400 font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +12.5%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">3.24%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="flex items-center text-red-600 dark:text-red-400 font-medium">
              <ArrowDownRight className="w-4 h-4 mr-1" />
              -1.2%
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart Simulation */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm lg:col-span-2 flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Revenue Overview</h2>
          </div>
          <div className="p-5 flex-1 flex flex-col items-center justify-end min-h-[300px]">
            {/* CSS Chart Simulation */}
            <div className="w-full h-48 flex items-end justify-between gap-2 px-2 mt-auto">
              {[40, 60, 45, 80, 50, 90, 75, 45, 60, 55, 85, 70].map((height, i) => (
                <div key={i} className="w-full relative group">
                  <div 
                    className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-sm group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors"
                    style={{ height: \\%\ }}
                  >
                    <div 
                      className="absolute bottom-0 w-full bg-blue-500 dark:bg-blue-400 rounded-t-sm"
                      style={{ height: \\%\ }}
                    ></div>
                  </div>
                  {/* Tooltip simulation */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                    \$\{(height * 125).toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
            <div className="w-full flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-4 px-2">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>

        {/* Top Products Simulation */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Top Products</h2>
          </div>
          <div className="p-0">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { name: "Sony Alpha a7 IV", sales: 124, revenue: "\,876", progress: 85 },
                { name: "MacBook Pro 16\"", sales: 98, revenue: "\,902", progress: 70 },
                { name: "iPhone 15 Pro Max", sales: 210, revenue: "\,790", progress: 65 },
                { name: "LG C3 OLED TV", sales: 65, revenue: "\,935", progress: 45 },
                { name: "AirPods Pro 2", sales: 345, revenue: "\,905", progress: 30 },
              ].map((product, i) => (
                <li key={i} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{product.name}</span>
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{product.revenue}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{product.sales} sales</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: \\%\ }}></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
