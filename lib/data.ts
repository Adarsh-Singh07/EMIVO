import { Product } from "../types/product";

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p_001",
    brand: "Apple",
    title: "iPhone 16 Pro",
    category: "Smartphone",
    tagline: "Titanium. So strong. So light. So Pro.",
    basePrice: 129900,
    mrp: 134900,
    baseEMI: 10825,
    rating: 4.9,
    reviewsCount: 1240,
    isNew: true,
    gallery: [
    { type: "image", url: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1000&auto=format&fit=crop", alt: "Product View 1" },
    { type: "image", url: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1000&auto=format&fit=crop", alt: "Product View 2" }
  ],
    colors: [
      { id: "c1", name: "Natural Titanium", value: "natural", hex: "#d5d4d0" },
      { id: "c2", name: "Blue Titanium", value: "blue", hex: "#404146" },
      { id: "c3", name: "White Titanium", value: "white", hex: "#f4f4f4" },
      { id: "c4", name: "Black Titanium", value: "black", hex: "#2c2c2c" },
    ],
    storageOptions: [
      { id: "s1", name: "128GB", value: "128gb", priceModifier: 0 },
      { id: "s2", name: "256GB", value: "256gb", priceModifier: 10000 },
      { id: "s3", name: "512GB", value: "512gb", priceModifier: 30000 },
      { id: "s4", name: "1TB", value: "1tb", priceModifier: 50000 },
    ],
    financeOptions: [
      { provider: "Bajaj Finserv", monthlyEMI: 14433, months: 9, tag: "No Cost EMI" },
      { provider: "HDFC Bank", monthlyEMI: 10825, months: 12 },
      { provider: "ICICI Bank", monthlyEMI: 5412, months: 24 },
    ],
    deliveryEstimate: "Get it by Tomorrow, 9 PM",
    warranty: "1 Year Apple Limited Warranty",
    retailerInfo: "Fulfilled by EMIVO Authorized Premium Reseller",
    exchangeAvailable: true,
    storySections: [
      {
        id: "sec-build",
        type: "design",
        title: "Forged in Titanium.",
        blocks: [
          {
            type: "TextBlock",
            content: "Aerospace-grade titanium design makes it our lightest and strongest Pro model ever. Beautifully brushed, delightfully contoured.",
            align: "center",
            animationType: "fade-up"
          },
          {
            type: "MediaBlock",
            media: [{ type: "image", url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=1000&auto=format&fit=crop", alt: "Titanium Frame" }],
            animationType: "titanium-glow"
          }
        ]
      },
      {
        id: "sec-camera",
        type: "camera",
        title: "A camera that captures reality.",
        blocks: [
          {
            type: "TextBlock",
            content: "Next-generation 48MP Main camera. Stunning spatial video. More detail in every shot, day or night.",
            align: "left",
            animationType: "fade-up"
          },
          {
            type: "FeatureGrid",
            media: [
              { type: "image", url: "https://images.unsplash.com/photo-1605236453806-6ff36851218e?q=80&w=1000&auto=format&fit=crop", alt: "Camera Lenses" },
              { type: "image", url: "https://images.unsplash.com/photo-1512054502232-10a0a035d672?q=80&w=1000&auto=format&fit=crop", alt: "Lifestyle Shot" }
            ],
            animationType: "lens-assemble"
          }
        ]
      },
      {
        id: "sec-perf",
        type: "performance",
        title: "Unmatched Silicon.",
        blocks: [
          {
            type: "TextBlock",
            content: "The ultimate smartphone chip delivers industry-leading performance and graphical fidelity for the most demanding tasks.",
            align: "center",
            animationType: "scale-in"
          }
        ]
      },
      {
        id: "sec-battery",
        type: "battery",
        title: "All-day power.",
        blocks: [
          {
            type: "TextBlock",
            content: "Huge leaps in battery efficiency let you do more, watch more, and play more without hunting for a charger.",
            align: "left"
          }
        ]
      }
    ],
    featuredReviews: [
      {
        id: "r1",
        rating: 5,
        title: "Incredible piece of technology.",
        content: "The build quality is exceptional. Titanium feels entirely different from stainless steel—so much lighter yet incredibly robust.",
        author: "Verified Buyer",
        date: "2 days ago",
        isVerified: true,
        helpfulCount: 142
      },
      {
        id: "r2",
        rating: 5,
        title: "Camera is unmatched.",
        content: "The new 48MP sensor captures details I've never seen before on a smartphone. Spatial video is mind-blowing on Vision Pro.",
        author: "Tech Enthusiast",
        date: "1 week ago",
        isVerified: true,
        helpfulCount: 89,
        photos: ["https://images.unsplash.com/photo-1512054502232-10a0a035d672?q=80&w=400&auto=format&fit=crop"]
      }
    ],
    reviewSummary: {
      overallRating: 4.9,
      reviewsCount: 1240,
      aiSummary: "Customers praise the titanium build, exceptional camera quality, and battery life. Some note the price is a significant investment.",
      ratingDistribution: { 5: 980, 4: 150, 3: 50, 2: 40, 1: 20 }
    },
    compareModels: [
      {
        id: "iphone-16-pro-max",
        name: "iPhone 16 Pro Max",
        image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=400&auto=format&fit=crop",
        price: 149900,
        baseEMI: 12491,
        quickSpecs: {
          camera: "48MP Main | 5x Telephoto",
          display: "6.9\" Super Retina XDR",
          battery: "Up to 33 hours video playback",
          performance: "A18 Pro chip"
        },
        fullSpecs: {
          "Display Size": "6.9 inches",
          "Resolution": "2868 x 1320 pixels",
          "Weight": "225 grams",
          "Material": "Grade 5 Titanium"
        }
      },
      {
        id: "iphone-15-pro",
        name: "iPhone 15 Pro",
        image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=400&auto=format&fit=crop",
        price: 109900,
        baseEMI: 9158,
        quickSpecs: {
          camera: "48MP Main | 3x Telephoto",
          display: "6.1\" Super Retina XDR",
          battery: "Up to 23 hours video playback",
          performance: "A17 Pro chip"
        },
        fullSpecs: {
          "Display Size": "6.1 inches",
          "Resolution": "2556 x 1179 pixels",
          "Weight": "187 grams",
          "Material": "Titanium"
        }
      }
    ],
    accessories: [
      {
        id: "apple-airpods-pro-2",
        name: "AirPods Pro (2nd generation)",
        price: 24900,
        mrp: 24900,
        image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=400&auto=format&fit=crop"
      },
      {
        id: "magsafe-charger",
        name: "MagSafe Charger",
        price: 4500,
        mrp: 4500,
        image: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=400&auto=format&fit=crop"
      }
    ],
    recommendations: [
      {
        productId: "p_002",
        reason: "Better display and included stylus"
      },
      {
        productId: "macbook-air-m3",
        reason: "Perfect companion device"
      }
    ]
  },
  {
    id: "p_002",
    brand: "Samsung",
    title: "Galaxy S25 Ultra",
    category: "Smartphone",
    tagline: "Epic, just like that.",
    basePrice: 129999,
    mrp: 139999,
    baseEMI: 10833,
    rating: 4.8,
    reviewsCount: 840,
    isNew: true,
    gallery: [
    { type: "image", url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1000&auto=format&fit=crop", alt: "Product View 1" },
    { type: "image", url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1000&auto=format&fit=crop", alt: "Product View 2" }
  ],
    colors: [
      { id: "c1", name: "Titanium Gray", value: "gray", hex: "#7a7a7a" },
    ],
    storageOptions: [
      { id: "s1", name: "512GB", value: "512gb", priceModifier: 0 },
    ],
    financeOptions: [
      { provider: "HDFC Bank", monthlyEMI: 10833, months: 12 },
    ],
    deliveryEstimate: "2-3 Business Days",
    warranty: "1 Year Manufacturer Warranty",
    retailerInfo: "Fulfilled by EMIVO Authorized",
    exchangeAvailable: true,
    storySections: [
      {
        id: "sec-ai",
        type: "performance",
        title: "Galaxy AI is here.",
        blocks: [
          {
            type: "TextBlock",
            content: "Circle to Search, Live Translate, and Note Assist. The most intelligent smartphone ever built, right in your pocket.",
            align: "center"
          },
          {
            type: "MediaBlock",
            media: [{ type: "image", url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1000&auto=format&fit=crop", alt: "Galaxy AI" }],
            animationType: "scale-in"
          }
        ]
      },
      {
        id: "sec-camera-s",
        type: "camera",
        title: "200MP. Details that rival reality.",
        blocks: [
          {
            type: "TextBlock",
            content: "Capture staggering detail with the highest resolution camera on a smartphone. ProVisual engine recognizes objects and enhances color tone.",
            align: "left"
          },
          {
            type: "FeatureGrid",
            media: [
              { type: "image", url: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?q=80&w=1000&auto=format&fit=crop", alt: "Camera setup" },
              { type: "image", url: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=1000&auto=format&fit=crop", alt: "Zoom shot" }
            ],
            animationType: "lens-assemble"
          }
        ]
      }
    ],
    featuredReviews: [
      {
        id: "rs1",
        rating: 5,
        title: "The ultimate Android experience.",
        content: "The S-Pen remains undefeated. The new flat display makes writing so much easier, and the anti-reflective coating is genuinely revolutionary.",
        author: "Power User",
        date: "3 days ago",
        isVerified: true,
        helpfulCount: 205
      },
      {
        id: "rs2",
        rating: 4,
        title: "Galaxy AI is surprisingly useful.",
        content: "Circle to Search and the live translation features have actually changed how I use my phone daily. Great upgrade from the S23 Ultra.",
        author: "Verified Buyer",
        date: "2 weeks ago",
        isVerified: true,
        helpfulCount: 56
      }
    ],
    reviewSummary: {
      overallRating: 4.8,
      reviewsCount: 840,
      aiSummary: "Customers love the integrated S-Pen and the new flat display. Galaxy AI features are highly praised for daily usefulness.",
      ratingDistribution: { 5: 600, 4: 180, 3: 40, 2: 15, 1: 5 }
    },
    accessories: [
      {
        id: "galaxy-buds-2-pro",
        name: "Galaxy Buds2 Pro",
        price: 15999,
        mrp: 17999,
        image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=400&auto=format&fit=crop"
      }
    ],
    recommendations: [
      {
        productId: "p_001",
        reason: "Better ecosystem integration"
      },
      {
        productId: "oneplus-12",
        reason: "Better value under ₹80,000"
      }
    ]
  }
,
{
  "id": "oneplus-12",
  "brand": "OnePlus",
  "title": "OnePlus 12",
  "category": "Smartphone",
  "tagline": "Experience the next generation.",
  "basePrice": 69999,
  "mrp": 76999,
  "baseEMI": 7777,
  "rating": 4.7,
  "reviewsCount": 850,
  "isNew": true,
  "gallery": [
    { "type": "image", "url": "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=800", "alt": "OnePlus 12" },
    { "type": "image", "url": "https://images.unsplash.com/photo-1610945415303-34e40280f124?auto=format&fit=crop&q=80&w=800", "alt": "OnePlus 12" },
    { "type": "image", "url": "https://images.unsplash.com/photo-1610945415306-6962f3a61d76?auto=format&fit=crop&q=80&w=800", "alt": "OnePlus 12" }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "Bajaj Finserv",
      "monthlyEMI": 7777,
      "months": 9
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 6.82-inch ProXDR Display | Processor: Snapdragon 8 Gen 3 | Camera: 50MP Main | 64MP Periscope | Battery: 5400 mAh",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "realme-gt-6",
  "brand": "Realme",
  "title": "Realme GT 6",
  "category": "Smartphone",
  "tagline": "Experience the next generation.",
  "basePrice": 40999,
  "mrp": 45099,
  "baseEMI": 6833,
  "rating": 4.5,
  "reviewsCount": 420,
  "isNew": true,
  "gallery": [
    { "type": "image", "url": "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&q=80&w=800", "alt": "Realme GT 6" },
    { "type": "image", "url": "https://images.unsplash.com/photo-1610945415303-34e40280f124?auto=format&fit=crop&q=80&w=800", "alt": "Realme GT 6" },
    { "type": "image", "url": "https://images.unsplash.com/photo-1610945415306-6962f3a61d76?auto=format&fit=crop&q=80&w=800", "alt": "Realme GT 6" }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "ZestMoney",
      "monthlyEMI": 6833,
      "months": 6
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 6.78-inch 8T LTPO | Processor: Snapdragon 8s Gen 3 | Camera: 50MP Main | 50MP Telephoto | Battery: 5500 mAh",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "macbook-air-m3",
  "brand": "Apple",
  "title": "Apple MacBook Air 13-inch (M3)",
  "category": "Laptop",
  "tagline": "Experience the next generation.",
  "basePrice": 114900,
  "mrp": 126390,
  "baseEMI": 6383,
  "rating": 4.9,
  "reviewsCount": 512,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800",
      "alt": "Apple MacBook Air 13-inch (M3)"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800",
      "alt": "Apple MacBook Air 13-inch (M3)"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&q=80&w=800",
      "alt": "Apple MacBook Air 13-inch (M3)"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "HDFC Bank",
      "monthlyEMI": 9575,
      "months": 12
    },
    {
      "provider": "ICICI Bank",
      "monthlyEMI": 6383,
      "months": 18
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 13.6-inch Liquid Retina | Processor: Apple M3 (8-core CPU) | RAM: 8GB Unified Memory | Storage: 256GB SSD",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "dell-xps-15",
  "brand": "Dell",
  "title": "Dell XPS 15",
  "category": "Laptop",
  "tagline": "Experience the next generation.",
  "basePrice": 185000,
  "mrp": 203500,
  "baseEMI": 20555,
  "rating": 4.6,
  "reviewsCount": 310,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=800",
      "alt": "Dell XPS 15"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=800",
      "alt": "Dell XPS 15"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=800",
      "alt": "Dell XPS 15"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "Bajaj Finserv",
      "monthlyEMI": 20555,
      "months": 9
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 15.6-inch 3.5K OLED Touch | Processor: Intel Core i7-13700H | RAM: 16GB DDR5 | Storage: 1TB SSD",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "hp-spectre-x360",
  "brand": "HP",
  "title": "HP Spectre x360",
  "category": "Laptop",
  "tagline": "Experience the next generation.",
  "basePrice": 154999,
  "mrp": 170499,
  "baseEMI": 12916,
  "rating": 4.7,
  "reviewsCount": 220,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800",
      "alt": "HP Spectre x360"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800",
      "alt": "HP Spectre x360"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&q=80&w=800",
      "alt": "HP Spectre x360"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "HDFC Bank",
      "monthlyEMI": 12916,
      "months": 12
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 14-inch WUXGA Touch | Processor: Intel Core Ultra 7 | RAM: 16GB LPDDR5x | Storage: 1TB SSD",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "sony-bravia-65",
  "brand": "Sony",
  "title": "Sony Bravia 65\" 4K HDR TV",
  "category": "TV",
  "tagline": "Experience the next generation.",
  "basePrice": 139900,
  "mrp": 153890,
  "baseEMI": 5829,
  "rating": 4.8,
  "reviewsCount": 670,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800",
      "alt": "Sony Bravia 65\" 4K HDR TV"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800",
      "alt": "Sony Bravia 65\" 4K HDR TV"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=800",
      "alt": "Sony Bravia 65\" 4K HDR TV"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "Bajaj Finserv",
      "monthlyEMI": 11658,
      "months": 12
    },
    {
      "provider": "ICICI Bank",
      "monthlyEMI": 5829,
      "months": 24
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 65-inch 4K Ultra HD | RefreshRate: 120Hz | Smart: Google TV | Sound: Dolby Atmos, 30W",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "lg-oled-55",
  "brand": "LG",
  "title": "LG OLED 55\" C3 Series",
  "category": "TV",
  "tagline": "Experience the next generation.",
  "basePrice": 124990,
  "mrp": 137489,
  "baseEMI": 10415,
  "rating": 4.9,
  "reviewsCount": 890,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&q=80&w=800",
      "alt": "LG OLED 55\" C3 Series"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&q=80&w=800",
      "alt": "LG OLED 55\" C3 Series"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&q=80&w=800",
      "alt": "LG OLED 55\" C3 Series"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "HDFC Bank",
      "monthlyEMI": 10415,
      "months": 12
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Display: 55-inch 4K OLED | RefreshRate: 120Hz | Smart: webOS 23 | Processor: a9 AI Processor Gen6",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "sony-wh-1000xm5",
  "brand": "Sony",
  "title": "Sony WH-1000XM5 Headphones",
  "category": "Audio",
  "tagline": "Experience the next generation.",
  "basePrice": 29990,
  "mrp": 32989,
  "baseEMI": 4998,
  "rating": 4.7,
  "reviewsCount": 1450,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800",
      "alt": "Sony WH-1000XM5 Headphones"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800",
      "alt": "Sony WH-1000XM5 Headphones"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=800",
      "alt": "Sony WH-1000XM5 Headphones"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "ZestMoney",
      "monthlyEMI": 4998,
      "months": 6
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Type: Over-Ear | NoiseCancellation: Industry Leading ANC | BatteryLife: Up to 30 hours | Weight: 250g",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "apple-airpods-pro-2",
  "brand": "Apple",
  "title": "Apple AirPods Pro (2nd Gen)",
  "category": "Audio",
  "tagline": "Experience the next generation.",
  "basePrice": 24900,
  "mrp": 27390,
  "baseEMI": 4150,
  "rating": 4.8,
  "reviewsCount": 2100,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=800",
      "alt": "Apple AirPods Pro (2nd Gen)"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=800",
      "alt": "Apple AirPods Pro (2nd Gen)"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&q=80&w=800",
      "alt": "Apple AirPods Pro (2nd Gen)"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "HDFC Bank",
      "monthlyEMI": 4150,
      "months": 6
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Type: In-Ear | NoiseCancellation: Active Noise Cancellation | BatteryLife: Up to 6 hours (30h with case) | Chip: H2 headphone chip",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
},
{
  "id": "samsung-8kg-washing-machine",
  "brand": "Samsung",
  "title": "Samsung 8kg Fully Automatic Front Load",
  "category": "Appliance",
  "tagline": "Experience the next generation.",
  "basePrice": 36990,
  "mrp": 40689,
  "baseEMI": 6165,
  "rating": 4.5,
  "reviewsCount": 890,
  "isNew": true,
  "gallery": [
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&q=80&w=800",
      "alt": "Samsung 8kg Fully Automatic Front Load"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&q=80&w=800",
      "alt": "Samsung 8kg Fully Automatic Front Load"
    },
    {
      "type": "image",
      "url": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&q=80&w=800",
      "alt": "Samsung 8kg Fully Automatic Front Load"
    }
  ],
  "colors": [
    {
      "id": "c1",
      "name": "Default Color",
      "value": "default",
      "hex": "#cccccc"
    }
  ],
  "storageOptions": [
    {
      "id": "s1",
      "name": "Base Model",
      "value": "base",
      "priceModifier": 0
    }
  ],
  "financeOptions": [
    {
      "provider": "Bajaj Finserv",
      "monthlyEMI": 6165,
      "months": 6
    }
  ],
  "deliveryEstimate": "2-3 Business Days",
  "warranty": "1 Year Manufacturer Warranty",
  "retailerInfo": "Fulfilled by EMIVO Authorized",
  "exchangeAvailable": true,
  "storySections": [
    {
      "id": "sec-specs",
      "type": "specs",
      "title": "Specifications",
      "blocks": [
        {
          "type": "TextBlock",
          "content": "Capacity: 8 kg | Type: Front Load | EnergyRating: 5 Star | Features: Eco Bubble, Hygiene Steam",
          "align": "center",
          "animationType": "fade-up"
        }
      ]
    }
  ],
  "featuredReviews": []
}
];

export const MOCK_CATEGORIES = [
  "Smartphones",
  "Laptops",
  "Audio",
  "Wearables",
  "Appliances",
];

export const MOCK_BRANDS = [
  "Apple", "Samsung", "Sony", "LG", "HP", "Dell", "Nothing", "OnePlus", "ASUS", "Lenovo"
];
