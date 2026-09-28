import io

# ---- 1. realtime customers list: users table is the source of truth ----
p = "apps/api/routers/customers.py"
s = io.open(p, encoding="utf-8").read()
old = '''    offset = (page - 1) * page_size
    
    count_query = sa.text("SELECT COUNT(*) FROM customers")
    count_res = await session.execute(count_query)
    total = count_res.scalar() or 0
    
    query = sa.text(\'\'\'
        SELECT id, business_id, name, email, phone, address, created_at, updated_at
        FROM customers
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
    \'\'\')
    result = await session.execute(query, {"limit": page_size, "offset": offset})
    rows = result.fetchall()
    
    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "business_id": row.business_id,
            "name": row.name,
            "email": row.email,
            "phone": row.phone,
            "address": row.address,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None
        })'''
new = '''    offset = (page - 1) * page_size

    # Realtime registry: every registered USER is a customer. The legacy
    # `customers` table is left-joined by email only for CRM fields
    # (address/notes) that accounts can carry.
    count_query = sa.text("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL")
    total = (await session.execute(count_query)).scalar() or 0

    query = sa.text(\'\'\'
        SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
               u.is_active, u.suspended, u.created_at,
               c.id AS customer_id, c.address, c.notes
        FROM users u
        LEFT JOIN customers c ON lower(c.email) = lower(u.email)
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    \'\'\')
    result = await session.execute(query, {"limit": page_size, "offset": offset})
    rows = result.fetchall()

    items = []
    for row in rows:
        items.append({
            "id": row.id,  # user id — stable key for the detail page
            "customer_id": row.customer_id,
            "business_id": None,
            "name": f"{row.first_name or ''} {row.last_name or ''}".strip() or row.email,
            "email": row.email,
            "phone": row.phone,
            "address": row.address,
            "notes": row.notes,
            "is_active": row.is_active,
            "suspended": row.suspended,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.created_at.isoformat() if row.created_at else None,
        })'''
assert old in s, "list_customers body not found"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("customers list is now users-driven")

# ---- 2. schema fields (optional, backward compatible)
p2 = "apps/api/modules/customers/schemas.py"
s2 = io.open(p2, encoding="utf-8").read()
s2 = s2.replace(
    '''class CustomerResponse(BaseModel):
    id: str
    business_id: str''',
    '''class CustomerResponse(BaseModel):
    id: str
    customer_id: str | None = None
    business_id: str | None = None''',
)
s2 = s2.replace(
    """    notes: str | None = None
    created_at: Any""",
    """    notes: str | None = None
    is_active: bool | None = None
    suspended: bool | None = None
    created_at: Any""",
)
io.open(p2, "w", encoding="utf-8", newline="\n").write(s2)
print("schemas extended")

# ---- 3. overview resolves a customers-record id too (email -> user)
p3 = "apps/api/modules/admin/service.py"
s3 = io.open(p3, encoding="utf-8").read()
old3 = '''        profile = (await self.session.execute(text("""
            SELECT id, email, first_name, last_name, phone, is_active, suspended,
                   suspension_reason, is_email_verified, created_at,
                   COALESCE(addresses, '[]'::json) AS addresses
            FROM users WHERE id = :u
        """), {"u": user_id})).mappings().first()
        if not profile:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)'''
new3 = '''        profile = (await self.session.execute(text("""
            SELECT id, email, first_name, last_name, phone, is_active, suspended,
                   suspension_reason, is_email_verified, created_at,
                   COALESCE(addresses, '[]'::json) AS addresses
            FROM users WHERE id = :u
        """), {"u": user_id})).mappings().first()
        if not profile:
            # The admin customers list may pass a legacy customers-record id;
            # resolve the account via that record's email.
            cust_email = (await self.session.execute(text(
                "SELECT email FROM customers WHERE id = :u"
            ), {"u": user_id})).scalar()
            if cust_email:
                profile = (await self.session.execute(text("""
                    SELECT id, email, first_name, last_name, phone, is_active, suspended,
                           suspension_reason, is_email_verified, created_at,
                           COALESCE(addresses, '[]'::json) AS addresses
                    FROM users WHERE lower(email) = lower(:e)
                """), {"e": cust_email})).mappings().first()
        if not profile:
            raise DomainException("User not found", code="NOT_FOUND", status_code=404)'''
assert old3 in s3, "overview block not found"
s3 = s3.replace(old3, new3, 1)
io.open(p3, "w", encoding="utf-8", newline="\n").write(s3)
print("overview fallback added")
