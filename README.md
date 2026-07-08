# 🏦 Dexto - Crypto Mining Investment Platform 2026

منصة SaaS احترافية متكاملة لتعدين واستثمار العملات الرقمية بمستوى عالمي، جاهزة للإنتاج، تدعم العربية والإنجليزية بالكامل.

A premium, production-ready crypto mining & investment SaaS platform with full Arabic/English bilingual support.

---

## ✨ الميزات الرئيسية | Key Features

### 🔐 المصادقة والأمان | Authentication & Security
- JWT Authentication + bcrypt password hashing (12 rounds)
- HTTP-only cookies + SameSite protection
- Role-based access control (User / Admin)
- Activity logs & Security logs
- Account suspension & activation

### 🌐 التدويل | Internationalization
- ✅ دعم كامل للعربية (RTL)
- ✅ Full English support (LTR)
- زر تبديل اللغة الفوري
- حفظ تفضيل اللغة لكل مستخدم
- خط Cairo للعربية + Geist للإنجليزية

### ⛏️ نظام التعدين | Mining System
- 4 خطط تعدين (أساسي/فضي/ذهبي/ماسي)
- نسب أرباح يومية: 2% - 5%
- مدة 24 ساعة بتوقيت مكة (Asia/Riyadh)
- عداد تنازلي مباشر HH:MM:SS
- شريط تقدم متحرك
- **قفل رأس المال أثناء التعدين**
- إرجاع رأس المال + الأرباح تلقائياً عند الاكتمال
- منع تكرار التعدين لنفس الخطة

### 💰 الإيداع والسحب | Deposit & Withdrawal
- 8 شبكات USDT مدعومة:
  - TRC20, ERC20, BEP20, Polygon, Solana, Arbitrum, Optimism, TON
- QR Code لكل شبكة
- نسخ العنوان بنقرة واحدة
- تتبع حالة المعاملات (pending/completed/rejected)
- موافقة الإدارة على الإيداعات والسحوبات

### 👥 نظام الإحالات | Referral System
- 3 مستويات: L1 (10%), L2 (5%), L3 (2%)
- رابط إحالة فريد + QR Code
- إحصائيات مفصلة لكل مستوى
- عمولات تلقائية عند انتهاء التعدين

### ✅ المهام اليومية | Daily Tasks
- تسجيل الدخول اليومي (مكافأة تلقائية)
- مشاركة رابط الإحالة
- دعوة مستخدمين
- مكافآت USDT + نقاط

### 🔔 الإشعارات | Notifications
- إشعارات لحظية لكل الأحداث
- إشعارات الإيداع/السحب/التعدين/الإحالات
- عداد غير المقروء

### 🎫 الدعم | Support
- نظام تذاكر دعم
- أولويات (منخفضة/عادية/عالية)
- ردود الإدارة

### 🛡️ لوحة الإدارة الكاملة | Full Admin Panel
- **لوحة تحكم**: إحصائيات شاملة + رسوم بيانية
- **إدارة المستخدمين**: بحث، تعديل رصيد، إيقاف/حذف
- **إدارة التعدين**: إنشاء/تعديل/حذف الخطط
- **إدارة المدفوعات**: مراجعة الإيداعات والسحوبات
- **إدارة الشبكات**: إضافة/تعديل شبكات USDT
- **تذاكر الدعم**: الرد على التذاكر
- **إعدادات المنصة**: تخصيص كامل (الاسم، الألوان، اللغة، الرسوم، إلخ)
- **تغيير بيانات الإدارة**: بريد وكلمة مرور الإدارة
- **سجلات الأمان**: تتبع كل الأنشطة

---

## 🛠️ التقنيات المستخدمة | Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui**
- **Framer Motion** (animations)
- **Zustand** (state management)
- **TanStack Query** (server state)
- **Recharts** (charts)
- **Lucide React** (icons)

### Backend
- **Next.js API Routes**
- **Prisma ORM** + **SQLite** (production-ready, swappable with PostgreSQL/MySQL)
- **JWT** + **bcryptjs**
- **Socket.io** (real-time updates)

### Realtime
- **Socket.io** mini-service (port 3003)
- Live mining countdown
- Real-time notifications

---

## 📦 التثبيت | Installation

### المتطلبات | Prerequisites
- Node.js 18+ أو Bun
- npm/bun package manager

### الخطوات | Steps

```bash
# 1. استنساخ المستودع | Clone the repository
git clone https://github.com/ForexYemeni/Dexto.git
cd Dexto

# 2. تثبيت الاعتمادات | Install dependencies
bun install
# أو | or
npm install

# 3. تثبيت اعتمادات Socket.io | Install socket service deps
cd mini-services/mining-socket && bun install && cd ../..

# 4. إعداد متغيرات البيئة | Setup environment
cp .env.example .env
# قم بتحرير ملف .env وأضف | Edit .env and add:
# DATABASE_URL="file:./dev.db"
# JWT_SECRET="your-super-secret-key-here"

# 5. تهيئة قاعدة البيانات | Initialize database
bun run db:push

# 6. تشغيل البذور الأولية | Run seed (creates admin + plans + wallets)
bun run src/lib/seed.ts

# 7. تشغيل المنصة | Start the platform
bun run dev
```

### تشغيل خدمة Socket.io | Start Socket.io service

```bash
# في نافذة منفصلة | In a separate terminal
cd mini-services/mining-socket
bun run dev
```

---

## 🔑 بيانات الدخول الافتراضية | Default Login

```
البريد | Email: admin@cryptomining.io
كلمة المرور | Password: Admin@2026
```

⚠️ **مهم**: قم بتغيير بيانات الإدارة فوراً بعد التثبيت من: `الإعدادات → حساب الإدارة`

---

## 🚀 النشر | Deployment

### النشر على Vercel | Deploy to Vercel

1. ارفع الكود إلى GitHub
2. اذهب إلى [vercel.com](https://vercel.com)
3. استورد المستودع
4. أضف متغيرات البيئة:
   - `DATABASE_URL` - رابط قاعدة البيانات (PostgreSQL موصى به للإنتاج)
   - `JWT_SECRET` - مفتاح JWT قوي
5. انشر

### قاعدة البيانات للإنتاج | Production Database

للإنتاج، يُوصى باستخدام PostgreSQL أو MySQL بدلاً من SQLite:

1. حدّث `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"  // أو "mysql"
     url      = env("DATABASE_URL")
   }
   ```
2. حدّث `DATABASE_URL` في `.env`
3. شغّل `bun run db:push`

---

## 📁 هيكل المشروع | Project Structure

```
Dexto/
├── src/
│   ├── app/
│   │   ├── api/              # API Routes
│   │   │   ├── auth/         # المصادقة
│   │   │   ├── admin/        # APIs الإدارة
│   │   │   ├── dashboard/    # لوحة المستخدم
│   │   │   ├── mining/       # التعدين
│   │   │   ├── deposit/      # الإيداع
│   │   │   ├── withdrawal/   # السحب
│   │   │   ├── wallet/       # المحفظة
│   │   │   ├── referrals/    # الإحالات
│   │   │   ├── tasks/        # المهام
│   │   │   ├── notifications/ # الإشعارات
│   │   │   ├── support/      # الدعم
│   │   │   └── settings/     # الإعدادات العامة
│   │   ├── layout.tsx
│   │   ├── page.tsx          # الصفحة الرئيسية (SPA router)
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/             # صفحات المصادقة
│   │   ├── layout/           # Sidebar + TopBar
│   │   ├── dashboard/        # لوحة المستخدم
│   │   ├── mining/           # التعدين
│   │   ├── deposit/          # الإيداع
│   │   ├── withdrawal/       # السحب
│   │   ├── wallet/           # المحفظة
│   │   ├── referrals/        # الإحالات
│   │   ├── tasks/            # المهام
│   │   ├── notifications/    # الإشعارات
│   │   ├── support/          # الدعم
│   │   ├── legal/            # الأسئلة الشائعة + الشروط + الخصوصية
│   │   ├── admin/            # لوحة الإدارة
│   │   └── shared/           # مكونات مشتركة
│   ├── lib/
│   │   ├── auth.ts           # JWT + bcrypt
│   │   ├── db.ts             # Prisma client
│   │   ├── i18n.ts           # الترجمات (عربي/إنجليزي)
│   │   ├── store.ts          # Zustand stores
│   │   ├── seed.ts           # البيانات الأولية
│   │   ├── socket-client.ts  # Socket.io client
│   │   └── time-utils.ts     # أدوات الوقت (توقيت مكة)
│   └── hooks/
│       └── use-i18n.ts
├── prisma/
│   └── schema.prisma         # مخطط قاعدة البيانات
├── mini-services/
│   └── mining-socket/        # خدمة Socket.io
├── public/
├── package.json
└── README.md
```

---

## 🗄️ قاعدة البيانات | Database

### المخططات | Models

تم إنشاء 17 نموذج قاعدة بيانات:

| Model | الوصف |
|-------|-------|
| User | المستخدمون (مع دور: user/admin) |
| MiningPlan | خطط التعدين |
| UserMiningSession | جلسات التعدين النشطة |
| MiningHistory | سجل التعدين المكتمل |
| Wallet | محافظ الإيداع (8 شبكات) |
| Deposit | الإيداعات |
| Withdrawal | السحوبات |
| Transaction | السجل العام للمعاملات |
| ReferralCommission | عمولات الإحالات |
| Task | المهام اليومية |
| UserTask | مهام المستخدمين |
| Notification | الإشعارات |
| SupportTicket | تذاكر الدعم |
| ActivityLog | سجل النشاط |
| SecurityLog | سجل الأمان |
| PlatformSetting | إعدادات إضافية |
| SystemSetting | إعدادات النظام الرئيسية |

---

## 🎨 التصميم | Design

- **Dark Mode** افتراضي + **Light Mode**
- ألوان فاخرة: أسود + أزرق كهربائي + بنفسجي + ذهبي
- **Glassmorphism** + Premium Cards
- خلفية mesh متدرجة متحركة
- حركات Framer Motion سلسة
- متجاوب 100% (mobile-first)
- RTL/LTR تلقائي حسب اللغة

---

## 🔒 الأمان | Security

- ✅ JWT مع انتهاء صلاحية (7 أيام)
- ✅ bcrypt (12 rounds)
- ✅ HTTP-only cookies
- ✅ Role-based access control
- ✅ Input validation
- ✅ CSRF protection (SameSite cookies)
- ✅ Security logs
- ✅ Account suspension

---

## 📜 الترخيص | License

هذا المشروع ملكية خاصة. جميع الحقوق محفوظة © 2026.

This project is proprietary. All rights reserved © 2026.

---

## 📞 التواصل | Contact

للاستفسارات والدعم: استخدم نظام التذاكر داخل المنصة

For inquiries and support: Use the in-platform ticket system
