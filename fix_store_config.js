const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/router.py';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '"banner": db_cfg.get("banner"),',
  `"banner_active": db_cfg.get("banner_active"),
        "banner_title": db_cfg.get("banner_title"),
        "banner_subtitle": db_cfg.get("banner_subtitle"),
        "banner_image": db_cfg.get("banner_image"),
        "banner_link": db_cfg.get("banner_link"),`
);

fs.writeFileSync(file, content);
