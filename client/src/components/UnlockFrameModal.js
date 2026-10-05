import React from 'react'
import coinIcon from '../assets/coin.png'

export default function UnlockFrameModal({ template, price, coins, unlocking, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-sm max-h-full overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center">
          <img src={coinIcon} alt="" className="w-6 h-6" />
        </div>

        <h2 className="mt-3 text-lg font-extrabold text-dark">Unlock {template.name}?</h2>

        <p className="mt-2 text-sm text-gray-600">
          This will cost <span className="font-semibold text-pink-primary">{price} coins</span>. You currently
          have {coins} coins.
        </p>

        <p className="mt-3 text-xs text-gray-400">
          Unlocking is permanent. You'll keep this frame for good.
        </p>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={unlocking}
            className="w-full rounded-xl border-2 border-pink-primary bg-pink-primary text-white font-semibold py-2.5 hover:opacity-90 transition disabled:opacity-50"
          >
            {unlocking ? 'Unlocking…' : `Yes, unlock for ${price} coins`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={unlocking}
            className="w-full rounded-xl border-2 border-gray-200 text-gray-500 font-semibold py-2.5 hover:border-pink-primary hover:text-pink-primary transition disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
