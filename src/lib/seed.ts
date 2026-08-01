import { db } from './db'
import { hashPassword, generateReferralCode } from './auth'

const MECCA_TZ = 'Asia/Riyadh'

// Network definitions
const NETWORKS = [
  { network: 'TRC20', networkAr: 'تي آر سي 20', address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE' },
  { network: 'ERC20', networkAr: 'إي آر سي 20', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { network: 'BEP20', networkAr: 'بي إي بي 20', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { network: 'Polygon', networkAr: 'بوليغون', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { network: 'Solana', networkAr: 'سولانا', address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
  { network: 'Arbitrum', networkAr: 'أربيترم', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { network: 'Optimism', networkAr: 'أوبتيمزم', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' },
  { network: 'TON', networkAr: 'تون', address: 'EQAS_o7wQ2xQ3T5xLb6kM5xKQ6t7yZ8vN9wQ4r5s6t7u8v9' },
]

// Mining plans - FIXED amounts + minWithdrawal per plan (10 plans)
const PLANS = [
  {
    name: 'Starter Plan',
    nameAr: 'خطة المبتدئ',
    description: 'Fixed 25 USDT, 1.5% daily, 5 days',
    descriptionAr: 'استثمار ثابت 25 USDT، 1.5% يومياً، 5 أيام',
    fixedAmount: 25, dailyProfitRate: 0.015, durationHours: 24, totalDays: 5, minWithdrawal: 5,
    color: '#06B6D4', icon: 'pickaxe', sortOrder: 0,
  },
  {
    name: 'Basic Plan',
    nameAr: 'الخطة الأساسية',
    description: 'Fixed 50 USDT investment, 2% daily, 7 days',
    descriptionAr: 'استثمار ثابت 50 USDT، 2% يومياً، 7 أيام',
    fixedAmount: 50,
    dailyProfitRate: 0.02,
    durationHours: 24,
    totalDays: 7,
    minWithdrawal: 10,
    color: '#10B981',
    icon: 'pickaxe',
    sortOrder: 1,
  },
  {
    name: 'Silver Plan',
    nameAr: 'الخطة الفضية',
    description: 'Fixed 200 USDT investment, 3% daily, 14 days',
    descriptionAr: 'استثمار ثابت 200 USDT، 3% يومياً، 14 يوم',
    fixedAmount: 200,
    dailyProfitRate: 0.03,
    durationHours: 24,
    totalDays: 14,
    minWithdrawal: 20,
    color: '#9CA3AF',
    icon: 'silver',
    sortOrder: 2,
  },
  {
    name: 'Gold Plan',
    nameAr: 'الخطة الذهبية',
    description: 'Fixed 500 USDT investment, 4% daily, 21 days',
    descriptionAr: 'استثمار ثابت 500 USDT، 4% يومياً، 21 يوم',
    fixedAmount: 500,
    dailyProfitRate: 0.04,
    durationHours: 24,
    totalDays: 21,
    minWithdrawal: 50,
    color: '#F59E0B',
    icon: 'gold',
    sortOrder: 3,
  },
  {
    name: 'Diamond Plan',
    nameAr: 'الخطة الماسية',
    description: 'Fixed 1000 USDT investment, 5% daily, 30 days',
    descriptionAr: 'استثمار ثابت 1000 USDT، 5% يومياً، 30 يوم',
    fixedAmount: 1000,
    dailyProfitRate: 0.05,
    durationHours: 24,
    totalDays: 30,
    minWithdrawal: 100,
    color: '#A855F7',
    icon: 'diamond',
    sortOrder: 4,
  },
  {
    name: 'Bronze Plan',
    nameAr: 'الخطة البرونزية',
    description: 'Fixed 100 USDT, 2.5% daily, 10 days',
    descriptionAr: 'استثمار ثابت 100 USDT، 2.5% يومياً، 10 أيام',
    fixedAmount: 100, dailyProfitRate: 0.025, durationHours: 24, totalDays: 10, minWithdrawal: 15,
    color: '#CD7F32', icon: 'pickaxe', sortOrder: 5,
  },
  {
    name: 'Platinum Plan',
    nameAr: 'الخطة البلاتينية',
    description: 'Fixed 750 USDT, 4.5% daily, 25 days',
    descriptionAr: 'استثمار ثابت 750 USDT، 4.5% يومياً، 25 يوم',
    fixedAmount: 750, dailyProfitRate: 0.045, durationHours: 24, totalDays: 25, minWithdrawal: 75,
    color: '#E5E4E2', icon: 'silver', sortOrder: 6,
  },
  {
    name: 'VIP Plan',
    nameAr: 'خطة VIP',
    description: 'Fixed 2000 USDT, 6% daily, 40 days',
    descriptionAr: 'استثمار ثابت 2000 USDT، 6% يومياً، 40 يوم',
    fixedAmount: 2000, dailyProfitRate: 0.06, durationHours: 24, totalDays: 40, minWithdrawal: 150,
    color: '#FFD700', icon: 'gold', sortOrder: 7,
  },
  {
    name: 'Elite Plan',
    nameAr: 'الخطة النخبة',
    description: 'Fixed 5000 USDT, 7% daily, 50 days',
    descriptionAr: 'استثمار ثابت 5000 USDT، 7% يومياً، 50 يوم',
    fixedAmount: 5000, dailyProfitRate: 0.07, durationHours: 24, totalDays: 50, minWithdrawal: 300,
    color: '#FF6B6B', icon: 'diamond', sortOrder: 8,
  },
  {
    name: 'Legendary Plan',
    nameAr: 'الخطة الأسطورية',
    description: 'Fixed 10000 USDT, 8% daily, 60 days',
    descriptionAr: 'استثمار ثابت 10000 USDT، 8% يومياً، 60 يوم',
    fixedAmount: 10000, dailyProfitRate: 0.08, durationHours: 24, totalDays: 60, minWithdrawal: 500,
    color: '#FF00FF', icon: 'diamond', sortOrder: 9,
  },
]

// Daily tasks
const TASKS = [
  {
    title: 'Daily Login',
    titleAr: 'تسجيل الدخول اليومي',
    description: 'Login to your account daily',
    descriptionAr: 'سجل الدخول إلى حسابك يومياً',
    type: 'daily_login',
    rewardAmount: 0.5,
    rewardPoints: 5,
    isActive: true,
  },
  {
    title: 'Share Referral Link',
    titleAr: 'مشاركة رابط الإحالة',
    description: 'Share your referral link on social media',
    descriptionAr: 'شارك رابط الإحالة على وسائل التواصل',
    type: 'share_link',
    rewardAmount: 0.2,
    rewardPoints: 2,
    isActive: true,
  },
  {
    title: 'Invite New User',
    titleAr: 'دعوة مستخدم جديد',
    description: 'Invite a friend who makes a deposit',
    descriptionAr: 'ادعُ صديقاً يقوم بإجراء إيداع',
    type: 'invite_user',
    rewardAmount: 1,
    rewardPoints: 10,
    isActive: true,
  },
]

export async function seedDatabase() {
  console.log('[seed] Starting database initialization...')

  // 1. Create or update admin user — phone-based authentication
  //    Official admin phone: 773178684 / password: admin123 (changeable from admin panel)
  let admin = await db.user.findFirst({ where: { role: 'admin' } })
  if (!admin) {
    const passwordHash = await hashPassword('admin123')
    admin = await db.user.create({
      data: {
        phone: '773178684',
        email: 'admin@dexto.local', // optional legacy field
        name: 'Super Admin',
        passwordHash,
        referralCode: 'ADMIN2026',
        role: 'admin',
        status: 'active',
        balance: 0,
        language: 'ar',
        theme: 'dark',
      },
    })
    console.log('[seed] Created admin user with phone: 773178684')
  } else if (!admin.phone) {
    // Backfill phone on a previously-email-only admin so they can still log in
    await db.user.update({
      where: { id: admin.id },
      data: { phone: '773178684' },
    })
    console.log('[seed] Backfilled admin phone: 773178684')
  }

  // 2. Create mining plans
  for (const plan of PLANS) {
    const existing = await db.miningPlan.findFirst({ where: { name: plan.name } })
    if (!existing) {
      await db.miningPlan.create({ data: plan })
      console.log('[seed] Created plan:', plan.name)
    }
  }

  // 3. Create wallets (networks)
  for (const net of NETWORKS) {
    const existing = await db.wallet.findFirst({ where: { network: net.network } })
    if (!existing) {
      await db.wallet.create({
        data: {
          network: net.network,
          networkAr: net.networkAr,
          address: net.address,
          isActive: true,
        },
      })
      console.log('[seed] Created wallet:', net.network)
    }
  }

  // 4. Create tasks
  for (const task of TASKS) {
    const existing = await db.task.findFirst({ where: { type: task.type } })
    if (!existing) {
      await db.task.create({ data: task })
      console.log('[seed] Created task:', task.type)
    }
  }

  // 5. Create system settings (singleton)
  let settings = await db.systemSetting.findFirst()
  if (!settings) {
    settings = await db.systemSetting.create({
      data: {
        platformName: 'Crypto Mining Investment Platform',
        platformNameAr: 'منصة التعدين والاستثمار للعملات الرقمية',
        termsContent: 'Welcome to Crypto Mining Investment Platform. By using this platform, you agree to the following terms and conditions...',
        termsContentAr: 'مرحباً بك في منصة التعدين والاستثمار للعملات الرقمية. باستخدامك لهذه المنصة، فإنك توافق على الشروط والأحكام التالية...',
        privacyContent: 'We take your privacy seriously. This privacy policy explains how we collect, use, and protect your data.',
        privacyContentAr: 'نحن نأخذ خصوصيتك على محمل الجد. توضح سياسة الخصوصية هذه كيفية جمع بياناتك واستخدامها وحمايتها.',
        faqContent: JSON.stringify([
          { q: 'How does mining work?', a: 'Buy a plan, click Start Mining, and earn daily profits automatically.' },
          { q: 'When can I withdraw?', a: 'You can withdraw anytime once your balance reaches the minimum withdrawal amount.' },
          { q: 'How long does mining take?', a: 'Each mining cycle runs for 24 hours.' },
          { q: 'What payment methods are supported?', a: 'We support USDT across multiple networks including TRC20, ERC20, BEP20, and more.' },
        ]),
        faqContentAr: JSON.stringify([
          { q: 'كيف يعمل التعدين؟', a: 'اشترِ خطة، اضغط على بدء التعدين، واحصل على أرباح يومية تلقائياً.' },
          { q: 'متى يمكنني السحب؟', a: 'يمكنك السحب في أي وقت بمجرد وصول رصيدك إلى الحد الأدنى للسحب.' },
          { q: 'كم تستغرق عملية التعدين؟', a: 'كل دورة تعدين تستغرق 24 ساعة.' },
          { q: 'ما طرق الدفع المدعومة؟', a: 'ندعم USDT عبر شبكات متعددة بما في ذلك TRC20 و ERC20 و BEP20 والمزيد.' },
        ]),
      },
    })
    console.log('[seed] Created system settings')
  }

  console.log('[seed] Database initialization complete.')
  return { admin, settings }
}

// Run if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] Error:', err)
      process.exit(1)
    })
}
