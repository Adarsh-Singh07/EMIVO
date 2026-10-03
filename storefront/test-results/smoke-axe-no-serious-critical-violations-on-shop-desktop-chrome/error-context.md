# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> axe: no serious/critical violations on shop
- Location: tests\e2e\smoke.spec.ts:36:7

# Error details

```
Error: a11y violations on /shop: select-name(critical): select

expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  [{"description": "Ensure select element has an accessible name", "help": "Select element must have an accessible name", "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/select-name?application=playwright", "id": "select-name", "impact": "critical", "nodes": [{"all": [], "any": [{"data": {"implicitLabel": ""}, "id": "implicit-label", "impact": "critical", "message": "Element does not have an implicit (wrapped) <label>", "relatedNodes": [{"html": "<label class=\"flex items-center gap-2 text-sm text-neutral-500\">", "target": [".lg\\:flex.mb-6.hidden > label"]}]}, {"data": null, "id": "explicit-label", "impact": "critical", "message": "Element does not have an explicit <label>", "relatedNodes": []}, {"data": null, "id": "aria-label", "impact": "critical", "message": "aria-label attribute does not exist or is empty", "relatedNodes": []}, {"data": null, "id": "aria-labelledby", "impact": "critical", "message": "aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty", "relatedNodes": []}, {"data": {"messageKey": "noAttr"}, "id": "non-empty-title", "impact": "critical", "message": "Element has no title attribute", "relatedNodes": []}, {"data": null, "id": "presentational-role", "impact": "critical", "message": "Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"", "relatedNodes": []}], "failureSummary": "Fix any of the following:
  Element does not have an implicit (wrapped) <label>
  Element does not have an explicit <label>
  aria-label attribute does not exist or is empty
  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty
  Element has no title attribute
  Element's default semantics were not overridden with role=\"none\" or role=\"presentation\"", "html": "<select class=\"h-10 border border-neutral-200 rounded-full px-4 text-sm focus:outline-none focus:border-neutral-950\">", "impact": "critical", "none": [], "target": ["select"]}], "tags": ["cat.forms", "wcag2a", "wcag412", "section508", "section508.22.n", "TTv5", "TT5.c", "EN-301-549", "EN-9.4.1.2", "ACT", …]}]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Open support chat" [ref=e3]
  - generic "Announcements" [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - text: Enjoy free shipping on orders over ₹999!
        - link "Shop Now" [ref=e10] [cursor=pointer]:
          - /url: /shop
      - generic [ref=e11]: •
      - link "Order Tracking" [ref=e12] [cursor=pointer]:
        - /url: /order-tracking
      - link "About Us" [ref=e13] [cursor=pointer]:
        - /url: /about
      - link "FAQ" [ref=e14] [cursor=pointer]:
        - /url: /faq
      - generic [ref=e15]: •
      - generic [ref=e16]: English · INR
    - generic [aria-hidden] [ref=e18]:
      - generic [ref=e19]:
        - text: Enjoy free shipping on orders over ₹999!
        - link [ref=e20] [cursor=pointer]:
          - /url: /shop
          - text: Shop Now
      - generic [ref=e21]: •
      - link [ref=e22] [cursor=pointer]:
        - /url: /order-tracking
        - text: Order Tracking
      - link [ref=e23] [cursor=pointer]:
        - /url: /about
        - text: About Us
      - link [ref=e24] [cursor=pointer]:
        - /url: /faq
        - text: FAQ
      - generic [ref=e25]: •
      - generic [ref=e26]: English · INR
  - banner [ref=e27]:
    - generic [ref=e28]:
      - link "ELEKTRIX ELEKTRIX India's Premium Electronics Store" [ref=e29] [cursor=pointer]:
        - /url: /
        - generic [ref=e30]:
          - img "ELEKTRIX" [ref=e31]
          - generic [ref=e32]: ELEKTRIX
        - generic [ref=e33]: India's Premium Electronics Store
      - button "Change delivery pincode" [ref=e34]:
        - generic [ref=e35]: Delivering to
        - generic [ref=e36]: "841508"
      - generic [ref=e44]:
        - textbox "Search products" [ref=e45]
        - button "Search" [ref=e46]
      - generic [ref=e51]:
        - link "Hello, Sign in" [ref=e52] [cursor=pointer]:
          - /url: /login
          - generic [ref=e56]:
            - generic [ref=e57]: Hello,
            - generic [ref=e58]: Sign in
        - link "Notifications — sign in to see yours" [ref=e59] [cursor=pointer]:
          - /url: /login
        - link "Compare (0 products)" [ref=e63] [cursor=pointer]:
          - /url: /compare
        - link "Wishlist (0 items)" [ref=e68] [cursor=pointer]:
          - /url: /account/wishlist
        - button "Cart (0 items)" [ref=e71]
    - navigation "Primary" [ref=e75]:
      - generic [ref=e76]:
        - link "Home" [ref=e77] [cursor=pointer]:
          - /url: /
        - link "Shop" [ref=e78] [cursor=pointer]:
          - /url: /shop
        - link "Mobiles" [ref=e79] [cursor=pointer]:
          - /url: /shop?category=mobiles
        - link "Laptops" [ref=e80] [cursor=pointer]:
          - /url: /shop?category=laptops
        - link "Audio" [ref=e81] [cursor=pointer]:
          - /url: /shop?category=audio
        - link "Appliances" [ref=e82] [cursor=pointer]:
          - /url: /shop?category=appliances
        - link "Wearables" [ref=e83] [cursor=pointer]:
          - /url: /shop?category=wearables
        - link "Blog" [ref=e84] [cursor=pointer]:
          - /url: /blog
        - link "Contact" [ref=e85] [cursor=pointer]:
          - /url: /contact
  - complementary "Shopping cart" [ref=e86]:
    - generic [ref=e87]:
      - generic [ref=e88]:
        - heading "Your Cart (0)" [level=3] [ref=e89]
        - button "Close cart" [ref=e90]
      - generic [ref=e95]:
        - paragraph [ref=e99]: Your cart is empty.
        - link "Start Shopping" [ref=e100] [cursor=pointer]:
          - /url: /shop
  - main [ref=e101]:
    - generic [ref=e102]:
      - navigation [ref=e103]:
        - link "Home" [ref=e104] [cursor=pointer]:
          - /url: /
        - text: / Shop
      - generic [ref=e105]:
        - generic [ref=e106]:
          - heading "All Products" [level=1] [ref=e107]
          - paragraph [ref=e108]: Genuine electronics with brand warranty, open-box delivery at your doorstep and fast shipping across India.
          - paragraph [ref=e109]: 14 products
        - generic [ref=e110]:
          - textbox "Search products" [ref=e111]:
            - /placeholder: Search in store
          - button "Search" [ref=e112]
      - generic [ref=e116]: Live catalog is unreachable (Failed to fetch) — showing the offline catalog.
      - generic [ref=e124]:
        - link "All" [ref=e125] [cursor=pointer]:
          - /url: /shop
        - link "Mobiles" [ref=e126] [cursor=pointer]:
          - /url: /shop?category=mobiles
        - link "Laptops" [ref=e127] [cursor=pointer]:
          - /url: /shop?category=laptops
        - link "Appliances" [ref=e128] [cursor=pointer]:
          - /url: /shop?category=appliances
        - link "Audio" [ref=e129] [cursor=pointer]:
          - /url: /shop?category=audio
        - link "Wearables" [ref=e130] [cursor=pointer]:
          - /url: /shop?category=wearables
        - link "Accessories" [ref=e131] [cursor=pointer]:
          - /url: /shop?category=accessories
      - generic [ref=e132]:
        - complementary [ref=e133]:
          - generic [ref=e134]:
            - heading "Price (₹)" [level=3] [ref=e135]
            - generic [ref=e136]:
              - textbox "Minimum price" [ref=e137]:
                - /placeholder: Min
              - generic [ref=e138]: —
              - textbox "Maximum price" [ref=e139]:
                - /placeholder: Max
            - button "Apply" [ref=e140]
          - generic [ref=e141]:
            - heading "Availability" [level=3] [ref=e142]
            - generic [ref=e143] [cursor=pointer]:
              - checkbox "In stock only" [ref=e144]
              - text: In stock only
        - generic [ref=e145]:
          - generic [ref=e146]:
            - paragraph [ref=e147]: 14 products
            - combobox [ref=e152]:
              - option "Relevance" [selected]
              - 'option "Price: Low to High"'
              - 'option "Price: High to Low"'
              - option "Newest first"
              - option "Biggest discount"
          - generic [ref=e153]:
            - generic [ref=e154]:
              - generic [ref=e155]:
                - link "iPhone 16 Pro 256GB":
                  - /url: /product/iphone-16-pro-256gb
                  - img "iPhone 16 Pro 256GB" [ref=e157] [cursor=pointer]
                  - img "iPhone 16 Pro 256GB" [ref=e159] [cursor=pointer]
                - generic [ref=e160]: 11% OFF
                - button "Add to wishlist" [ref=e161]
                - generic [ref=e164]:
                  - button "Add to compare" [ref=e165]
                  - link "View iPhone 16 Pro 256GB" [ref=e171] [cursor=pointer]:
                    - /url: /product/iphone-16-pro-256gb
              - generic [ref=e175]:
                - paragraph [ref=e177]: Apple
                - link "iPhone 16 Pro 256GB" [ref=e178] [cursor=pointer]:
                  - /url: /product/iphone-16-pro-256gb
                - generic [ref=e180]:
                  - generic [ref=e181]: ₹1,19,900
                  - generic [ref=e182]: ₹1,34,900
                  - generic [ref=e183]: 11% OFF
                - paragraph [ref=e184]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e186]
            - generic [ref=e190]:
              - generic [ref=e191]:
                - link "MacBook Air 13\" M3 8GB/256GB":
                  - /url: /product/macbook-air-m3
                  - img "MacBook Air 13\" M3 8GB/256GB" [ref=e193] [cursor=pointer]
                  - img "MacBook Air 13\" M3 8GB/256GB" [ref=e195] [cursor=pointer]
                - generic [ref=e196]: 13% OFF
                - button "Add to wishlist" [ref=e197]
                - generic [ref=e200]:
                  - button "Add to compare" [ref=e201]
                  - link "View MacBook Air 13\" M3 8GB/256GB" [ref=e207] [cursor=pointer]:
                    - /url: /product/macbook-air-m3
              - generic [ref=e211]:
                - paragraph [ref=e213]: Apple
                - link "MacBook Air 13\" M3 8GB/256GB" [ref=e214] [cursor=pointer]:
                  - /url: /product/macbook-air-m3
                - generic [ref=e216]:
                  - generic [ref=e217]: ₹99,900
                  - generic [ref=e218]: ₹1,14,900
                  - generic [ref=e219]: 13% OFF
                - paragraph [ref=e220]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e222]
            - generic [ref=e226]:
              - generic [ref=e227]:
                - link "Ultra HD Smart LED TV 55\" 4K":
                  - /url: /product/smart-tv-55
                  - img "Ultra HD Smart LED TV 55\" 4K" [ref=e229] [cursor=pointer]
                  - img "Ultra HD Smart LED TV 55\" 4K" [ref=e231] [cursor=pointer]
                - generic [ref=e232]: 39% OFF
                - button "Add to wishlist" [ref=e233]
                - generic [ref=e236]:
                  - button "Add to compare" [ref=e237]
                  - link "View Ultra HD Smart LED TV 55\" 4K" [ref=e243] [cursor=pointer]:
                    - /url: /product/smart-tv-55
              - generic [ref=e247]:
                - paragraph [ref=e249]: LG
                - link "Ultra HD Smart LED TV 55\" 4K" [ref=e250] [cursor=pointer]:
                  - /url: /product/smart-tv-55
                - generic [ref=e252]:
                  - generic [ref=e253]: ₹42,990
                  - generic [ref=e254]: ₹69,990
                  - generic [ref=e255]: 39% OFF
                - paragraph [ref=e256]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e258]
            - generic [ref=e262]:
              - generic [ref=e263]:
                - link "Sony WH-1000XM5 Wireless Headphones":
                  - /url: /product/sony-wh1000xm5
                  - img "Sony WH-1000XM5 Wireless Headphones" [ref=e265] [cursor=pointer]
                  - img "Sony WH-1000XM5 Wireless Headphones" [ref=e267] [cursor=pointer]
                - generic [ref=e268]: 23% OFF
                - button "Add to wishlist" [ref=e269]
                - generic [ref=e272]:
                  - button "Add to compare" [ref=e273]
                  - link "View Sony WH-1000XM5 Wireless Headphones" [ref=e279] [cursor=pointer]:
                    - /url: /product/sony-wh1000xm5
              - generic [ref=e283]:
                - paragraph [ref=e285]: Sony
                - link "Sony WH-1000XM5 Wireless Headphones" [ref=e286] [cursor=pointer]:
                  - /url: /product/sony-wh1000xm5
                - generic [ref=e288]:
                  - generic [ref=e289]: ₹26,990
                  - generic [ref=e290]: ₹34,990
                  - generic [ref=e291]: 23% OFF
                - paragraph [ref=e292]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e294]
            - generic [ref=e298]:
              - generic [ref=e299]:
                - link "Active Noise-Cancelling RW75":
                  - /url: /product/anc-rw75
                  - img "Active Noise-Cancelling RW75" [ref=e301] [cursor=pointer]
                  - img "Active Noise-Cancelling RW75" [ref=e303] [cursor=pointer]
                - generic [ref=e304]: 14% OFF
                - button "Add to wishlist" [ref=e305]
                - generic [ref=e308]:
                  - button "Add to compare" [ref=e309]
                  - link "View Active Noise-Cancelling RW75" [ref=e315] [cursor=pointer]:
                    - /url: /product/anc-rw75
              - generic [ref=e319]:
                - paragraph [ref=e321]: JBL
                - link "Active Noise-Cancelling RW75" [ref=e322] [cursor=pointer]:
                  - /url: /product/anc-rw75
                - generic [ref=e324]:
                  - generic [ref=e325]: ₹8,519
                  - generic [ref=e326]: ₹10,277
                  - generic [ref=e327]: 14% OFF
                - paragraph [ref=e328]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e330]
            - generic [ref=e334]:
              - generic [ref=e335]:
                - link "RW98 Bugatti Studio Headphones":
                  - /url: /product/bugatti-studio
                  - img "RW98 Bugatti Studio Headphones" [ref=e337] [cursor=pointer]
                  - img "RW98 Bugatti Studio Headphones" [ref=e339] [cursor=pointer]
                - generic [ref=e340]: 13% OFF
                - button "Add to wishlist" [ref=e341]
                - generic [ref=e344]:
                  - button "Add to compare" [ref=e345]
                  - link "View RW98 Bugatti Studio Headphones" [ref=e351] [cursor=pointer]:
                    - /url: /product/bugatti-studio
              - generic [ref=e355]:
                - paragraph [ref=e357]: Bose
                - link "RW98 Bugatti Studio Headphones" [ref=e358] [cursor=pointer]:
                  - /url: /product/bugatti-studio
                - generic [ref=e360]:
                  - generic [ref=e361]: ₹12,499
                  - generic [ref=e362]: ₹14,399
                  - generic [ref=e363]: 13% OFF
                - paragraph [ref=e364]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e366]
            - generic [ref=e370]:
              - generic [ref=e371]:
                - link "JBL Flip 6 Portable Bluetooth Speaker":
                  - /url: /product/jbl-flip-speaker
                  - img "JBL Flip 6 Portable Bluetooth Speaker" [ref=e373] [cursor=pointer]
                  - img "JBL Flip 6 Portable Bluetooth Speaker" [ref=e375] [cursor=pointer]
                - generic [ref=e376]: 30% OFF
                - button "Add to wishlist" [ref=e377]
                - generic [ref=e380]:
                  - button "Add to compare" [ref=e381]
                  - link "View JBL Flip 6 Portable Bluetooth Speaker" [ref=e387] [cursor=pointer]:
                    - /url: /product/jbl-flip-speaker
              - generic [ref=e391]:
                - paragraph [ref=e393]: JBL
                - link "JBL Flip 6 Portable Bluetooth Speaker" [ref=e394] [cursor=pointer]:
                  - /url: /product/jbl-flip-speaker
                - generic [ref=e396]:
                  - generic [ref=e397]: ₹8,999
                  - generic [ref=e398]: ₹12,999
                  - generic [ref=e399]: 30% OFF
                - paragraph [ref=e400]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e402]
            - generic [ref=e406]:
              - generic [ref=e407]:
                - link "Wireless Earbuds Pro 3 ANC":
                  - /url: /product/airpods-pro-3
                  - img "Wireless Earbuds Pro 3 ANC" [ref=e409] [cursor=pointer]
                  - img "Wireless Earbuds Pro 3 ANC" [ref=e411] [cursor=pointer]
                - generic [ref=e412]: 12% OFF
                - button "Add to wishlist" [ref=e413]
                - generic [ref=e416]:
                  - button "Add to compare" [ref=e417]
                  - link "View Wireless Earbuds Pro 3 ANC" [ref=e423] [cursor=pointer]:
                    - /url: /product/airpods-pro-3
              - generic [ref=e427]:
                - paragraph [ref=e429]: Apple
                - link "Wireless Earbuds Pro 3 ANC" [ref=e430] [cursor=pointer]:
                  - /url: /product/airpods-pro-3
                - generic [ref=e432]:
                  - generic [ref=e433]: ₹21,990
                  - generic [ref=e434]: ₹24,990
                  - generic [ref=e435]: 12% OFF
                - paragraph [ref=e436]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e438]
            - generic [ref=e442]:
              - generic [ref=e443]:
                - link "Gaming Headset X1 RGB 7.1":
                  - /url: /product/gaming-headset-x1
                  - img "Gaming Headset X1 RGB 7.1" [ref=e445] [cursor=pointer]
                  - img "Gaming Headset X1 RGB 7.1" [ref=e447] [cursor=pointer]
                - generic [ref=e448]: 32% OFF
                - button "Add to wishlist" [ref=e449]
                - generic [ref=e452]:
                  - button "Add to compare" [ref=e453]
                  - link "View Gaming Headset X1 RGB 7.1" [ref=e459] [cursor=pointer]:
                    - /url: /product/gaming-headset-x1
              - generic [ref=e463]:
                - paragraph [ref=e465]: Samsung
                - link "Gaming Headset X1 RGB 7.1" [ref=e466] [cursor=pointer]:
                  - /url: /product/gaming-headset-x1
                - generic [ref=e468]:
                  - generic [ref=e469]: ₹6,499
                  - generic [ref=e470]: ₹9,499
                  - generic [ref=e471]: 32% OFF
                - paragraph [ref=e472]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e474]
            - generic [ref=e478]:
              - generic [ref=e479]:
                - link "Watch Ultra 2 GPS + Cellular 49mm":
                  - /url: /product/watch-ultra-2
                  - img "Watch Ultra 2 GPS + Cellular 49mm" [ref=e481] [cursor=pointer]
                  - img "Watch Ultra 2 GPS + Cellular 49mm" [ref=e483] [cursor=pointer]
                - generic [ref=e484]: 10% OFF
                - button "Add to wishlist" [ref=e485]
                - generic [ref=e488]:
                  - button "Add to compare" [ref=e489]
                  - link "View Watch Ultra 2 GPS + Cellular 49mm" [ref=e495] [cursor=pointer]:
                    - /url: /product/watch-ultra-2
              - generic [ref=e499]:
                - paragraph [ref=e501]: Apple
                - link "Watch Ultra 2 GPS + Cellular 49mm" [ref=e502] [cursor=pointer]:
                  - /url: /product/watch-ultra-2
                - generic [ref=e504]:
                  - generic [ref=e505]: ₹89,900
                  - generic [ref=e506]: ₹99,900
                  - generic [ref=e507]: 10% OFF
                - paragraph [ref=e508]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e510]
            - generic [ref=e514]:
              - generic [ref=e515]:
                - link "Studio Condenser Microphone Pro":
                  - /url: /product/studio-mic-pro
                  - img "Studio Condenser Microphone Pro" [ref=e517] [cursor=pointer]
                  - img "Studio Condenser Microphone Pro" [ref=e519] [cursor=pointer]
                - generic [ref=e520]: 33% OFF
                - button "Add to wishlist" [ref=e521]
                - generic [ref=e524]:
                  - button "Add to compare" [ref=e525]
                  - link "View Studio Condenser Microphone Pro" [ref=e531] [cursor=pointer]:
                    - /url: /product/studio-mic-pro
              - generic [ref=e535]:
                - paragraph [ref=e537]: Bose
                - link "Studio Condenser Microphone Pro" [ref=e538] [cursor=pointer]:
                  - /url: /product/studio-mic-pro
                - generic [ref=e540]:
                  - generic [ref=e541]: ₹5,999
                  - generic [ref=e542]: ₹8,999
                  - generic [ref=e543]: 33% OFF
                - paragraph [ref=e544]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e546]
            - generic [ref=e550]:
              - generic [ref=e551]:
                - link "DJ MH40 L_UNIFORM Headphones":
                  - /url: /product/dj-headphones
                  - img "DJ MH40 L_UNIFORM Headphones" [ref=e553] [cursor=pointer]
                  - img "DJ MH40 L_UNIFORM Headphones" [ref=e555] [cursor=pointer]
                - generic [ref=e556]: 24% OFF
                - button "Add to wishlist" [ref=e557]
                - generic [ref=e560]:
                  - button "Add to compare" [ref=e561]
                  - link "View DJ MH40 L_UNIFORM Headphones" [ref=e567] [cursor=pointer]:
                    - /url: /product/dj-headphones
              - generic [ref=e571]:
                - paragraph [ref=e573]: JBL
                - link "DJ MH40 L_UNIFORM Headphones" [ref=e574] [cursor=pointer]:
                  - /url: /product/dj-headphones
                - generic [ref=e576]:
                  - generic [ref=e577]: ₹7,499
                  - generic [ref=e578]: ₹9,899
                  - generic [ref=e579]: 24% OFF
                - paragraph [ref=e580]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e582]
            - generic [ref=e586]:
              - generic [ref=e587]:
                - link "Active Noise-Cancelling SW85":
                  - /url: /product/premium-over-ear
                  - img "Active Noise-Cancelling SW85" [ref=e589] [cursor=pointer]
                  - img "Active Noise-Cancelling SW85" [ref=e591] [cursor=pointer]
                - generic [ref=e592]: 50% OFF
                - button "Add to wishlist" [ref=e593]
                - generic [ref=e596]:
                  - button "Add to compare" [ref=e597]
                  - link "View Active Noise-Cancelling SW85" [ref=e603] [cursor=pointer]:
                    - /url: /product/premium-over-ear
              - generic [ref=e607]:
                - paragraph [ref=e609]: Bose
                - link "Active Noise-Cancelling SW85" [ref=e610] [cursor=pointer]:
                  - /url: /product/premium-over-ear
                - generic [ref=e612]:
                  - generic [ref=e613]: ₹10,785
                  - generic [ref=e614]: ₹21,499
                  - generic [ref=e615]: 50% OFF
                - paragraph [ref=e616]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e618]
            - generic [ref=e622]:
              - generic [ref=e623]:
                - link "Over-Ear Comfort Headphones":
                  - /url: /product/over-ear-51
                  - img "Over-Ear Comfort Headphones" [ref=e625] [cursor=pointer]
                  - img "Over-Ear Comfort Headphones" [ref=e627] [cursor=pointer]
                - generic [ref=e628]: 31% OFF
                - button "Add to wishlist" [ref=e629]
                - generic [ref=e632]:
                  - button "Add to compare" [ref=e633]
                  - link "View Over-Ear Comfort Headphones" [ref=e639] [cursor=pointer]:
                    - /url: /product/over-ear-51
              - generic [ref=e643]:
                - paragraph [ref=e645]: Sony
                - link "Over-Ear Comfort Headphones" [ref=e646] [cursor=pointer]:
                  - /url: /product/over-ear-51
                - generic [ref=e648]:
                  - generic [ref=e649]: ₹4,499
                  - generic [ref=e650]: ₹6,499
                  - generic [ref=e651]: 31% OFF
                - paragraph [ref=e652]: Dispatched in 24-48 hrs
                - button "Add to Cart" [ref=e654]
  - contentinfo [ref=e658]:
    - generic [ref=e659]:
      - generic [ref=e660]:
        - link "ELEKTRIX ELEKTRIX" [ref=e661] [cursor=pointer]:
          - /url: /
          - img "ELEKTRIX" [ref=e662]
          - generic [ref=e663]: ELEKTRIX
        - paragraph [ref=e664]: Premium electronics store bringing you the latest mobiles, laptops, appliances and audio gear with unbeatable prices and fast delivery.
        - generic [ref=e665]:
          - generic [ref=e666]: +91 80920 24066
          - generic [ref=e669]: support@elektrix.in
          - generic [ref=e673]: M/S APANA ENTERPRISESDS1, 109, Near Indian Petrol Pump,Vijayipur, Gopalganj, Bihar - 841508
          - generic [ref=e678]: "GSTIN: 10COMPG4070G1ZB"
          - generic [ref=e679]:
            - link "Elektrix on X (Twitter)" [ref=e680] [cursor=pointer]:
              - /url: https://x.com/elektrix_in
            - link "Elektrix on LinkedIn" [ref=e683] [cursor=pointer]:
              - /url: https://www.linkedin.com/company/elektrix-in/
            - link "Elektrix on Facebook" [ref=e686] [cursor=pointer]:
              - /url: https://www.facebook.com/share/1HaVFzFU7k/
            - link "Elektrix on Instagram" [ref=e689] [cursor=pointer]:
              - /url: https://www.instagram.com/elektrix.in/
      - generic [ref=e692]:
        - heading "Shop" [level=4] [ref=e693]
        - list [ref=e694]:
          - listitem [ref=e695]:
            - link "Mobiles" [ref=e696] [cursor=pointer]:
              - /url: /shop?category=mobiles
          - listitem [ref=e697]:
            - link "Laptops" [ref=e698] [cursor=pointer]:
              - /url: /shop?category=laptops
          - listitem [ref=e699]:
            - link "Audio" [ref=e700] [cursor=pointer]:
              - /url: /shop?category=audio
          - listitem [ref=e701]:
            - link "Appliances" [ref=e702] [cursor=pointer]:
              - /url: /shop?category=appliances
          - listitem [ref=e703]:
            - link "Wearables" [ref=e704] [cursor=pointer]:
              - /url: /shop?category=wearables
      - generic [ref=e705]:
        - heading "Company & Legal" [level=4] [ref=e706]
        - list [ref=e707]:
          - listitem [ref=e708]:
            - link "About Us" [ref=e709] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e710]:
            - link "Contact" [ref=e711] [cursor=pointer]:
              - /url: /contact
          - listitem [ref=e712]:
            - link "Help & Support" [ref=e713] [cursor=pointer]:
              - /url: /support
          - listitem [ref=e714]:
            - link "FAQ" [ref=e715] [cursor=pointer]:
              - /url: /faq
          - listitem [ref=e716]:
            - link "Privacy Policy" [ref=e717] [cursor=pointer]:
              - /url: /privacy
          - listitem [ref=e718]:
            - link "Terms & Conditions" [ref=e719] [cursor=pointer]:
              - /url: /terms
          - listitem [ref=e720]:
            - link "Return Policy" [ref=e721] [cursor=pointer]:
              - /url: /refund
          - listitem [ref=e722]:
            - link "Shipping Policy" [ref=e723] [cursor=pointer]:
              - /url: /shipping
          - listitem [ref=e724]:
            - link "Cookie Policy" [ref=e725] [cursor=pointer]:
              - /url: /cookie
      - generic [ref=e726]:
        - heading "Newsletter" [level=4] [ref=e727]
        - paragraph [ref=e728]: Deals, drops and restocks — no spam.
        - generic [ref=e729]:
          - textbox "Email address" [ref=e730]:
            - /placeholder: Enter your email
          - button "Subscribe" [ref=e731]
    - generic [ref=e733]:
      - generic [ref=e734]: © 2026 ELEKTRIX. All rights reserved.
      - generic [ref=e735]: Secured by VISA · MasterCard · UPI · Netbanking · COD
  - region "Notifications alt+T"
  - alert [ref=e736]
  - dialog "Cookie consent" [ref=e737]:
    - generic [ref=e738]:
      - heading "We value your privacy" [level=3] [ref=e739]
      - paragraph [ref=e740]: We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic.
    - generic [ref=e741]:
      - button "Accept" [ref=e742]
      - button "Close cookie banner" [ref=e743]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import AxeBuilder from "@axe-core/playwright";
  3  | 
  4  | /**
  5  |  * Read-only smoke + accessibility gate (Phase 6).
  6  |  * Safe to run against production: GET navigations only, no auth, no mutations.
  7  |  * axe fails on serious/critical violations (WCAG 2.2 AA focus per brief §6).
  8  |  */
  9  | 
  10 | const KEY_PAGES = [
  11 |   { path: "/", name: "home" },
  12 |   { path: "/shop", name: "shop" },
  13 |   { path: "/cart", name: "cart" },
  14 |   { path: "/login", name: "login" },
  15 |   { path: "/register", name: "register" },
  16 |   { path: "/support", name: "support" },
  17 |   { path: "/compare", name: "compare" },
  18 |   { path: "/offline", name: "offline" },
  19 | ];
  20 | 
  21 | async function axeScan(page: import("@playwright/test").Page) {
  22 |   const results = await new AxeBuilder({ page })
  23 |     .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
  24 |     .analyze();
  25 |   return results.violations.filter((v) => ["serious", "critical"].includes(v.impact || ""));
  26 | }
  27 | 
  28 | for (const { path, name } of KEY_PAGES) {
  29 |   test(`page loads: ${name}`, async ({ page }) => {
  30 |     const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
  31 |     expect(resp?.status(), `${path} should return 200`).toBeLessThan(400);
  32 |     // Every page must render the site header — a blank shell means the app broke.
  33 |     await expect(page.locator("header").first()).toBeVisible();
  34 |   });
  35 | 
  36 |   test(`axe: no serious/critical violations on ${name}`, async ({ page }) => {
  37 |     await page.goto(path, { waitUntil: "domcontentloaded" });
  38 |     await page.waitForTimeout(1_500); // let client components hydrate
  39 |     const violations = await axeScan(page);
  40 |     const summary = violations
  41 |       .map((v) => `${v.id}(${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`)
  42 |       .join(" | ");
> 43 |     expect(violations, `a11y violations on ${path}: ${summary}`).toHaveLength(0);
     |                                                                  ^ Error: a11y violations on /shop: select-name(critical): select
  44 |   });
  45 | }
  46 | 
  47 | test("axe: PDP renders with clean layout and no critical violations", async ({ page }) => {
  48 |   // Pick any in-stock product from the shop grid (read-only).
  49 |   await page.goto("/shop", { waitUntil: "domcontentloaded" });
  50 |   const productLink = page.locator('a[href^="/product/"]').filter({ visible: true }).first();
  51 |   await productLink.waitFor({ state: "visible", timeout: 15_000 });
  52 |   const href = await productLink.getAttribute("href");
  53 |   expect(href, "shop grid should link to a product").toBeTruthy();
  54 | 
  55 |   await page.goto(href!, { waitUntil: "domcontentloaded" });
  56 |   await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  57 | 
  58 |   // The regression that shipped to phones on 2026-10-03: CTAs stretched past
  59 |   // the viewport. Assert every primary CTA is fully on-screen.
  60 |   const addToCart = page.getByRole("button", { name: /add to cart/i }).first();
  61 |   await addToCart.scrollIntoViewIfNeeded();
  62 |   const box = await addToCart.boundingBox();
  63 |   expect(box, "Add to Cart must be visible").not.toBeNull();
  64 |   const vw = await page.evaluate(() => document.documentElement.clientWidth);
  65 |   expect(box!.x, "Add to Cart left edge inside viewport").toBeGreaterThanOrEqual(0);
  66 |   expect(box!.x + box!.width, "Add to Cart right edge inside viewport").toBeLessThanOrEqual(vw + 1);
  67 | 
  68 |   // No unreachable horizontal overflow anywhere on the PDP (mobile project).
  69 |   const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  70 |   expect(overflow, "no horizontal overflow on PDP").toBeLessThanOrEqual(2);
  71 | 
  72 |   const violations = await axeScan(page);
  73 |   const summary = violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`).join(" | ");
  74 |   expect(violations, `a11y violations on PDP: ${summary}`).toHaveLength(0);
  75 | });
  76 | 
```