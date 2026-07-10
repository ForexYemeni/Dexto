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

// Mining plans
const PLANS = [
  {
    name: 'Basic Plan',
    nameAr: 'الخطة الأساسية',
    description: 'Start your mining journey with the Basic plan - 7 days',
    descriptionAr: 'ابدأ رحلتك في التعدين مع الخطة الأساسية - 7 أيام',
    price: 50,
    dailyProfitRate: 0.02,
    durationHours: 24,
    totalDays: 7,
    minInvestment: 50,
    maxInvestment: 199,
    color: '#10B981',
    icon: 'pickaxe',
    sortOrder: 1,
  },
  {
    name: 'Silver Plan',
    nameAr: 'الخطة الفضية',
    description: 'Higher returns with the Silver plan - 14 days',
    descriptionAr: 'أرباح أعلى مع الخطة الفضية - 14 يوم',
    price: 200,
    dailyProfitRate: 0.03,
    durationHours: 24,
    totalDays: 14,
    minInvestment: 200,
    maxInvestment: 499,
    color: '#9CA3AF',
    icon: 'silver',
    sortOrder: 2,
  },
  {
    name: 'Gold Plan',
    nameAr: 'الخطة الذهبية',
    description: 'Excellent returns with the Gold plan - 21 days',
    descriptionAr: 'عوائد ممتازة مع الخطة الذهبية - 21 يوم',
    price: 500,
    dailyProfitRate: 0.04,
    durationHours: 24,
    totalDays: 21,
    minInvestment: 500,
    maxInvestment: 999,
    color: '#F59E0B',
    icon: 'gold',
    sortOrder: 3,
  },
  {
    name: 'Diamond Plan',
    nameAr: 'الخطة الماسية',
    description: 'Maximum returns with the Diamond plan - 30 days',
    descriptionAr: 'أعلى العوائد مع الخطة الماسية - 30 يوم',
    price: 1000,
    dailyProfitRate: 0.05,
    durationHours: 24,
    totalDays: 30,
    minInvestment: 1000,
    maxInvestment: 100000,
    color: '#A855F7',
    icon: 'diamond',
    sortOrder: 4,
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

  // 1. Create or update admin user
  let admin = await db.user.findFirst({ where: { role: 'admin' } })
  if (!admin) {
    const passwordHash = await hashPassword('Admin@2026')
    admin = await db.user.create({
      data: {
        email: 'admin@cryptomining.io',
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
    console.log('[seed] Created admin user:', admin.email)
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
