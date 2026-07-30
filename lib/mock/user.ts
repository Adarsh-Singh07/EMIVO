export const mockOrders = [
  { id: "ORD-9823", product: "Apple iPhone 16 Pro", date: "2024-03-12", amount_paisa: 12990000, status: "Delivered", emi_provider: "HDFC Bank" },
  { id: "ORD-8712", product: "Sony WH-1000XM5", date: "2024-03-05", amount_paisa: 2999000, status: "Processing", emi_provider: "ZestMoney" },
  { id: "ORD-7621", product: "LG OLED 55\" C3", date: "2024-02-28", amount_paisa: 12499000, status: "Shipped", emi_provider: "Bajaj Finserv" },
  { id: "ORD-6534", product: "MacBook Air M3", date: "2024-02-15", amount_paisa: 11490000, status: "Delivered", emi_provider: "ICICI Bank" }
];

export const mockUser = {
  name: "Rahul Verma",
  totalOrders: 4,
  wishlistItems: 6,
  referralCreditsPaisa: 125000, // ₹1,250
  activeEMIs: 2,
  referralCode: "RAHUL2024"
};
