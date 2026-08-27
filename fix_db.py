import json
import psycopg2
from psycopg2.extras import Json

conn = psycopg2.connect("postgresql://postgres.ihemgmucjxpdpqdlxeai:Goluaj0%40123@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres")
cur = conn.cursor()

cur.execute("SELECT id, config FROM business_settings;")
for row in cur.fetchall():
    id, config = row
    if 'promo_tiles' in config.get('store', {}):
        for tile in config['store']['promo_tiles']:
            if 'dash.cloudflare.com' in tile['img']:
                tile['img'] = "https://pub-7cfcaa4b4f294a40870d03926c8d1c41.r2.dev/products/1787841955_674713bc41da4c50ab58983ea18fe10d.png"
    
    cur.execute("UPDATE business_settings SET config = %s WHERE id = %s", (Json(config), id))

conn.commit()
cur.close()
conn.close()
