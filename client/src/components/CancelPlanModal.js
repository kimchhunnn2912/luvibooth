import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function CancelPlanModal({ planName, planRenewDate, features, formatDate, onKeep, onConfirm }) {
  const shortName = planName.replace(' Plan', '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-sm max-h-full overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
          <AlertTriangle size={20} className="text-pink-primary" />
        </div>

        <h2 className="mt-3 text-lg font-extrabold text-dark">Cancel your {shortName} plan?</h2>

        <p className="mt-2 text-sm text-gray-600">
          Are you sure you want to cancel? Your plan stays active until{' '}
          <span className="font-semibold text-pink-primary">{formatDate(planRenewDate)}</span> — after that
          you'll lose access to:
        </p>

        <ul className="mt-3 rounded-xl bg-pink-50 p-4 text-left space-y-1.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-pink-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-primary shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-gray-400">
          💡 You won't be charged again after cancelling. Any unused coins will remain in your account.
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onKeep}
            className="w-full rounded-xl border-2 border-pink-primary bg-pink-primary text-white font-semibold py-2.5 hover:opacity-90 transition"
          >
            Keep my {shortName} plan
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl border-2 border-gray-200 text-gray-500 font-semibold py-2.5 hover:border-red-400 hover:text-red-500 transition"
          >
            Yes, cancel my plan
          </button>
        </div>
      </div>
    </div>
  )
}
