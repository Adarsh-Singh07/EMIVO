import re

path = "/opt/elektrix/storefront/app/page.tsx"
with open(path, "r") as f:
    content = f.read()

old_cats = """      {/* 2. Top-level categories strip */}
      <section className="border-y border-neutral-200 bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto py-5 no-scrollbar scroll-smooth">
            {categories.map((c) => {
              const Icon = CAT_ICONS[c.icon || ""] || Package;
              return (
                <Link
                  key={c.slug}
                  href={`/shop/${c.slug}`}
                  className="group flex flex-col items-center gap-2 min-w-[72px]"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide text-neutral-900">
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>"""

new_cats = """      {/* 2. Shop by Brand / Categories strip */}
      <section className="border-y border-neutral-200 bg-white py-8">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 mb-6">Shop by Brand</h2>
          <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x">
            {categories.map((c) => {
              const Icon = CAT_ICONS[c.icon || ""] || Package;
              return (
                <Link
                  key={c.slug}
                  href={`/shop/${c.slug}`}
                  className="group flex flex-col items-center gap-3 min-w-[80px] sm:min-w-[100px] snap-start shrink-0"
                >
                  <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 border-2 border-transparent transition-all overflow-hidden group-hover:border-amber-400 group-hover:shadow-lg">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                    ) : (
                      <Icon className="h-8 w-8 sm:h-10 sm:w-10 transition-transform group-hover:scale-110" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-900 text-center">
                    {c.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>"""

content = content.replace(old_cats, new_cats)
with open(path, "w") as f:
    f.write(content)
