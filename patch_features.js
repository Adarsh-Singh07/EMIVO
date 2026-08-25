const fs = require('fs');
const file = '/opt/elektrix/storefront/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '  { icon: RotateCcw, title: "Open Box Delivery", desc: "No returns after delivery", href: "/privacy" },',
  '  { icon: RotateCcw, title: "Open Box Delivery", desc: "No returns after delivery", href: "/refund" },'
);

content = content.replace(
  /\{FEATURES\.map\(\(f\) => \([\s\S]*?\)\)\}/,
  `{FEATURES.map((f) => {
            const inner = (
              <>
                <div className="w-9 h-9 rounded-full bg-neutral-950 text-white grid place-items-center shrink-0">
                  <f.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">{f.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-tight">{f.desc}</p>
                </div>
              </>
            );

            const className = "flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-4 py-3 min-w-[220px] sm:min-w-[240px] lg:min-w-0 shrink-0 lg:shrink" + (f.href ? " hover:border-neutral-300 hover:shadow-sm transition-all" : "");

            return f.href ? (
              <Link key={f.title} href={f.href} className={className}>
                {inner}
              </Link>
            ) : (
              <div key={f.title} className={className}>
                {inner}
              </div>
            );
          })}`
);

fs.writeFileSync(file, content);
