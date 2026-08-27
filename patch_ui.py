import os

# 1. layout.tsx - add overflow-x-hidden
with open("storefront/app/layout.tsx", "r") as f:
    layout = f.read()
if "overflow-x-hidden" not in layout:
    layout = layout.replace('body className="font-sans antialiased bg-white text-neutral-900"', 'body className="font-sans antialiased bg-white text-neutral-900 overflow-x-hidden"')
    with open("storefront/app/layout.tsx", "w") as f:
        f.write(layout)

# 2. HeroSlider.tsx - reduce text sizes
with open("storefront/components/site/HeroSlider.tsx", "r") as f:
    hero = f.read()

hero = hero.replace('min-h-[320px] sm:min-h-[440px] lg:min-h-[560px]', 'min-h-[280px] sm:min-h-[440px] lg:min-h-[560px]')
hero = hero.replace('text-[32px] sm:text-5xl lg:text-6xl', 'text-[24px] sm:text-5xl lg:text-6xl')
hero = hero.replace('mt-3 sm:mt-4 text-white/80 text-[13px]', 'mt-2 sm:mt-4 text-white/80 text-[13px]')
hero = hero.replace('py-8 sm:py-10', 'py-6 sm:py-10')

with open("storefront/components/site/HeroSlider.tsx", "w") as f:
    f.write(hero)

# 3. page.tsx - minimize brands vertical space
with open("storefront/app/page.tsx", "r") as f:
    page = f.read()

page = page.replace('className="py-12 border-y', 'className="py-6 border-y')
page = page.replace('text-neutral-300 whitespace-nowrap', 'text-neutral-400 whitespace-nowrap')

with open("storefront/app/page.tsx", "w") as f:
    f.write(page)

# 4. ProductDetail.tsx - breadcrumbs one line, fix action buttons size
with open("storefront/components/site/ProductDetail.tsx", "r") as f:
    pd = f.read()

pd = pd.replace('className="text-sm text-neutral-500 mb-6 flex flex-wrap items-center gap-1"', 'className="text-xs sm:text-sm text-neutral-500 mb-6 flex items-center gap-1 overflow-x-auto whitespace-nowrap no-scrollbar"')
pd = pd.replace('min-w-[120px]', 'min-w-[100px]')

with open("storefront/components/site/ProductDetail.tsx", "w") as f:
    f.write(pd)

