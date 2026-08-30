with open("storefront/app/checkout/page.tsx", "r") as f:
    content = f.read()

target = """        setPendingPayment({ order, paymentId: init.payment.id });
        const co = init.checkout;"""

replacement = """        const co = init.checkout;"""

content = content.replace(target, replacement)

target2 = """      } catch (err) {
        setPendingPayment({ order, paymentId });
        toast.error("Online payment is facing issues. Please try Cash on Delivery (COD).");
        setPaymentMethod("COD");
        setPlacing(false);
      }"""

replacement2 = """      } catch (err) {
        // DO NOT set pending payment here either. Just show the error and let them retry.
        toast.error("Online payment is facing issues. Please try Cash on Delivery (COD).");
        setPaymentMethod("COD");
        setPlacing(false);
      }"""

content = content.replace(target2, replacement2)

with open("storefront/app/checkout/page.tsx", "w") as f:
    f.write(content)
print("Patched checkout flicker 2!")
