import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        "postgresql://postgres.ihemgmucjxpdpqdlxeai:Goluaj0%40123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres",
        statement_cache_size=0
    )
    
    rows = await conn.fetch("SELECT id FROM orders WHERE created_at >= '2026-08-29 16:00:00+00';")
    order_ids = [str(r['id']) for r in rows]
    
    if not order_ids:
        print("No dummy orders found")
        return
        
    print(f"Deleting {len(order_ids)} orders")
    
    # get payment ids
    payments = await conn.fetch("SELECT id FROM payments WHERE order_id = ANY($1::varchar[])", order_ids)
    payment_ids = [str(p['id']) for p in payments]
    
    if payment_ids:
        await conn.execute("DELETE FROM payment_events WHERE payment_id = ANY($1::varchar[])", payment_ids)
    
    await conn.execute("DELETE FROM payments WHERE order_id = ANY($1::varchar[])", order_ids)
    await conn.execute("DELETE FROM order_items WHERE order_id = ANY($1::varchar[])", order_ids)
    await conn.execute("DELETE FROM orders WHERE id = ANY($1::varchar[])", order_ids)
    
    print("Deleted successfully!")
    await conn.close()

asyncio.run(main())
