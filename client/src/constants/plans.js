// Single source of truth for subscription tiers and coin packs, shared
// between the Pricing page (where people buy) and the Profile page
// (where their current plan/perks are displayed), so the two can never
// drift out of sync.
export const PLANS = [
  {
    name: 'Free Plan',
    price: '$0',
    cta: 'Get Started',
    coins: 0,
    features: ['3 photos per day', 'Free frames only', 'Watermark on downloads'],
  },
  {
    name: 'Pro Plan',
    price: '$1.99',
    cta: 'Upgrade to Pro',
    coins: 70,
    features: [
      '10 photos per day',
      'No watermark',
      'Smart frame recommendation',
      '3 collab booth sessions / day',
      '70 coins / month',
    ],
  },
  {
    name: 'Pro Max Plan',
    price: '$3.99',
    cta: 'Upgrade to Pro Max',
    coins: 160,
    features: [
      '30 photos per day',
      'No watermark',
      'Smart frame recommendation',
      'Unlimited collab booth',
      'Early access to new frames',
      '160 coins / month',
    ],
  },
]

export const COIN_PACKS = [
  { coins: 60, price: '$1.00' },
  { coins: 200, price: '$3.00' },
  { coins: 350, price: '$5.00' },
]

export const getPlanByName = (name) => PLANS.find((p) => p.name === name) || PLANS[0]
