import React from 'react'

export default function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="#9AA3B2" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3" stroke="#9AA3B2" strokeWidth="1.7" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l18 18" stroke="#9AA3B2" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10.6 5.2C11 5.1 11.5 5 12 5c6.5 0 10 7 10 7-.6 1.1-1.5 2.5-2.8 3.7M6.5 6.7C4.2 8.2 2 12 2 12s3.5 7 10 7c1.4 0 2.7-.3 3.8-.8" stroke="#9AA3B2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 10c-.5.5-.9 1.2-.9 2 0 1.7 1.3 3 3 3 .8 0 1.5-.3 2-.9" stroke="#9AA3B2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
