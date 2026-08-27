import re

with open("storefront/components/site/ProductDetail.tsx", "r") as f:
    content = f.read()

old_btn = """            <button
              onClick={handleCompare}
              aria-pressed={comparing}
              className={`shrink-0 min-w-[120px] h-11 inline-flex items-center justify-center gap-2 border rounded-full text-sm hover:bg-neutral-50 snap-start ${
                comparing ? "border-neutral-950" : "border-neutral-200"
              }`}
            >
              <RefreshCw className="w-4 h-4" /> {comparing ? "In compare" : "Compare"}
            </button>"""

new_btn = """            <button
              onClick={() => {
                if (comparing) router.push("/compare");
                else handleCompare();
              }}
              aria-pressed={comparing}
              className={`shrink-0 min-w-[120px] h-11 inline-flex items-center justify-center gap-2 border rounded-full text-sm hover:bg-neutral-50 snap-start ${
                comparing ? "border-neutral-950" : "border-neutral-200"
              }`}
            >
              <RefreshCw className="w-4 h-4" /> {comparing ? "Go to compare" : "Compare"}
            </button>"""

content = content.replace(old_btn, new_btn)

with open("storefront/components/site/ProductDetail.tsx", "w") as f:
    f.write(content)
