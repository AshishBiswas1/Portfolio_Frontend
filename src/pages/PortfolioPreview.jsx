import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import PortfolioNavbar from '../components/PortfolioNavbar'

const API_BASE = import.meta.env.VITE_API_BASE_URL

function readTokenFromSources() {
  // Prefer localStorage, fallback to cookie
  try {
    const t = localStorage.getItem('AUTH_TOKEN')
    if (t) return t
  } catch (e) {}

  // Read cookie
  try {
    const m = document.cookie.match(new RegExp('(^| )' + 'AUTH_TOKEN' + '=([^;]+)'))
    if (m) return decodeURIComponent(m[2])
  } catch (e) {}

  return null
}

function useAuthToken() {
  const [token, setToken] = useState(() => readTokenFromSources())

  useEffect(() => {
    const onAuth = () => setToken(readTokenFromSources())
    window.addEventListener('authChanged', onAuth)
    return () => window.removeEventListener('authChanged', onAuth)
  }, [])

  return token
}

export default function PortfolioPreview() {
  const token = useAuthToken()
  const NAVBAR_HEIGHT = 56
  const [portfolio, setPortfolio] = useState({
    about: { name: '', designation: '', description: '', profile_image: '' },
    skills: [],
    projects: [],
    experience: [],
    blogs: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Animation refs/state for floating image (same as CreatePortfolio)
  const heroImgRef = useRef(null)
  const descLeftRef = useRef(null)
  const floatingImgRef = useRef(null)
  const [floatingVisible, setFloatingVisible] = useState(false)
  const [floatingStyle, setFloatingStyle] = useState({ top: '0px', left: '0px', width: '0px', height: '0px', borderRadius: '9999px', opacity: 1, scale: 1, rotate: 0 })
  const [hideHeroImg, setHideHeroImg] = useState(false)
  const [hideDescImg, setHideDescImg] = useState(false)

  useEffect(() => {
    let timer = null
    if (!token) {
      timer = setTimeout(() => {
        setError('You must be logged in to preview your portfolio')
        setLoading(false)
      }, 600)
      return () => clearTimeout(timer)
    }

    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/portfolio`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || 'Could not fetch portfolio')
        }
        const data = await res.json()
        setPortfolio({
          about: data.data?.about || { name: '', designation: '', description: '', profile_image: '' },
          skills: data.data?.skills || [],
          projects: data.data?.projects || [],
          experience: data.data?.experience || [],
          blogs: data.data?.blogs || []
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

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

  if (loading) return <div className="p-8">Loading preview...</div>
  if (error) return <div className="p-8 text-red-600">{error}</div>

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* PortfolioNavbar without Edit/Preview buttons */}
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

      {/* Full Page Preview */}
      <div className="w-full" style={{ marginTop: `-${NAVBAR_HEIGHT}px` }}>
        {/* Hero Section */}
        <section id="about" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-white space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold gradient-text">
                  {portfolio.about.name || 'Your Name'}
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
                <p className="text-base leading-relaxed text-black">{portfolio.about.description || 'Your description goes here'}</p>
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
        <section id="experience" className="section-padding bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">Experience</h2>
            <div className="space-y-8">
              {portfolio.experience.length > 0 ? (
                portfolio.experience.map((exp, i) => (
                  <div key={i} className="glass-effect p-6 rounded-xl">
                    <h3 className="text-2xl font-bold">{exp.position}</h3>
                    <p className="text-lg text-gray-600">{exp.company}</p>
                    <p className="mt-2 text-gray-500">{exp.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400">No experience added yet</div>
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

        {/* Contact Section */}
        <section id="contact-owner" className="section-padding bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Contact the Owner</h2>
            <p className="text-center text-gray-600 mb-6">This is a preview. Contact form available on published portfolio.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
