import React from 'react'
import { Link } from 'react-router-dom'
import { Camera, Users, Box, Sparkles, Scissors } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import homeFrame from '../assets/home_frame.png'

const FEATURES = [
  {
    icon: Box,
    title: 'Live camera filter',
    description: 'Apply real time filters to your camera feed before capturing your photo.',
  },
  {
    icon: Sparkles,
    title: 'Smart frame recommendation',
    description: 'Analyzes your photo and suggests matching frames automatically.',
  },
  {
    icon: Scissors,
    title: 'Custom frame design',
    description: 'Design your own frames with stickers, text, and colors.',
  },
  {
    icon: Users,
    title: 'Collaborative booth',
    description: 'Take photos together with friends from home by sharing the code room.',
  },
]

const STEPS = [
  {
    step: 'STEP 1',
    title: 'Take or upload',
    description: 'Use your camera with live filters or upload an existing image.',
  },
  {
    step: 'STEP 2',
    title: 'Pick a frame',
    description: 'Choose from free and premium frames or create your own.',
  },
  {
    step: 'STEP 3',
    title: 'Download and share',
    description: 'Save your photo strip and video or share it.',
  },
]

export default function Home() {
  return (
    <div className="min-h-dvh bg-white">
      <Navbar />

      <section className="bg-gradient-to-br from-pink-100 via-pink-50 to-white">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 py-8 md:py-10 lg:py-10 grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight text-dark">
              Your
              <br />
              photobooth,
              <br />
              <span className="text-pink-primary">anywhere,</span>
              <br />
              <span className="text-pink-primary">anytime.</span>
            </h1>
            <p className="mt-4 md:mt-5 text-gray-500 text-sm md:text-base lg:text-lg max-w-xl lg:max-w-2xl">
              Take fun photos with live filters, design your own frames, and share memories with
              friends, all from your browser.
            </p>
            <div className="mt-6 lg:mt-6 flex flex-wrap gap-3 lg:gap-4">
              <Link
                to="/photobooth"
                className="inline-flex items-center gap-2 rounded-full border-2 border-pink-primary text-pink-primary font-semibold text-sm md:text-base lg:text-lg px-5 py-2.5 lg:px-7 lg:py-3.5 hover:bg-pink-50 transition"
              >
                <Camera size={18} />
                Start taking photos
              </Link>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 rounded-full border-2 border-pink-primary text-pink-primary font-semibold text-sm md:text-base lg:text-lg px-5 py-2.5 lg:px-7 lg:py-3.5 hover:bg-pink-50 transition"
              >
                <Users size={18} />
                Join a booth
              </Link>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <img
              src={homeFrame}
              alt="Sample frame styles"
              className="w-full max-w-[280px] md:max-w-sm lg:max-w-md xl:max-w-lg"
            />
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-20 text-center">
        <h2 className="text-4xl font-extrabold text-dark">Why Luvibooth?</h2>
        <p className="mt-3 text-gray-500">Everything you need for the perfect photobooth experience</p>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="text-left rounded-2xl border-2 border-pink-primary p-6 hover:shadow-sm transition"
            >
              <div className="w-11 h-11 rounded-xl bg-pink-50 flex items-center justify-center text-pink-primary">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-bold text-dark">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-pink-50/50 py-20">
        <div className="max-w-[1440px] mx-auto px-6 md:px-16 text-center">
          <h2 className="text-4xl font-extrabold text-dark">How it works</h2>
          <p className="mt-3 text-gray-500">Three simple steps to your perfect photo strip</p>

          <div className="mt-14 grid md:grid-cols-3 gap-12">
            {STEPS.map(({ step, title, description }, i) => (
              <div key={step} className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-pink-primary text-white text-xl font-bold flex items-center justify-center">
                  {i + 1}
                </div>
                <span className="mt-3 text-sm font-semibold text-pink-primary tracking-wide">
                  {step}
                </span>
                <h3 className="mt-1 text-lg font-bold text-dark">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-xs">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1440px] mx-auto px-6 md:px-16 py-20 text-center">
        <h2 className="text-4xl font-extrabold text-dark">Ready to take your first photo?</h2>
        <p className="mt-3 text-gray-500">Join thousands of users creating fun memories with Luvibooth</p>
        <Link
          to="/photobooth"
          className="mt-8 inline-block rounded-full bg-pink-primary text-white font-semibold px-7 py-3.5 hover:opacity-90 transition"
        >
          Start Now
        </Link>
      </section>

      <Footer />
    </div>
  )
}
