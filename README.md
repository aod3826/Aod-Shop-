#mini-shop/
├── 📁 public/                    # Static assets
├── 📁 supabase/                  # Database migrations
│   ├── 📄 001_initial_schema.sql  # ตารางฐานข้อมูลทั้งหมด
│   └── 📄 002_rpc_functions.sql    # Stored Procedures สำหรับธุรกรรม
├── 📄 .env.example               # ตัวแปรสภาพแวดล้อมตัวอย่าง
├── 📄 .gitignore                 # ไฟล์ที่ต้อง ignore
├── 📄 package.json               # Dependencies และ scripts
├── 📄 tsconfig.json              # TypeScript configuration
├── 📄 vite.config.ts             # Vite configuration
├── 📄 index.html                 # Entry HTML file
└── 📁 src/                       # Source code
    ├── 📄 main.tsx               # React entry point
    ├── 📄 App.tsx                # Main App component
    ├── 📄 index.css              # Global styles (Tailwind)
    ├── 📄 vite-env.d.ts          # Vite type definitions
    ├── 📁 api/                   # API integration
    │   ├── 📄 index.ts
    │   ├── 📄 supabase.ts
    │   ├── 📄 thunderApi.ts
    │   ├── 📄 lineApi.ts
    │   └── 📄 mapsApi.ts
    ├── 📁 components/            # Reusable components
    │   ├── 📁 common/            # Common UI components
    │   │   ├── 📄 LoadingSpinner.tsx
    │   │   ├── 📄 ErrorBoundary.tsx
    │   │   ├── 📄 Button.tsx
    │   │   ├── 📄 Input.tsx
    │   │   └── 📄 Modal.tsx
    │   ├── 📁 layout/            # Layout components
    │   │   ├── 📄 Header.tsx
    │   │   ├── 📄 Footer.tsx
    │   │   ├── 📄 Sidebar.tsx
    │   │   └── 📄 Layout.tsx
    │   ├── 📁 customer/          # Customer-facing components
    │   │   ├── 📄 ProductCard.tsx
    │   │   ├── 📄 CartItem.tsx
    │   │   ├── 📄 AddressPicker.tsx
    │   │   └── 📄 PaymentSlipUploader.tsx
    │   └── 📁 admin/             # Admin components
    │       ├── 📄 OrderTable.tsx
    │       ├── 📄 ProductForm.tsx
    │       ├── 📄 ActivityLog.tsx
    │       └── 📄 StoreSettingsForm.tsx
    ├── 📁 features/              # Feature-based modules
    │   ├── 📁 auth/
    │   │   ├── 📄 Login.tsx
    │   │   └── 📄 Profile.tsx
    │   ├── 📁 products/
    │   │   ├── 📄 ProductList.tsx
    │   │   └── 📄 ProductDetail.tsx
    │   ├── 📁 cart/
    │   │   └── 📄 CartPage.tsx
    │   ├── 📁 checkout/
    │   │   ├── 📄 CheckoutPage.tsx
    │   │   └── 📄 OrderConfirmation.tsx
    │   └── 📁 admin/
    │       ├── 📄 Dashboard.tsx
    │       ├── 📄 OrderManagement.tsx
    │       └── 📄 ProductManagement.tsx
    ├── 📁 hooks/                 # Custom React hooks
    │   ├── 📄 useDebounce.ts
    │   ├── 📄 useGeolocation.ts
    │   ├── 📄 useCart.ts
    │   └── 📄 useSupabase.ts
    ├── 📁 lib/                   # External library clients
    │   ├── 📄 supabaseClient.ts
    │   ├── 📄 lineClient.ts
    │   ├── 📄 mapsClient.ts
    │   └── 📄 thunderClient.ts
    ├── 📁 store/                 # Zustand state management
    │   ├── 📄 index.ts
    │   ├── 📄 cartStore.ts
    │   ├── 📄 userStore.ts
    │   └── 📄 orderStore.ts
    ├── 📁 pages/                 # Page components
    │   ├── 📄 HomePage.tsx
    │   ├── 📄 ShopPage.tsx
    │   ├── 📄 CartPage.tsx
    │   ├── 📄 CheckoutPage.tsx
    │   ├── 📄 OrderHistoryPage.tsx
    │   ├── 📄 AdminPage.tsx
    │   └── 📄 NotFoundPage.tsx
    └── 📁 utils/                 # Utility functions
        ├── 📄 constants.ts
        ├── 📄 helpers.ts
        ├── 📄 validation.ts
        └── 📄 distanceCalculator.ts
