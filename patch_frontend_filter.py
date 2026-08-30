with open("storefront/app/account/orders/page.tsx", "r") as f:
    content = f.read()

target = """  const [orders, setOrders] = useState<OrderV2[]>([]);"""
replacement = """  const [orders, setOrders] = useState<OrderV2[]>([]);"""

target2 = """      .then((data) => setOrders(data.items || []))"""
replacement2 = """      .then((data) => setOrders((data.items || []).filter((o: OrderV2) => o.status !== "PAYMENT_FAILED")))"""

content = content.replace(target2, replacement2)

with open("storefront/app/account/orders/page.tsx", "w") as f:
    f.write(content)
print("Patched frontend filter!")
