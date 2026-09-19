import React from 'react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const SECTIONS = [
  {
    title: '1. Information we collect',
    body: `When you create a Luvibooth account, we collect your name, username, and email address. If you sign in with Google, we receive your name, email, and profile picture from your Google account. When you use the photobooth, we process the photos you capture or upload, along with any frames, stickers, text, or filters you apply to them.`,
  },
  {
    title: '2. How we use your information',
    body: `We use your information to operate your account, let you take and customize photos, process coin purchases, respond to messages you send through our Contact Us page, and improve Luvibooth's features. We do not sell your personal information to third parties.`,
  },
  {
    title: '3. Your photos and frames',
    body: `Photos and frames you create are yours. They are stored so you can access and download them, and are not shared publicly unless you choose to share them. You can delete your photos or your account at any time by contacting us.`,
  },
  {
    title: '4. Third-party services',
    body: `Luvibooth uses Supabase for authentication and data storage, and Google Sign-In as an optional login method. These providers process data on our behalf under their own privacy and security practices.`,
  },
  {
    title: '5. Cookies and local storage',
    body: `We use cookies and browser storage to keep you signed in and remember your preferences. You can control cookies through your browser settings, though some features may not work correctly if cookies are disabled.`,
  },
  {
    title: '6. Data retention',
    body: `We keep your account information and content for as long as your account is active. If you delete your account, we remove your personal data within a reasonable time, except where we're required to keep it for legal reasons.`,
  },
  {
    title: '7. Your rights',
    body: `You can access, update, or delete your personal information at any time. To request a copy of your data or to have your account permanently deleted, reach out to us through the Contact Us page.`,
  },
  {
    title: "8. Children's privacy",
    body: `Luvibooth is not directed at children under 13, and we do not knowingly collect personal information from children under 13.`,
  },
  {
    title: '9. Changes to this policy',
    body: `We may update this Privacy Policy from time to time. If we make significant changes, we'll let you know through the app or by email.`,
  },
]

export default function PrivacyPolicy() {
  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="bg-pink-50 text-center py-16 px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-dark">
          Privacy <span className="text-pink-primary">Policy</span>
        </h1>
        <p className="mt-4 text-gray-500 max-w-xl mx-auto">
          Last updated: September 2026. Here's how Luvibooth collects, uses, and protects your information.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 md:px-0 py-16">
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-bold text-dark">{section.title}</h2>
              <p className="mt-2 text-gray-500 leading-relaxed">{section.body}</p>
            </div>
          ))}

          <div>
            <h2 className="text-xl font-bold text-dark">10. Contact us</h2>
            <p className="mt-2 text-gray-500 leading-relaxed">
              If you have any questions about this Privacy Policy, please reach out at{' '}
              <a href="mailto:luvibooth127@gmail.com" className="text-pink-primary hover:underline">
                luvibooth127@gmail.com
              </a>{' '}
              or through our Contact Us page.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
