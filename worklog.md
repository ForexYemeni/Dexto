---
Task ID: fix-mining-fixed-amount-ui
Agent: Main agent
Task: Fix user account mining plans to display the fixed amount instead of the deprecated minInvestment/maxInvestment fields. The user reported "خطط التعدين ليس رقما" (mining plans not a number) because MiningView.tsx still referenced the old `minInvestment`/`maxInvestment` fields which are no longer returned by the mining API.

Work Log:
- Read MiningView.tsx (701 lines) and the mining API route at /api/mining/route.ts to confirm the API now returns only `fixedAmount` (no min/max).
- Verified the Prisma schema (`MiningPlan`) only contains `fixedAmount` (no minInvestment/maxInvestment columns).
- Confirmed admin side (AdminPlans.tsx) already uses `fixedAmount`.
- Updated MiningView.tsx:
  * Removed `investmentAmount` user-input state variable (the amount is now fixed by the plan).
  * `openStartModal()` no longer pre-fills a user-editable amount.
  * `handleStartMining()` validates against `selectedPlan.fixedAmount` and no longer sends `investmentAmount` in the POST body.
  * Plan stats grid now shows: Investment Amount (fixed), Duration, Daily Profit (= fixedAmount × dailyProfitRate), Total Profit (= dailyProfit × totalDays) — replacing the old "Daily Profit %", "Duration", "Min Investment", "Max Investment" tiles.
  * Balance status indicator compares `data.balance` against `plan.fixedAmount` instead of `plan.minInvestment`.
  * Modal header now shows the actual daily profit value (e.g. "+1 USDT") instead of the percentage rate.
  * Modal body: replaced the user-editable investment-amount input with a read-only "Investment Amount" row, and added a DollarSign icon to it.
  * Insufficient-balance warning in the modal now references `selectedPlan.fixedAmount`.
  * Expected-profit block in the modal now uses `selectedPlan.fixedAmount` (no longer multiplied by a user-entered `investmentAmount`).
  * Added `Wallet` and `DollarSign` to the lucide-react imports.
- Verified there are no remaining references to `plan.minInvestment` or `plan.maxInvestment` in MiningView.tsx; the only remaining `investmentAmount` references are the legitimate session/history fields returned by the API.
- TypeScript check (`npx tsc --noEmit`) reports no new errors for MiningView.tsx.

Stage Summary:
- The user account mining plans page now displays the plan's fixed investment amount as a number (no more "ليس رقما"), shows the calculated daily/total profit, and the subscription modal no longer asks the user to type a custom investment amount — it confirms the fixed amount defined by the admin.
- The fix aligns the user-facing mining UI with the already-updated API and admin UI that use `fixedAmount`.
