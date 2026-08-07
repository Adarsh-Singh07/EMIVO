import { Building2, Save } from "lucide-react";

export const metadata = {
  title: "Business Settings | Emivo Admin",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Business Settings</h2>
      </div>

      <div className="grid gap-6">
        {/* Business Profile */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Profile</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage your business information and logic.</p>
            </div>
          </div>
          
          <form className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="businessName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  placeholder="Acme Corp"
                  defaultValue="Emivo Stores"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="industry" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Industry
                </label>
                <select
                  id="industry"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                  defaultValue="retail"
                >
                  <option value="retail">Retail</option>
                  <option value="software">Software</option>
                  <option value="services">Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Business Description
              </label>
              <textarea
                id="description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                placeholder="Describe your business operations..."
                defaultValue="E-commerce electronics retailer."
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="button" 
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
