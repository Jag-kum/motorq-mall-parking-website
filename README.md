Below is concise README content focused first on “how to run” and followed by essential project details.

---

# 🅿️ Parking-App

Full-stack Next.js 14 application that manages parking slots, vehicle sessions, and billing.

---

## 🚀 Quick Start

```bash
# 1 ‒ Clone and install
git clone https://github.com/<you>/parking-app.git
cd parking-app
npm install            # installs Next.js + Tailwind + Chart.js etc.

# 2 ‒ Configure MongoDB
# Create .env.local in the project root:
echo "MONGODB_URI=mongodb://localhost:27017/parking" > .env.local

# 3 ‒ (OPTIONAL) Seed demo slots
npm run seed           # seeds ~100 slots (script not shown here)

# 4 ‒ Run development server
npm run dev            # http://localhost:3000

# 5 ‒ Build for production
npm run build
npm start
```

That’s it—open the browser on `localhost:3000` and start parking vehicles.

---

## 🗺️ Project Structure
```
app/                 Next-app router pages & API routes
  ├─ page.tsx        Live dashboard (client component)
  ├─ revenue/        Revenue graphs & tables
  └─ api/            REST endpoints (entry, exit, slots, revenue, locate)
lib/
  ├─ billing.ts      Central pricing rules
  ├─ db.ts           Mongo connection helper
  └─ models.ts       Mongoose schemas (Vehicle, Slot, Session)
```

---

## 🔑 Main Features
1. **Real-time Dashboard**  
   • Donut chart occupancy • Live slot grid • Colour legend  
2. **Vehicle Entry / Exit**  
   • Auto slot allocation & manual override • Hourly vs Day-Pass billing  
3. **Billing & Revenue**  
   • Configurable hourly slabs (`lib/billing.ts`)  
   • `/revenue` page – total ₹, daily bar chart, Hourly vs Day-Pass pie  
4. **REST API** (all JSON)  
   | POST `/api/entry` | POST `/api/exit` | GETͰPATCH `/api/slots` | POST `/api/locate` | GET `/api/revenue` |

---

## ⚙️ Configuration Notes
| Setting          | Location              | Default |
|------------------|-----------------------|---------|
| Mongo connection | `.env.local`          | —       |
| Hourly slabs     | `lib/billing.ts`      | 50 / 100 / 150 / cap 200 |
| Day-Pass fee     | `lib/billing.ts`      | ₹150    |

---

## 💡 Demo Flow (optional)
1. Enter plate `TN07CV7077` → auto-assigned slot, toast receipt.  
2. Exit same plate → fee calculated, slot frees.  
3. Switch to `/revenue` → graphs update.
