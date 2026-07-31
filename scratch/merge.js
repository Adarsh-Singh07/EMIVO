const fs = require('fs');
const path = require('path');

const mockProductsStr = fs.readFileSync(path.join(__dirname, '../lib/mock/products.ts'), 'utf-8');
const dataTsStr = fs.readFileSync(path.join(__dirname, '../lib/data.ts'), 'utf-8');

// A quick and dirty way to parse the export const mockProducts = [...] without full TS parser
let mockProductsEvalStr = mockProductsStr.replace('export const mockProducts = ', 'module.exports = ');
fs.writeFileSync(path.join(__dirname, 'temp.js'), mockProductsEvalStr);
const oldProducts = require('./temp.js');

const newProducts = oldProducts.map(p => {
  // Map old product to new Product schema
  return {
    id: p.id,
    brand: p.brand,
    title: p.name,
    category: p.category,
    tagline: "Experience the next generation.",
    basePrice: p.price_paisa / 100,
    mrp: Math.round((p.price_paisa / 100) * 1.1),
    baseEMI: Math.min(...p.emi_providers.map(e => e.monthly_amount)),
    rating: p.rating,
    reviewsCount: p.review_count,
    isNew: true,
    gallery: p.images.map(img => ({ type: "image", url: img, alt: p.name })),
    colors: [
      { id: "c1", name: "Default Color", value: "default", hex: "#cccccc" }
    ],
    storageOptions: [
      { id: "s1", name: "Base Model", value: "base", priceModifier: 0 }
    ],
    financeOptions: p.emi_providers.map(e => ({
      provider: e.name,
      monthlyEMI: e.monthly_amount,
      months: e.tenure
    })),
    deliveryEstimate: "2-3 Business Days",
    warranty: "1 Year Manufacturer Warranty",
    retailerInfo: "Fulfilled by EMIVO Authorized",
    exchangeAvailable: true,
    storySections: [
      {
        id: "sec-specs",
        type: "specs",
        title: "Specifications",
        blocks: [
          {
            type: "TextBlock",
            content: Object.entries(p.specs).map(([k, v]) => `${k}: ${v}`).join(' | '),
            align: "center",
            animationType: "fade-up"
          }
        ]
      }
    ],
    featuredReviews: []
  };
});

// Now, we inject these into data.ts.
// But wait, data.ts already has p_001 and p_002 (iPhone and Samsung).
// Let's filter out iPhone 16 Pro and Samsung Galaxy S24 from oldProducts since they are already in data.ts.
const filteredNewProducts = newProducts.filter(p => p.id !== "iphone-16-pro" && p.id !== "samsung-galaxy-s24");

// Convert to string
const newProductsString = filteredNewProducts.map(p => JSON.stringify(p, null, 2)).join(',\n');

// Find where MOCK_PRODUCTS array ends in data.ts
// It ends at line 212: ];
const insertIndex = dataTsStr.lastIndexOf('];\n\nexport const MOCK_CATEGORIES');
const finalDataTs = dataTsStr.slice(0, insertIndex) + ',\n' + newProductsString + '\n' + dataTsStr.slice(insertIndex);

fs.writeFileSync(path.join(__dirname, '../lib/data_new.ts'), finalDataTs);
console.log("Successfully generated data_new.ts");
