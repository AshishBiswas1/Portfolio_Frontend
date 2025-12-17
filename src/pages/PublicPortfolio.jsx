import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import PortfolioNavbar from '../components/PortfolioNavbar'

const API_BASE = import.meta.env.VITE_API_BASE_URL

export default function PublicPortfolio() {
  const { username } = useParams()
  const NAVBAR_HEIGHT = 56
  const [portfolio, setPortfolio] = useState({
    about: { name: '', designation: '', description: '', profile_image: '' },
    skills: [],
    projects: [],
    experience: [],
    blogs: [],
    services: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Auth detection: read token from localStorage or cookie and listen for authChanged
  const [authToken, setAuthToken] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)

  const readTokenFromSources = () => {
    let t = null
    try {
      t = localStorage.getItem('AUTH_TOKEN') || null
    } catch (e) {
      t = null
    }
    if (!t && typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|; )AUTH_TOKEN=([^;]+)/)
      if (m) t = decodeURIComponent(m[1])
    }
    return t
  }

  useEffect(() => {
    const syncToken = () => {
      const t = readTokenFromSources()
      setAuthToken(t)
    }
    syncToken()
    const onAuthChanged = () => syncToken()
    window.addEventListener('authChanged', onAuthChanged)
    const grace = setTimeout(() => setAuthChecked(true), 600)
    return () => {
      window.removeEventListener('authChanged', onAuthChanged)
      clearTimeout(grace)
    }
  }, [])

  // Animation refs/state for floating image (same as CreatePortfolio)
  const heroImgRef = useRef(null)
  const descLeftRef = useRef(null)
  const floatingImgRef = useRef(null)
  const [floatingVisible, setFloatingVisible] = useState(false)
  const [floatingStyle, setFloatingStyle] = useState({ top: '0px', left: '0px', width: '0px', height: '0px', borderRadius: '9999px', opacity: 1, scale: 1, rotate: 0 })
  const [hideHeroImg, setHideHeroImg] = useState(false)
  const [hideDescImg, setHideDescImg] = useState(false)
  const [currentExpIndex, setCurrentExpIndex] = useState(0)

  // Contact form state
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [contactFeedback, setContactFeedback] = useState(null)

  useEffect(() => {
    if (!username) {
      setError('Invalid portfolio URL')
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/portfolio/${username}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Portfolio not found')
        }
        const data = await res.json()
        setPortfolio({
          about: data.data?.about || { name: '', designation: '', description: '', profile_image: '' },
          skills: data.data?.skills || [],
          projects: data.data?.projects || [],
          experience: data.data?.experience || [],
          blogs: data.data?.blogs || [],
          services: data.data?.services || []
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [username])

  // Animate hero image -> left of description (same diagonal animation as CreatePortfolio)
  useLayoutEffect(() => {
    if (!portfolio.about.profile_image) return
    const descSection = document.getElementById('about-desc')
    if (!descSection || !heroImgRef.current || !descLeftRef.current) return

    let timer = null

    const rect = el => el.getBoundingClientRect()

    const startAnimation = (fromEl, toEl, toLeft) => {
      const from = rect(fromEl)
      const to = rect(toEl)

      const deltaX = to.left - from.left
      const deltaY = to.top - from.top
      const deltaW = to.width - from.width
      const deltaH = to.height - from.height

      if (toLeft) {
        setHideHeroImg(true)
      } else {
        setHideDescImg(true)
      }

      setFloatingStyle({
        top: `${from.top}px`,
        left: `${from.left}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        borderRadius: toLeft ? '9999px' : '12px',
        opacity: 1,
        scale: 1.05,
        rotate: toLeft ? -3 : 3
      })
      setFloatingVisible(true)

      let progress = 0
      const steps = 60
      const stepDuration = 850 / steps

      const animateStep = () => {
        progress += 1 / steps
        if (progress > 1) progress = 1

        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

        const curve = Math.sin(eased * Math.PI) * 0.15
        const curveOffsetX = deltaX * curve
        const curveOffsetY = -Math.abs(deltaY) * curve * 0.3

        setFloatingStyle({
          top: `${from.top + deltaY * eased + curveOffsetY}px`,
          left: `${from.left + deltaX * eased + curveOffsetX}px`,
          width: `${from.width + deltaW * eased}px`,
          height: `${from.height + deltaH * eased}px`,
          borderRadius: toLeft
            ? `${Math.max(12, 9999 * (1 - eased))}px`
            : `${Math.max(12, 9999 * eased)}px`,
          opacity: 1,
          scale: 1.05 - (0.05 * eased),
          rotate: toLeft ? (-3 + 3 * eased) : (3 - 3 * eased)
        })

        if (progress < 1) {
          requestAnimationFrame(animateStep)
        } else {
          setTimeout(() => {
            setFloatingStyle(prev => ({ ...prev, opacity: 0 }))
            setTimeout(() => {
              setFloatingVisible(false)
              if (toLeft) {
                setHideDescImg(false)
              } else {
                setHideHeroImg(false)
              }
            }, 150)
          }, 100)
        }
      }

      if (timer) clearTimeout(timer)
      requestAnimationFrame(animateStep)
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startAnimation(heroImgRef.current, descLeftRef.current, true)
        } else {
          startAnimation(descLeftRef.current, heroImgRef.current, false)
        }
      })
    }, { threshold: 0.45 })

    io.observe(descSection)

    const onResize = () => {
      if (!floatingVisible) return
      if (floatingImgRef.current) {
        const cur = floatingImgRef.current.getBoundingClientRect()
        setFloatingStyle(s => ({ ...s, top: `${cur.top}px`, left: `${cur.left}px` }))
      }
    }

    window.addEventListener('resize', onResize)

    return () => {
      io.disconnect()
      window.removeEventListener('resize', onResize)
      if (timer) clearTimeout(timer)
    }
  }, [portfolio.about.profile_image])

  // Contact owner handler
  const handleSendMessage = async e => {
    e.preventDefault()
    setContactFeedback(null)
    if (!contactEmail || !contactMessage) return setContactFeedback({ type: 'error', text: 'Email and message are required' })
    
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    if (!emailOk) return setContactFeedback({ type: 'error', text: 'Enter a valid email' })

    const receiver_id = portfolio?.about?.user_id || portfolio?.about?.id
    if (!receiver_id) return setContactFeedback({ type: 'error', text: 'Unable to determine portfolio owner' })

    setContactLoading(true)
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: contactEmail, message: contactMessage, receiver_id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send message')
      setContactFeedback({ type: 'success', text: 'Message sent successfully!' })
      setContactEmail('')
      setContactMessage('')
    } catch (err) {
      setContactFeedback({ type: 'error', text: err.message })
    } finally {
      setContactLoading(false)
    }
  }

  if (loading) return <div className="p-8">Loading portfolio...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* PortfolioNavbar without Edit/Preview/Publish buttons */}
      <PortfolioNavbar previewMode={true} />

      {/* Floating animated image */}
      {portfolio.about.profile_image && (
        <img
          ref={floatingImgRef}
          src={portfolio.about.profile_image}
          alt="floating profile"
          style={{
            position: 'fixed',
            top: floatingStyle.top,
            left: floatingStyle.left,
            width: floatingStyle.width,
            height: floatingStyle.height,
            borderRadius: floatingStyle.borderRadius,
            objectFit: 'cover',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            transform: `scale(${floatingStyle.scale || 1}) rotate(${floatingStyle.rotate || 0}deg)`,
            opacity: floatingStyle.opacity,
            transition: 'opacity 150ms ease-out',
            zIndex: 60,
            pointerEvents: 'none',
            display: floatingVisible ? 'block' : 'none'
          }}
        />
      )}

      {/* Full Page Public Portfolio */}
      <div className="w-full" style={{ marginTop: `-${NAVBAR_HEIGHT}px` }}>
        {/* Hero Section */}
        <section id="about" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-white space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold gradient-text">
                  {portfolio.about.name || 'Portfolio'}
                </h1>
                {portfolio.about.designation && (
                  <p className="text-sm md:text-base text-purple-300 font-medium">{portfolio.about.designation}</p>
                )}
              </div>

              <div className="flex justify-center md:justify-end">
                {portfolio.about.profile_image ? (
                  <img
                    ref={heroImgRef}
                    src={portfolio.about.profile_image}
                    alt="Profile"
                    className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/30 object-cover shadow-2xl"
                    style={{ visibility: hideHeroImg ? 'hidden' : 'visible' }}
                  />
                ) : (
                  <div className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/30 bg-white/10 flex items-center justify-center shadow-2xl">
                    <span className="text-white/50 text-lg">No Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section id="about-desc" className="section-padding bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div className="flex items-start justify-center" ref={descLeftRef}>
                <div className="w-56 h-56 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                  {portfolio.about.profile_image && !hideDescImg ? (
                    <img src={portfolio.about.profile_image} alt="desc target" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              </div>
              <div className="text-gray-100">
                <h3 className="text-2xl font-semibold mb-4 text-black">About</h3>
                <p className="text-base leading-relaxed text-black">{portfolio.about.description || 'No description available'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Skills Section */}
        <section id="skills" className="section-padding bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Skills</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {portfolio.skills.length > 0 ? (
                portfolio.skills.map((skill, i) => (
                  <div key={i} className="glass-effect p-6 rounded-xl text-center">
                    <div className="text-xl font-semibold">{skill.name}</div>
                    {skill.proficiency && (
                      <div className="mt-2 text-sm text-gray-600">{skill.proficiency}%</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400">No skills added yet</div>
              )}
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="section-padding bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Projects</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {portfolio.projects.length > 0 ? (
                portfolio.projects.map((project, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {project.image_url && (
                      <img src={project.image_url} alt={project.title} className="w-full h-48 object-cover" />
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold">{project.title}</h3>
                      <p className="mt-2 text-gray-600">{project.description}</p>
                      <div className="mt-4 flex gap-3">
                        {project.github_url && (
                          <a 
                            href={project.github_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md text-sm transition-colors"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                            GitHub
                          </a>
                        )}
                        {project.demo_url && (
                          <a 
                            href={project.demo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400">No projects added yet</div>
              )}
            </div>
          </div>
        </section>

        {/* Experience Section */}
        <section id="experience" className="section-padding bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Experience</h2>
            <div className="relative">
              {portfolio.experience.length > 0 ? (
                <>
                  {/* Carousel Container */}
                  <div className="overflow-hidden">
                    <div 
                      className="flex transition-transform duration-500 ease-in-out"
                      style={{ transform: `translateX(-${currentExpIndex * 100}%)` }}
                    >
                      {portfolio.experience.map((exp, i) => (
                        <div key={i} className="min-w-full flex-shrink-0 px-2">
                          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
                            <div className="p-6">
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                                <div className="flex-1">
                                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{exp.position}</h3>
                                  <p className="text-lg font-semibold text-purple-600">{exp.company}</p>
                                  {exp.location && (
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {exp.location}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-start md:items-end gap-2">
                                  {exp.employment_type && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                                      {exp.employment_type}
                                    </span>
                                  )}
                                  {(exp.start_date || exp.end_date || exp.is_current) && (
                                    <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      {exp.start_date && new Date(exp.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                      {(exp.start_date && (exp.end_date || exp.is_current)) && ' - '}
                                      {exp.is_current ? <span className="text-green-600 font-semibold">Present</span> : exp.end_date && new Date(exp.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {exp.description && (
                                <div className="mb-4">
                                  <p className="text-gray-700 leading-relaxed">{exp.description}</p>
                                </div>
                              )}

                              {exp.responsibilities && exp.responsibilities.length > 0 && (
                                <div className="mb-4 bg-gray-50 rounded-lg p-4">
                                  <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    Key Responsibilities
                                  </p>
                                  <ul className="space-y-2">
                                    {exp.responsibilities.map((resp, ri) => (
                                      <li key={ri} className="flex items-start gap-2 text-sm text-gray-700">
                                        <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>{resp}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {exp.technologies && exp.technologies.length > 0 && (
                                <div className="pt-4 border-t border-gray-100">
                                  <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                    </svg>
                                    Technologies Used
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {exp.technologies.map((tech, ti) => (
                                      <span key={ti} className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200">
                                        {tech}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Navigation Arrows */}
                  {portfolio.experience.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentExpIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentExpIndex === 0}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
                        aria-label="Previous experience"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setCurrentExpIndex(prev => Math.min(portfolio.experience.length - 1, prev + 1))}
                        disabled={currentExpIndex === portfolio.experience.length - 1}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-gray-800 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
                        aria-label="Next experience"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Indicators */}
                  {portfolio.experience.length > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      {portfolio.experience.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentExpIndex(idx)}
                          className={`h-2 rounded-full transition-all duration-300 ${
                            idx === currentExpIndex 
                              ? 'w-8 bg-purple-600' 
                              : 'w-2 bg-gray-300 hover:bg-gray-400'
                          }`}
                          aria-label={`Go to experience ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-gray-400 py-12">No experience added yet</div>
              )}
            </div>
          </div>
        </section>

        {/* Blogs Section */}
        <section id="blogs" className="section-padding bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Blogs</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {portfolio.blogs.length > 0 ? (
                portfolio.blogs.map((blog, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {blog.cover_image && (
                      <img src={blog.cover_image} alt={blog.title} className="w-full h-48 object-cover" />
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold">{blog.title}</h3>
                      <p className="mt-2 text-gray-600">{blog.excerpt}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400">No blogs added yet</div>
              )}
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="section-padding bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Services</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {portfolio.services && portfolio.services.length > 0 ? (
                portfolio.services.map((service, i) => (
                  <div key={i} className="bg-gradient-to-br from-purple-50 to-white rounded-xl shadow-lg p-6 border border-purple-100">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    {service.features && service.features.length > 0 && (
                      <ul className="space-y-2 mb-4">
                        {service.features.map((feature, fi) => (
                          <li key={fi} className="flex items-start gap-2 text-sm text-gray-700">
                            <svg className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {service.price_range && (
                      <div className="mt-4 pt-4 border-t border-purple-100">
                        <p className="text-lg font-semibold text-purple-700">{service.price_range}</p>
                      </div>
                    )}
                    {!service.active && (
                      <span className="inline-block mt-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Inactive</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-400">No services added yet</div>
              )}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact-owner" className="section-padding bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Get in Touch</h2>
            <p className="text-center text-gray-600 mb-6">Send a message to {portfolio.about.name || 'the portfolio owner'}.</p>

            <form onSubmit={handleSendMessage} className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700">Your Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  rows={5}
                  className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                  placeholder="Write your message here"
                />
              </div>

              <div className="flex items-center justify-start">
                <button disabled={contactLoading} type="submit" className="btn-primary px-4 py-2">
                  {contactLoading ? 'Sending...' : 'Send Message'}
                </button>
              </div>

              {contactFeedback && (
                <div className={`p-3 rounded text-sm ${contactFeedback.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {contactFeedback.text}
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
