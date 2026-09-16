import React from 'react'
import { FileText } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const SECTIONS = [
  {
    title: '1. Accepting these terms',
    body: `By creating an account or using Luvibooth, you agree to these Terms of Service. If you don't agree, please don't use the app.`,
  },
  {
    title: '2. Your account',
    body: `You're responsible for keeping your account credentials secure and for anything that happens under your account. Usernames must be unique and may not impersonate another person or be offensive.`,
  },
  {
    title: '3. Using the photobooth',
    body: `Luvibooth lets you capture or upload photos, apply live filters, design custom frames, and take part in shared photobooth sessions. You agree to only capture or upload content you have the right to use, and not to use the service to create content that is illegal, hateful, or infringes on someone else's rights.`,
  },
  {
    title: '4. Your content',
    body: `You keep ownership of the photos, frames, and designs you create. By using Luvibooth, you give us permission to store and process that content solely to provide the service to you (for example, saving your frames so you can download them later).`,
  },
  {
    title: '5. Coins and payments',
    body: `Luvibooth uses coins to unlock certain features and plans. Coins are non-refundable once purchased, except where required by law. Pricing and plan details are shown on our Pricing page and may change from time to time.`,
  },
  {
    title: '6. Shared sessions',
    body: `When you join or host a shared photobooth session using a room code, other participants in that session may see the photos taken during it. Only share room codes with people you trust.`,
  },
  {
    title: '7. Acceptable use',
    body: `You agree not to misuse Luvibooth — this includes attempting to disrupt the service, reverse-engineer it, or use it to harass or harm others.`,
  },
  {
    title: '8. Termination',
    body: `We may suspend or terminate accounts that violate these terms. You can stop using Luvibooth and delete your account at any time by contacting us.`,
  },
  {
    title: '9. Disclaimer',
    body: `Luvibooth is provided "as is." We do our best to keep the service reliable, but we don't guarantee it will always be available or error-free.`,
  },
  {
    title: '10. Changes to these terms',
    body: `We may update these Terms of Service from time to time. Continuing to use Luvibooth after changes take effect means you accept the updated terms.`,
  },
]

export default function TermsOfService() {
  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="bg-pink-50 text-center py-16 px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white text-pink-primary text-sm font-medium px-4 py-1.5">
          <FileText size={16} />
          Please read carefully
        </span>
        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold text-dark">
          Terms of <span className="text-pink-primary">Service</span>
        </h1>
        <p className="mt-4 text-gray-500 max-w-xl mx-auto">
          Last updated: September 2026. These terms explain what you can expect from Luvibooth, and what we expect from you.
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
            <h2 className="text-xl font-bold text-dark">11. Contact us</h2>
            <p className="mt-2 text-gray-500 leading-relaxed">
              Questions about these terms? Reach out at{' '}
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
