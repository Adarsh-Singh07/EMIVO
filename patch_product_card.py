import re

with open("storefront/components/site/ProductCard.tsx", "r") as f:
    content = f.read()

# Remove the specific compare button
compare_btn = """          <button
            onClick={() => {
              if (comparing) router.push("/compare");
              else handleCompare();
            }}
            aria-label={comparing ? "Go to compare" : "Add to compare"}
            aria-pressed={comparing}
            className={`h-7 sm:h-8 ${comparing ? "px-2" : "w-7 sm:w-8"} rounded-full flex items-center justify-center gap-1 shadow-sm transition-colors ${
              comparing ? "bg-neutral-950 text-white" : "bg-white text-neutral-700"
            }`}
          >
            <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            {comparing && <span className="text-[10px] font-medium whitespace-nowrap">Compare</span>}
          </button>"""

content = content.replace(compare_btn, "")

with open("storefront/components/site/ProductCard.tsx", "w") as f:
    f.write(content)
