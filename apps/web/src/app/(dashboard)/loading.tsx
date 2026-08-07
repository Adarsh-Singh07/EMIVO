import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
