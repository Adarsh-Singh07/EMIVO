const fs = require('fs');
const file = '/opt/elektrix/apps/api/modules/storefront/router.py';
let content = fs.readFileSync(file, 'utf8');

const couponsCode = `
@router.get("/coupons")
async def public_coupons(session: AsyncSession = Depends(optional_db_context)):
    from sqlalchemy import text
    query = text("""
        SELECT code, description, discount_type, discount_value, min_order_value 
        FROM coupons 
        WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= now()) 
        AND (valid_until IS NULL OR valid_until >= now())
    """)
    result = await session.execute(query)
    return [dict(row._mapping) for row in result.fetchall()]
`;

content += '\n' + couponsCode;
fs.writeFileSync(file, content);
