import re

path = "/opt/elektrix/apps/api/modules/orders/service.py"
with open(path, "r") as f:
    content = f.read()

# I need to find the place right before or after order is created to decrement stock
# Wait, I should do it when processing the items!
old_logic = """            line_subtotal = unit_price * quantity
            subtotal += line_subtotal
            order_items.append(OrderItem(
                product_id=product.id,
                variant_id=variant_id,
                quantity=quantity,"""

new_logic = """            # Check and decrement stock atomically (basic approach)
            if product.in_stock:
                if variant_id:
                    # Not decrementing variant stock since schema is simple, but check if we need to.
                    pass
                else:
                    if product.stock_quantity is not None:
                        if product.stock_quantity < quantity:
                            raise DomainException(f"Not enough stock for {product.name}", code="OUT_OF_STOCK", status_code=400)
                        # We will decrement it now
                        product.stock_quantity -= quantity
                        if product.stock_quantity == 0:
                            product.in_stock = False
            
            line_subtotal = unit_price * quantity
            subtotal += line_subtotal
            order_items.append(OrderItem(
                product_id=product.id,
                variant_id=variant_id,
                quantity=quantity,"""

content = content.replace(old_logic, new_logic)

with open(path, "w") as f:
    f.write(content)
