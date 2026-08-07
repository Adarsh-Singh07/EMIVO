import { Settings, Users, LogOut, ShoppingCart, BarChart3, Package, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-950 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Emivo Admin</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <Link
            href="/analytics"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </Link>
          <Link
            href="/orders"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Orders
          </Link>
          <Link
            href="/products"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link
            href="/inventory"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ClipboardList className="w-5 h-5" />
            Inventory
          </Link>
          <Link href="/users"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-800 transition-colors">
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                Admin User
              </span>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

