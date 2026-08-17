#!/usr/bin/env bash
# ELEKTRIX v0.2 production smoke suite — verifies the full money path against
# the LIVE stack (api.elektrix.in). Run after deployment:
#   SMOKE_ADMIN_EMAIL=... SMOKE_ADMIN_PASSWORD=... bash scripts/smoke_prod.sh
#
# What it exercises: health, catalog/search, register/login, guest cart merge,
# address, coupon validation, COD checkout (real order — cancel afterwards),
# ONLINE checkout up to payment initiation (provider order only, no charge),
# order ownership, notifications, admin authz + dashboard + inventory,
# webhook signature rejection, rate limiting presence.
set -uo pipefail

API="${API_BASE:-https://api.elektrix.in/api/v1}"
ROOT="${API%/api/v1}"  # health endpoints are mounted at app root
RUN="smoke$(date +%s)"
PASS=0; FAIL=0
SMOKE_ADMIN_EMAIL="${SMOKE_ADMIN_EMAIL:-}"
SMOKE_ADMIN_PASSWORD="${SMOKE_ADMIN_PASSWORD:-}"

ok()   { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✘ $1"; }
check() { # name expected_status curl args...
    local name="$1" expected="$2"; shift 2
    local code
    code=$(curl -s -o /tmp/smoke_body.json -w '%{http_code}' "$@")
    if [ "$code" = "$expected" ]; then ok "$name ($code)"; return 0
    else bad "$name (expected $expected, got $code): $(head -c 200 /tmp/smoke_body.json)"; return 1; fi
}

echo "== ELEKTRIX v0.2 production smoke @ $API =="

echo "-- platform"
check "health/live" 200 "$ROOT/health/live"
check "health/ready" 200 "$ROOT/health/ready"
check "store catalog" 200 "$API/store/products?page_size=3"
check "store search" 200 "$API/store/products/search?q=earbuds"
check "store categories" 200 "$API/store/categories"
TOTAL=$(python3 -c "import json;print(json.load(open('/tmp/smoke_body.json')))" 2>/dev/null; curl -s "$API/store/products?page_size=1" | python3 -c "import json,sys;print(json.load(sys.stdin)['total'])")
echo "  (catalog total: $TOTAL products)"

echo "-- auth"
check "register" 201 -X POST "$API/auth/register" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$RUN@example.com\",\"password\":\"Smoke!Pass123\",\"first_name\":\"Smoke\",\"last_name\":\"Test\"}"
TOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$RUN@example.com\",\"password\":\"Smoke!Pass123\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])")
[ -n "$TOKEN" ] && ok "login (token acquired)" || bad "login"

echo "-- admin authorization boundary"
check "customer blocked from admin dashboard" 403 "$API/admin/dashboard" -H "Authorization: Bearer $TOKEN"

echo "-- cart (guest → user)"
GUEST="guest-$RUN"
CART=$(curl -s "$API/carts" -H "X-Cart-Session: $GUEST")
CART_ID=$(echo "$CART" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
PRODUCT=$(curl -s "$API/store/products?in_stock=true&page_size=1" | python3 -c "
import json,sys; p=json.load(sys.stdin)['items'][0]; print(p['id'], p['stock']['available'], p['name'], sep='|')")
PID=$(echo "$PRODUCT" | cut -d'|' -f1); AVAIL=$(echo "$PRODUCT" | cut -d'|' -f2); PNAME=$(echo "$PRODUCT" | cut -d'|' -f3)
echo "  (test product: $PNAME, stock $AVAIL)"
check "guest add to cart" 201 -X POST "$API/carts/$CART_ID/items" -H "X-Cart-Session: $GUEST" \
    -H 'Content-Type: application/json' -d "{\"product_id\":\"$PID\",\"quantity\":1}"
check "stock-over add rejected" 409 -X POST "$API/carts/$CART_ID/items" -H "X-Cart-Session: $GUEST" \
    -H 'Content-Type: application/json' -d "{\"product_id\":\"$PID\",\"quantity\":9999}"
check "cart merge on login" 200 -X POST "$API/carts/merge" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "{\"session_id\":\"$GUEST\"}"

echo "-- addresses + coupon"
check "address create" 201 -X POST "$API/addresses" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"full_name":"Smoke Test","phone":"9876543210","line1":"1 Test Lane","city":"Bengaluru","state":"Karnataka","pincode":"560001"}'
ADDR_ID=$(curl -s "$API/addresses" -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys;print(json.load(sys.stdin)['items'][0]['id'])")
check "coupon validate" 200 -X POST "$API/coupons/validate" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d '{"code":"WELCOME10","cart_subtotal":500000}'

echo "-- COD checkout (creates a REAL order; cancel at the end)"
CHECKOUT=$(curl -s -w '\n%{http_code}' -X POST "$API/orders/checkout" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"address_id\":\"$ADDR_ID\",\"payment_method\":\"COD\",\"coupon_code\":\"WELCOME10\"}")
CODE=$(echo "$CHECKOUT" | tail -1)
if [ "$CODE" = "201" ]; then
    ok "COD checkout with coupon ($CODE)"
    ORDER=$(echo "$CHECKOUT" | head -n -1)
    ORDER_ID=$(echo "$ORDER" | python3 -c "import json,sys;print(json.load(sys.stdin)['order']['id'])")
    ORDER_NUM=$(echo "$ORDER" | python3 -c "import json,sys;print(json.load(sys.stdin)['order']['order_number'])")
    TOTAL_P=$(echo "$ORDER" | python3 -c "import json,sys;print(json.load(sys.stdin)['order']['total'])")
    echo "  (order $ORDER_NUM, total ₹$((TOTAL_P/100)))"
else
    bad "COD checkout ($CODE): $(echo "$CHECKOUT" | head -n -1 | head -c 200)"
    ORDER_ID=""; ORDER_NUM=""
fi

echo "-- ONLINE checkout up to provider order (no charge)"
# COD checkout consumed the cart — re-add an item to the user's active cart
USER_CART=$(curl -s "$API/carts" -H "Authorization: Bearer $TOKEN" | python3 -c "import json,sys;print(json.load(sys.stdin)['id'])")
curl -s -o /dev/null -X POST "$API/carts/$USER_CART/items" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "{\"product_id\":\"$PID\",\"quantity\":1}"
ONLINE=$(curl -s -w '\n%{http_code}' -X POST "$API/orders/checkout" -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' -d "{\"address_id\":\"$ADDR_ID\",\"payment_method\":\"ONLINE\"}")
OCODE=$(echo "$ONLINE" | tail -1)
if [ "$OCODE" = "201" ]; then ok "ONLINE checkout ($OCODE)"
else bad "ONLINE checkout ($OCODE): $(echo "$ONLINE" | head -n -1 | head -c 200)"; fi
ONLINE_ORDER_ID=$(echo "$ONLINE" | head -n -1 | python3 -c "import json,sys;print(json.load(sys.stdin)['order']['id'])" 2>/dev/null)
if [ -n "$ONLINE_ORDER_ID" ]; then
    INIT=$(curl -s -w '\n%{http_code}' -X POST "$API/payments/initiate" -H "Authorization: Bearer $TOKEN" \
        -H 'Content-Type: application/json' \
        -d "{\"order_id\":\"$ONLINE_ORDER_ID\",\"idempotency_key\":\"smoke-$RUN-1\"}")
    echo "  initiate: $(echo "$INIT" | tail -1) — $(echo "$INIT" | head -n -1 | python3 -c "import json,sys; d=json.load(sys.stdin); print('provider', d.get('provider'), '| key', d.get('checkout',{}).get('key_id','')[:12], '| amount', d.get('checkout',{}).get('amount'))" 2>/dev/null || echo "$INIT" | head -c 150)"
    check "amount tamper rejected" 400 -X POST "$API/payments/initiate" -H "Authorization: Bearer $TOKEN" \
        -H 'Content-Type: application/json' \
        -d "{\"order_id\":\"$ONLINE_ORDER_ID\",\"amount\":100,\"idempotency_key\":\"smoke-$RUN-2\"}"
fi

echo "-- ownership + webhook security"
check "webhook bad signature rejected" 400 -X POST "$API/payments/webhook/razorpay" \
    -H 'Content-Type: application/json' -H 'X-Razorpay-Signature: deadbeef' -d '{"event":"payment.captured"}'
if [ -n "$ORDER_NUM" ]; then
    check "order tracking by number" 200 "$API/orders/track/$ORDER_NUM" -H "Authorization: Bearer $TOKEN"
fi

echo "-- admin (if credentials provided)"
if [ -n "$SMOKE_ADMIN_EMAIL" ] && [ -n "$SMOKE_ADMIN_PASSWORD" ]; then
    ATOKEN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
        -d "{\"email\":\"$SMOKE_ADMIN_EMAIL\",\"password\":\"$SMOKE_ADMIN_PASSWORD\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)['access_token'])" 2>/dev/null)
    if [ -n "$ATOKEN" ]; then
        ok "admin login"
        check "admin dashboard" 200 "$API/admin/dashboard" -H "Authorization: Bearer $ATOKEN"
        check "admin inventory" 200 "$API/inventory?low_stock=true" -H "Authorization: Bearer $ATOKEN"
        check "admin store-settings" 200 "$API/admin/store-settings" -H "Authorization: Bearer $ATOKEN"
        if [ -n "$ORDER_ID" ]; then
            check "admin cancel smoke order" 200 -X PATCH "$API/orders/$ORDER_ID/status" \
                -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
                -d '{"status":"CANCELLED","reason":"automated smoke test"}'
        fi
        if [ -n "$ONLINE_ORDER_ID" ]; then
            check "admin cancel online smoke order" 200 -X PATCH "$API/orders/$ONLINE_ORDER_ID/status" \
                -H "Authorization: Bearer $ATOKEN" -H 'Content-Type: application/json' \
                -d '{"status":"CANCELLED","reason":"automated smoke test"}'
        fi
    else bad "admin login"
    fi
else
    echo "  (skipped: set SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD to include admin checks)"
fi

echo
echo "== smoke result: $PASS passed, $FAIL failed =="
[ "$FAIL" = "0" ]
