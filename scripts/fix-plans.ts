// Fix mining plans - update old plans with new schema fields + add 6 new plans
import { db } from '../src/lib/db'

const ALL_PLANS = [
  { name: 'Basic Plan', nameAr: 'الخطة الأساسية', fixedAmount: 50, dailyProfitRate: 0.02, totalDays: 7, minWithdrawal: 10, color: '#10B981', icon: 'pickaxe', sortOrder: 1 },
  { name: 'Silver Plan', nameAr: 'الخطة الفضية', fixedAmount: 200, dailyProfitRate: 0.03, totalDays: 14, minWithdrawal: 20, color: '#9CA3AF', icon: 'silver', sortOrder: 2 },
  { name: 'Gold Plan', nameAr: 'الخطة الذهبية', fixedAmount: 500, dailyProfitRate: 0.04, totalDays: 21, minWithdrawal: 50, color: '#F59E0B', icon: 'gold', sortOrder: 3 },
  { name: 'Diamond Plan', nameAr: 'الخطة الماسية', fixedAmount: 1000, dailyProfitRate: 0.05, totalDays: 30, minWithdrawal: 100, color: '#A855F7', icon: 'diamond', sortOrder: 4 },
  // NEW 6 plans
  { name: 'Starter Plan', nameAr: 'خطة المبتدئ', fixedAmount: 25, dailyProfitRate: 0.015, totalDays: 5, minWithdrawal: 5, color: '#06B6D4', icon: 'pickaxe', sortOrder: 0 },
  { name: 'Bronze Plan', nameAr: 'الخطة البرونزية', fixedAmount: 100, dailyProfitRate: 0.025, totalDays: 10, minWithdrawal: 15, color: '#CD7F32', icon: 'pickaxe', sortOrder: 5 },
  { name: 'Platinum Plan', nameAr: 'الخطة البلاتينية', fixedAmount: 750, dailyProfitRate: 0.045, totalDays: 25, minWithdrawal: 75, color: '#E5E4E2', icon: 'silver', sortOrder: 6 },
  { name: 'VIP Plan', nameAr: 'خطة VIP', fixedAmount: 2000, dailyProfitRate: 0.06, totalDays: 40, minWithdrawal: 150, color: '#FFD700', icon: 'gold', sortOrder: 7 },
  { name: 'Elite Plan', nameAr: 'الخطة النخبة', fixedAmount: 5000, dailyProfitRate: 0.07, totalDays: 50, minWithdrawal: 300, color: '#FF6B6B', icon: 'diamond', sortOrder: 8 },
  { name: 'Legendary Plan', nameAr: 'الخطة الأسطورية', fixedAmount: 10000, dailyProfitRate: 0.08, totalDays: 60, minWithdrawal: 500, color: '#FF00FF', icon: 'diamond', sortOrder: 9 },
]

async function main() {
  console.log('Updating/creating mining plans...')

  for (const planData of ALL_PLANS) {
    const existing = await db.miningPlan.findFirst({ where: { name: planData.name } })
    if (existing) {
      // Update existing plan with new fields
      await db.miningPlan.update({
        where: { id: existing.id },
        data: {
          fixedAmount: planData.fixedAmount,
          minWithdrawal: planData.minWithdrawal,
          dailyProfitRate: planData.dailyProfitRate,
          totalDays: planData.totalDays,
          color: planData.color,
          icon: planData.icon,
          sortOrder: planData.sortOrder,
          nameAr: planData.nameAr,
        },
      })
      console.log(`✅ Updated: ${planData.name}`)
    } else {
      // Create new plan
      await db.miningPlan.create({
        data: {
          name: planData.name,
          nameAr: planData.nameAr,
          description: `${planData.name} - ${planData.fixedAmount} USDT, ${(planData.dailyProfitRate * 100).toFixed(1)}% daily, ${planData.totalDays} days`,
          descriptionAr: `${planData.nameAr} - ${planData.fixedAmount} USDT، ${(planData.dailyProfitRate * 100).toFixed(1)}% يومياً، ${planData.totalDays} أيام`,
          fixedAmount: planData.fixedAmount,
          dailyProfitRate: planData.dailyProfitRate,
          durationHours: 24,
          totalDays: planData.totalDays,
          minWithdrawal: planData.minWithdrawal,
          color: planData.color,
          icon: planData.icon,
          isActive: true,
          sortOrder: planData.sortOrder,
        },
      })
      console.log(`✅ Created: ${planData.name}`)
    }
  }

  // Also update referral settings to percentage of deposit
  const settings = await db.systemSetting.findFirst()
  if (settings) {
    await db.systemSetting.update({
      where: { id: settings.id },
      data: {
        referralLevel1Fixed: 0.10,  // 10% of deposit
        referralLevel2Fixed: 0.05,  // 5% of deposit
        referralLevel3Fixed: 0.02,  // 2% of deposit
      },
    })
    console.log('✅ Updated referral to percentage of deposit')
  }

  console.log('\n=== All plans ===')
  const allPlans = await db.miningPlan.findMany({ orderBy: { sortOrder: 'asc' } })
  for (const p of allPlans) {
    console.log(`  ${p.sortOrder}. ${p.name} (${p.nameAr}) - ${p.fixedAmount} USDT, ${(p.dailyProfitRate * 100).toFixed(1)}%, ${p.totalDays} days, minWithdraw: ${p.minWithdrawal}`)
  }
  console.log(`\nTotal: ${allPlans.length} plans`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
