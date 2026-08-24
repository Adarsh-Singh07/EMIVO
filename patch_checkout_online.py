import re

path = "/opt/elektrix/storefront/app/checkout/page.tsx"
with open(path, "r") as f:
    content = f.read()

# Add a warning below the online payment button if selected
old_button = """                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-semibold">Online Payment</span>
                    <span className="text-xs text-neutral-500">UPI, Cards, Netbanking</span>
                  </button>
                )}"""

new_button = """                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-semibold">Online Payment</span>
                    <span className="text-xs text-neutral-500">UPI, Cards, Netbanking</span>
                  </button>
                )}"""

# Actually, I can just modify the onlinePaymentAvailable variable!
# Wait, let's see how `onlinePaymentAvailable` is set.
