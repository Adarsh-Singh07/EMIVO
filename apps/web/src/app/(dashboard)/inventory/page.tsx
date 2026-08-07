import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, TrendingDown, Search, Filter } from "lucide-react";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Inventory Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and manage your stock levels</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white transition-all"
            />
          </div>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Items</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">4,281</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            <span className="text-green-500 font-medium">+2.4%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">24</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            <span className="text-red-500 font-medium">-12%</span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">from last week</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Out of Stock</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">3</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Requires immediate attention</span>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 uppercase border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">SKU</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">In Stock</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {[
                { name: 'Smartphone X Pro', sku: 'SMX-PRO-128-BLK', status: 'In Stock', stock: 145, statusColor: 'green' },
                { name: 'Wireless Headphones', sku: 'WH-ANC-WHT', status: 'Low Stock', stock: 12, statusColor: 'amber' },
                { name: 'Laptop Pro 15"', sku: 'LP-15-512-SLV', status: 'In Stock', stock: 42, statusColor: 'green' },
                { name: 'Smart Watch Series 5', sku: 'SW-S5-44-GRY', status: 'Out of Stock', stock: 0, statusColor: 'red' },
                { name: '4K Monitor 27"', sku: 'MON-27-4K', status: 'In Stock', stock: 89, statusColor: 'green' },
              ].map((item, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.sku}</td>
                  <td className="px-6 py-4">
                    <span className={inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                      }>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-[100px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={h-full }
                          style={{ width: ${Math.min((item.stock / 150) * 100, 100)}% }}
                        ></div>
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{item.stock}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm">
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
