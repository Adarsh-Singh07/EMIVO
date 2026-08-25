const fs = require('fs');
const file = '/opt/elektrix/storefront/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const imageLogic = `                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-100 group-hover:bg-neutral-950 group-hover:text-white grid place-items-center transition-colors overflow-hidden">
                  {cat.image_url ? (
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  )}
                </div>`;

content = content.replace(
  '<div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-100 group-hover:bg-neutral-950 group-hover:text-white grid place-items-center transition-colors">\n                  <Icon className="w-5 h-5 md:w-6 md:h-6" />\n                </div>',
  imageLogic
);

fs.writeFileSync(file, content);
