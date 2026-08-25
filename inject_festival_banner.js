const fs = require('fs');
const file = '/opt/elektrix/storefront/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `
      {/* Festival Banner */}
      {config?.banner_active && config?.banner_image && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <Link href={config.banner_link || "/shop"} className="block relative w-full h-32 md:h-48 lg:h-64 rounded-2xl overflow-hidden group">
            <img src={config.banner_image} alt={config.banner_title || "Festival Offer"} className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white drop-shadow-md">
              {config.banner_title && <h2 className="text-2xl md:text-4xl font-bold mb-2">{config.banner_title}</h2>}
              {config.banner_subtitle && <p className="text-sm md:text-xl font-medium">{config.banner_subtitle}</p>}
            </div>
          </Link>
        </section>
      )}

      {/* Active Coupons */}
      {coupons && coupons.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {coupons.map((c) => (
              <div key={c.code} className="flex-shrink-0 min-w-[280px] bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">{c.description || "Special Offer"}</p>
                  <p className="font-mono font-bold text-lg text-neutral-900 border-2 border-dashed border-amber-300 bg-white px-2 py-1 rounded inline-block">{c.code}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-amber-600">
                    {c.discount_type === 'PERCENTAGE' ? \`\${c.discount_value}%\` : \`₹\${c.discount_value/100}\`}
                  </p>
                  <p className="text-xs text-neutral-500 font-medium mt-1">OFF</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
`;

content = content.replace(
  '<HeroSlider slides={config?.hero_slides} />',
  '<HeroSlider slides={config?.hero_slides} />\n' + injection
);

fs.writeFileSync(file, content);
