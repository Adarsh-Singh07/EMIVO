export const mockRetailerDashboard = {
  name: "Sharma Electronics",
  ordersThisMonth: 142,
  gmvPaisa: 568000000, // ₹56.8L
  commissionEarnedPaisa: 28400000, // ₹2.84L
  pendingCommissionPaisa: 4200000, // ₹42K
  recentSales: [
    { id: "SAL-101", customer: "Amit Kumar", product: "iPhone 16 Pro", date: "Today", amount_paisa: 12990000 },
    { id: "SAL-102", customer: "Priya Singh", product: "Samsung Galaxy S24", date: "Today", amount_paisa: 12999900 },
    { id: "SAL-103", customer: "Raj Patel", product: "MacBook Air M3", date: "Yesterday", amount_paisa: 11490000 },
    { id: "SAL-104", customer: "Neha Gupta", product: "Sony Bravia 65\"", date: "Yesterday", amount_paisa: 13990000 },
    { id: "SAL-105", customer: "Vikram R", product: "OnePlus 12", date: "2 Days Ago", amount_paisa: 6999900 },
  ],
  commissionLedger: [
    { id: "LED-001", description: "Commission - iPhone 16 Pro", date: "Today", amount_paisa: 649500 },
    { id: "LED-002", description: "Commission - Samsung S24", date: "Today", amount_paisa: 650000 },
    { id: "LED-003", description: "Commission - MacBook Air", date: "Yesterday", amount_paisa: 574500 },
  ]
};

export const mockAdminDashboard = {
  totalGmvPaisa: 12450000000, // ₹12.45Cr
  ordersToday: 845,
  activeRetailers: 124,
  activeCustomers: 45200,
  retailerPerformance: [
    { name: "Sharma Electronics", location: "Delhi", orders: 142, gmv_paisa: 568000000, status: "Active" },
    { name: "Gupta Gadgets", location: "Mumbai", orders: 110, gmv_paisa: 485000000, status: "Active" },
    { name: "Tech World", location: "Bangalore", orders: 95, gmv_paisa: 390000000, status: "Active" },
    { name: "Reddy Mobiles", location: "Hyderabad", orders: 88, gmv_paisa: 310000000, status: "Active" },
    { name: "Kolkata Digital", location: "Kolkata", orders: 75, gmv_paisa: 280000000, status: "Warning" },
  ]
};
