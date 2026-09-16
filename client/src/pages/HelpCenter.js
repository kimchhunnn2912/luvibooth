import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, ChevronDown, Mail } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const FAQS = [
  {
    question: 'How do I take photos?',
    answer:
      'Go to the Photobooth page from the Home page, pick a layout, then choose Capture or Upload. In Capture mode, allow camera access and click Start Capture — it will count down and take each pose automatically.',
  },
  {
    question: 'Can I retake a photo?',
    answer:
      'Yes. Once all your photos are captured, double-tap (or double-click) any thumbnail to retake just that one. There\'s also a "Retake photos" link on the design page if you want to redo the whole set.',
  },
  {
    question: 'How do I design a custom frame?',
    answer:
      'After capturing your photos, click Continue to open the design page. From there you can add stickers, text, drawings, and change the border color using the tools on the left.',
  },
  {
    question: 'How do I download my frame or video?',
    answer:
      'On the design page, use the "Download frame" button to save your decorated photo strip as an image, or "Download video" to save a boomerang-style clip of your poses.',
  },
  {
    question: 'How do coins work?',
    answer:
      'Coins are used to unlock premium plans and features. You can check your balance and top up from the coin icon in the navigation bar, or from the Pricing page.',
  },
  {
    question: 'I forgot my password. What do I do?',
    answer:
      'Click "Forgot password?" on the Login page and follow the instructions sent to your email to reset it.',
  },
  {
    question: 'My camera isn\'t working. What should I check?',
    answer:
      "Make sure you've allowed camera permission for this site in your browser settings, and that no other app is currently using your camera. Refreshing the page after granting permission usually fixes it.",
  },
  {
    question: 'How do I delete my account?',
    answer:
      'We don\'t have a self-serve delete option yet — please contact us and we\'ll take care of it for you.',
  },
]

export default function HelpCenter() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="bg-pink-50 text-center py-16 px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white text-pink-primary text-sm font-medium px-4 py-1.5">
          <LifeBuoy size={16} />
          We're here to help
        </span>
        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold text-dark">
          Help <span className="text-pink-primary">Center</span>
        </h1>
        <p className="mt-4 text-gray-500 max-w-xl mx-auto">
          Answers to common questions about using Luvibooth.
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 md:px-0 py-16">
        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i
            return (
              <div key={faq.question} className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-dark">{faq.question}</span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-pink-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && <p className="px-5 pb-4 text-gray-500 leading-relaxed">{faq.answer}</p>}
              </div>
            )
          })}
        </div>

        <div className="mt-12 rounded-2xl border-2 border-pink-primary p-6 text-center">
          <h2 className="text-lg font-bold text-dark">Still need help?</h2>
          <p className="mt-1 text-gray-500">Send us a message and we'll get back to you as soon as possible.</p>
          <Link
            to="/contact"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-pink-primary text-white font-semibold px-6 py-2.5 hover:opacity-90 transition"
          >
            <Mail size={16} />
            Contact us
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
