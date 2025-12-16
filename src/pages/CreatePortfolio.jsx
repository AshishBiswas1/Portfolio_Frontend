import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PortfolioNavbar from '../components/PortfolioNavbar'

const API_BASE = import.meta.env.VITE_API_BASE_URL

function readTokenFromSources() {
  // Prefer localStorage, fallback to cookie
  try {
    const t = localStorage.getItem('AUTH_TOKEN')
    if (t) return t
  } catch (e) {}

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

export default function CreatePortfolio() {
  const token = useAuthToken()
  const navigate = useNavigate()
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  // Height of the portfolio navbar (matches h-14)
  const NAVBAR_HEIGHT = 56
  const [portfolio, setPortfolio] = useState({
    about: { name: '', designation: '', description: '', profile_image: '' },
    skills: [],
    projects: [],
    experience: [],
    blogs: [],
    services: []
  })
  const [isPublished, setIsPublished] = useState(false)
  const [username, setUsername] = useState(null)
  const [about, setAbout] = useState({ name: '', designation: '', description: '' })
  const [profileImage, setProfileImage] = useState(null)
  // Animation refs/state for floating image
  const heroImgRef = useRef(null)
  const descLeftRef = useRef(null)
  const floatingImgRef = useRef(null)
  const [floatingVisible, setFloatingVisible] = useState(false)
  const [floatingStyle, setFloatingStyle] = useState({ top: '0px', left: '0px', width: '0px', height: '0px', borderRadius: '9999px', opacity: 1, scale: 1, rotate: 0 })
  const [hideHeroImg, setHideHeroImg] = useState(false)
  const [hideDescImg, setHideDescImg] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  // Check authentication on mount with a short grace period in case token arrives shortly
  useEffect(() => {
    let t = null
    if (!token) {
      // wait a short time before showing not-logged-in to allow auth to propagate
      t = setTimeout(() => {
        setMessage({ type: 'error', text: 'You are not logged in. Please login to access this page.' })
        setTimeout(() => navigate('/login'), 1400)
      }, 600)
    }

    return () => {
      if (t) clearTimeout(t)
    }
  }, [token, navigate])

  useEffect(() => {
    if (!token) return
    // fetch portfolio data
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          if (data && data.data) {
            setPortfolio({
              about: data.data.about || { name: '', description: '', profile_image: '' },
              skills: data.data.skills || [],
              projects: data.data.projects || [],
              experience: data.data.experience || [],
              blogs: data.data.blogs || [],
              services: data.data.services || []
            })
            setAbout({
              name: data.data.about?.name || '',
              designation: data.data.about?.designation || '',
              description: data.data.about?.description || ''
            })
            setIsPublished(data.data.is_published || false)
            setUsername(data.data.username || null)
          }
        }
      } catch (err) {
        console.error('Fetch portfolio error', err)
      }
    })()
  }, [token])

  // Update preview immediately when about form changes
  useEffect(() => {
    setPortfolio(prev => ({
      ...prev,
      about: {
        ...prev.about,
        name: about.name,
        description: about.description
      }
    }))
  }, [about])

  // Animate hero image -> left of description (and back) on scroll
  useLayoutEffect(() => {
    if (!portfolio.about.profile_image) return
    const descSection = document.getElementById('about-desc')
    if (!descSection || !heroImgRef.current || !descLeftRef.current) return

    let timer = null

    const rect = el => el.getBoundingClientRect()

    const startAnimation = (fromEl, toEl, toLeft) => {
      const from = rect(fromEl)
      const to = rect(toEl)

      // Calculate diagonal path with curve (bezier-like intermediate points)
      const deltaX = to.left - from.left
      const deltaY = to.top - from.top
      const deltaW = to.width - from.width
      const deltaH = to.height - from.height

      // Hide source immediately
      if (toLeft) {
        setHideHeroImg(true)
      } else {
        setHideDescImg(true)
      }

      // Set floating to source with scale and rotation for diagonal start
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

      // Animate along diagonal path with intermediate keyframes
      let progress = 0
      const steps = 60 // Smooth 60-step animation
      const stepDuration = 850 / steps

      const animateStep = () => {
        progress += 1 / steps
        if (progress > 1) progress = 1

        // Easing function for smooth acceleration/deceleration
        const eased = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2

        // Add curve to path (parabolic arc for natural diagonal motion)
        const curve = Math.sin(eased * Math.PI) * 0.15 // 15% curve amplitude
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
          // Complete: fade out and show destination
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
          // description visible: move hero -> left description
          startAnimation(heroImgRef.current, descLeftRef.current, true)
        } else {
          // description not visible: move from desc -> hero
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
  const handleAboutSubmit = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'You must be logged in' })
    setLoading(true)
    setMessage(null)
    try {
      const form = new FormData()
      if (about.name) form.append('name', about.name)
      if (about.designation) form.append('designation', about.designation)
      if (about.description) form.append('description', about.description)
      if (profileImage) form.append('profile_image', profileImage)

      const res = await fetch(`${API_BASE}/about`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessage({ type: 'success', text: 'About saved' })
      // refresh portfolio
      const p = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${token}` } })
      if (p.ok) {
        const pd = await p.json()
        if (pd?.data) {
          setPortfolio({
            about: pd.data.about || portfolio.about,
            skills: pd.data.skills || [],
            projects: pd.data.projects || [],
            experience: pd.data.experience || [],
            blogs: pd.data.blogs || []
          })
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const createPlaceholder = async (route, payload) => {
    if (!token) return setMessage({ type: 'error', text: 'Login required' })
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessage({ type: 'success', text: `${route} item created` })
      // refresh
      const p = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${token}` } })
      if (p.ok) {
        const pd = await p.json()
        if (pd?.data) {
          setPortfolio({
            about: pd.data.about || portfolio.about,
            skills: pd.data.skills || [],
            projects: pd.data.projects || [],
            experience: pd.data.experience || [],
            blogs: pd.data.blogs || []
          })
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Local UI state for add-forms
  const [activeTab, setActiveTab] = useState('skill')
  const [editMode, setEditMode] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)
  const [skillForm, setSkillForm] = useState({ name: '', category: '', proficiency: 50, order_index: 0 })
  const [projectForm, setProjectForm] = useState({ 
    title: '', 
    description: '', 
    long_description: '', 
    demo_url: '', 
    github_url: '', 
    technologies: '', 
    category: '', 
    featured: false, 
    order_index: 0, 
    image: null 
  })
  const [expForm, setExpForm] = useState({ 
    company: '', 
    position: 'Student', 
    location: '', 
    employment_type: '', 
    start_date: '', 
    end_date: '', 
    is_current: false, 
    description: '', 
    responsibilities: '', 
    technologies: '' 
  })
  const [blogForm, setBlogForm] = useState({ 
    title: '', 
    excerpt: '', 
    content: '', 
    author: '', 
    tags: '', 
    published: false, 
    published_at: '', 
    cover: null 
  })
  const [serviceForm, setServiceForm] = useState({
    title: '',
    description: '',
    features: '',
    price_range: '',
    active: true,
    order_index: 0
  })

  // Contact form state (message to portfolio owner)
  const [contactEmail, setContactEmail] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [contactFeedback, setContactFeedback] = useState(null)

  const refreshPortfolio = async () => {
    if (!token) return
    try {
      const p = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${token}` } })
      if (p.ok) {
        const pd = await p.json()
        if (pd?.data) {
          setPortfolio({
            about: pd.data.about || portfolio.about,
            skills: pd.data.skills || [],
            projects: pd.data.projects || [],
            experience: pd.data.experience || [],
            blogs: pd.data.blogs || [],
            services: pd.data.services || []
          })
        }
      }
    } catch (err) {
      console.error('refresh portfolio', err)
    }
  }

  const handleEditSkill = (skill) => {
    setSkillForm({
      name: skill.name || '',
      category: skill.category || '',
      proficiency: skill.proficiency || 50,
      order_index: skill.order_index || 0
    })
    setSelectedItemId(skill.id)
    setEditMode(true)
    setActiveTab('skill')
  }

  const handleAddSkill = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'Login required' })
    
    if (editMode && selectedItemId) {
      // Update existing skill
      setLoading(true)
      setMessage(null)
      try {
        const res = await fetch(`${API_BASE}/update/skills/${selectedItemId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: skillForm.name,
            category: skillForm.category || null,
            proficiency: skillForm.proficiency,
            order_index: skillForm.order_index || 0
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || 'Failed to update skill')
        setMessage({ type: 'success', text: 'Skill updated' })
        await refreshPortfolio()
        setSkillForm({ name: '', category: '', proficiency: 50, order_index: 0 })
        setEditMode(false)
        setSelectedItemId(null)
      } catch (err) {
        setMessage({ type: 'error', text: err.message })
      } finally {
        setLoading(false)
      }
    } else {
      // Add new skill
      await createPlaceholder('skills', { 
        name: skillForm.name, 
        category: skillForm.category || null,
        proficiency: skillForm.proficiency,
        order_index: skillForm.order_index || 0
      })
      setSkillForm({ name: '', category: '', proficiency: 50, order_index: 0 })
    }
  }

  const handleEditProject = (project) => {
    setProjectForm({
      title: project.title || '',
      description: project.description || '',
      long_description: project.long_description || '',
      demo_url: project.demo_url || '',
      github_url: project.github_url || '',
      technologies: project.technologies || '',
      category: project.category || '',
      featured: project.featured || false,
      order_index: project.order_index || 0,
      image: null
    })
    setSelectedItemId(project.id)
    setEditMode(true)
    setActiveTab('project')
  }

  const handleAddProject = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'Login required' })
    setLoading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      if (projectForm.title) fd.append('title', projectForm.title)
      if (projectForm.description) fd.append('description', projectForm.description)
      if (projectForm.long_description) fd.append('long_description', projectForm.long_description)
      if (projectForm.demo_url) fd.append('demo_url', projectForm.demo_url)
      if (projectForm.github_url) fd.append('github_url', projectForm.github_url)
      if (projectForm.technologies) fd.append('technologies', projectForm.technologies)
      if (projectForm.category) fd.append('category', projectForm.category)
      fd.append('featured', projectForm.featured)
      fd.append('order_index', projectForm.order_index || 0)
      if (projectForm.image) fd.append('image', projectForm.image)

      const url = editMode && selectedItemId ? `${API_BASE}/update/projects/${selectedItemId}` : `${API_BASE}/project`
      const method = editMode && selectedItemId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessage({ type: 'success', text: editMode ? 'Project updated' : 'Project added' })
      await refreshPortfolio()
      setProjectForm({ 
        title: '', 
        description: '', 
        long_description: '', 
        demo_url: '', 
        github_url: '', 
        technologies: '', 
        category: '', 
        featured: false, 
        order_index: 0, 
        image: null 
      })
      setEditMode(false)
      setSelectedItemId(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEditExperience = (exp) => {
    setExpForm({
      company: exp.company || '',
      position: exp.position || 'Student',
      location: exp.location || '',
      employment_type: exp.employment_type || '',
      start_date: exp.start_date || '',
      end_date: exp.end_date || '',
      is_current: exp.is_current || false,
      description: exp.description || '',
      responsibilities: exp.responsibilities || '',
      technologies: exp.technologies || ''
    })
    setSelectedItemId(exp.id)
    setEditMode(true)
    setActiveTab('experience')
  }

  const handleAddExperience = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'Login required' })
    setLoading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      if (expForm.company) fd.append('company', expForm.company)
      if (expForm.position) fd.append('position', expForm.position)
      if (expForm.location) fd.append('location', expForm.location)
      if (expForm.employment_type) fd.append('employment_type', expForm.employment_type)
      if (expForm.start_date) fd.append('start_date', expForm.start_date)
      if (expForm.end_date) fd.append('end_date', expForm.end_date)
      fd.append('is_current', expForm.is_current)
      if (expForm.description) fd.append('description', expForm.description)
      if (expForm.responsibilities) fd.append('responsibilities', expForm.responsibilities)
      if (expForm.technologies) fd.append('technologies', expForm.technologies)

      const url = editMode && selectedItemId ? `${API_BASE}/update/experience/${selectedItemId}` : `${API_BASE}/experience`
      const method = editMode && selectedItemId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessage({ type: 'success', text: editMode ? 'Experience updated' : 'Experience added' })
      await refreshPortfolio()
      setExpForm({ 
        company: '', 
        position: 'Student', 
        location: '', 
        employment_type: '', 
        start_date: '', 
        end_date: '', 
        is_current: false, 
        description: '', 
        responsibilities: '', 
        technologies: '' 
      })
      setEditMode(false)
      setSelectedItemId(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEditBlog = (blog) => {
    setBlogForm({
      title: blog.title || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      author: blog.author || '',
      tags: blog.tags || '',
      published: blog.published || false,
      published_at: blog.published_at || '',
      cover: null
    })
    setSelectedItemId(blog.id)
    setEditMode(true)
    setActiveTab('blog')
  }

  const handleAddBlog = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'Login required' })
    setLoading(true)
    setMessage(null)
    try {
      const fd = new FormData()
      if (blogForm.title) fd.append('title', blogForm.title)
      if (blogForm.excerpt) fd.append('excerpt', blogForm.excerpt)
      if (blogForm.content) fd.append('content', blogForm.content)
      if (blogForm.author) fd.append('author', blogForm.author)
      if (blogForm.tags) fd.append('tags', blogForm.tags)
      fd.append('published', blogForm.published)
      if (blogForm.published_at) fd.append('published_at', blogForm.published_at)
      if (blogForm.cover) fd.append('cover_image', blogForm.cover)

      const url = editMode && selectedItemId ? `${API_BASE}/update/blogs/${selectedItemId}` : `${API_BASE}/blogs`
      const method = editMode && selectedItemId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method: method,
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessage({ type: 'success', text: editMode ? 'Blog updated' : 'Blog added' })
      await refreshPortfolio()
      setBlogForm({ 
        title: '', 
        excerpt: '', 
        content: '', 
        author: '', 
        tags: '', 
        published: false, 
        published_at: '', 
        cover: null 
      })
      setEditMode(false)
      setSelectedItemId(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEditService = (service) => {
    setServiceForm({
      title: service.title || '',
      description: service.description || '',
      features: Array.isArray(service.features) ? service.features.join(', ') : '',
      price_range: service.price_range || '',
      active: service.active !== undefined ? service.active : true,
      order_index: service.order_index || 0
    })
    setSelectedItemId(service.id)
    setEditMode(true)
    setActiveTab('service')
  }

  const handleAddService = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'Login required' })
    setLoading(true)
    setMessage(null)
    try {
      const payload = {
        title: serviceForm.title,
        description: serviceForm.description,
        features: serviceForm.features ? serviceForm.features.split(',').map(f => f.trim()) : [],
        price_range: serviceForm.price_range,
        active: serviceForm.active,
        order_index: serviceForm.order_index || 0
      }

      const url = editMode && selectedItemId ? `${API_BASE}/update/services/${selectedItemId}` : `${API_BASE}/services`
      const method = editMode && selectedItemId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed')
      setMessage({ type: 'success', text: editMode ? 'Service updated' : 'Service added' })
      await refreshPortfolio()
      setServiceForm({
        title: '',
        description: '',
        features: '',
        price_range: '',
        active: true,
        order_index: 0
      })
      setEditMode(false)
      setSelectedItemId(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  // Contact owner handler
  const handleSendMessage = async e => {
    e.preventDefault()
    setContactFeedback(null)
    if (!contactEmail || !contactMessage) return setContactFeedback({ type: 'error', text: 'Email and message are required' })
    // simple email check
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    if (!emailOk) return setContactFeedback({ type: 'error', text: 'Enter a valid email' })

    // The receiver_id should be the owner id of the portfolio.
    // The backend stores owner on the about row as `user_id`.
    const receiver_id = portfolio?.about?.user_id || portfolio?.about?.id

    if (!receiver_id) return setContactFeedback({ type: 'error', text: 'Unable to determine portfolio owner id (missing about.user_id)' })

    setContactLoading(true)
    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_email: contactEmail, message: contactMessage, receiver_id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to send message')
      setContactFeedback({ type: 'success', text: 'Message sent to the portfolio owner' })
      setContactEmail('')
      setContactMessage('')
    } catch (err) {
      setContactFeedback({ type: 'error', text: err.message })
    } finally {
      setContactLoading(false)
    }
  }

  // Toggle publish status
  const handleTogglePublish = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/publish`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to toggle publish status')
      
      setIsPublished(data.data.is_published)
      setMessage({ 
        type: 'success', 
        text: data.data.is_published ? 'Portfolio published successfully!' : 'Portfolio unpublished' 
      })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Authentication Alert */}
      {message && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] max-w-md w-full mx-4 p-4 rounded-lg shadow-lg ${
          message.type === 'error' ? 'bg-red-50 border-2 border-red-500' : 'bg-green-50 border-2 border-green-500'
        }`}>
          <div className="flex items-center gap-3">
            {message.type === 'error' ? (
              <svg className="w-6 h-6 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${message.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                {message.text}
              </p>
            </div>
            <button
              onClick={() => setMessage(null)}
              className={`flex-shrink-0 ${message.type === 'error' ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Portfolio navbar (portfolio-only) */}
      <PortfolioNavbar 
        onTogglePanel={() => setIsPanelOpen(prev => !prev)} 
        isPublished={isPublished}
        username={username}
        onTogglePublish={handleTogglePublish}
      />

      {/* Floating animated image used to move from hero -> left of description */}
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

      {/* Toggle Button removed — side panel opens via PortfolioNavbar Edit button */}

      {/* Full Page Preview */}
      <div
        className={`w-full transition-all duration-300 ${isPanelOpen ? 'pr-80' : 'pr-0'}`}
        style={{ marginTop: `-${NAVBAR_HEIGHT}px` }}
      >
        {/* Hero Section */}
        <section id="about" className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: (kept for text) we want hero image on right visually but will animate to left of description */}
              <div className="text-white space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold gradient-text">
                  {portfolio.about.name || 'Your Name'}
                </h1>
                {portfolio.about.designation && (
                  <p className="text-sm md:text-base text-purple-300 font-medium">{portfolio.about.designation}</p>
                )}
              </div>

              {/* Right: Profile Image (initial hero image) */}
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
                    <span className="text-white/50 text-lg">Upload Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Description Section (below hero) */}
        <section id="about-desc" className="section-padding bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Left placeholder where image will move to (LEFT of description) */}
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

        {/* Contact / Message Section */}
        <section id="contact-owner" className="section-padding bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-6">Contact the Owner</h2>
            <p className="text-center text-gray-600 mb-6">Send a message to the owner of this portfolio.</p>

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

      {/* Edit Side Panel */}
      <div
        className={`fixed right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ top: `${NAVBAR_HEIGHT}px`, height: `calc(100% - ${NAVBAR_HEIGHT}px)` }}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Edit Portfolio</h2>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
            >
              ← Back to Home
            </button>
          </div>
          {/* About Form */}
          <form onSubmit={handleAboutSubmit} className="space-y-4">
            <h3 className="font-medium">About Section</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                value={about.name}
                onChange={e => setAbout({ ...about, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Designation</label>
              <input
                value={about.designation}
                onChange={e => setAbout({ ...about, designation: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={about.description}
                onChange={e => setAbout({ ...about, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 p-2"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setProfileImage(e.target.files[0])}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {profileImage && (
                <p className="mt-2 text-sm text-gray-600">Selected: {profileImage.name}</p>
              )}
            </div>
            <button disabled={loading} type="submit" className="btn-primary w-full">
              {loading ? 'Saving...' : 'Save About'}
            </button>
          </form>

          <hr />

          {/* Add Items */}
          <div>
            <h3 className="font-medium mb-3">Add Item</h3>

            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setActiveTab('skill')} className={`px-3 py-1 rounded text-sm ${activeTab==='skill' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-700'}`}>Skill</button>
                <button type="button" onClick={() => setActiveTab('project')} className={`px-3 py-1 rounded text-sm ${activeTab==='project' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-700'}`}>Project</button>
                <button type="button" onClick={() => setActiveTab('experience')} className={`px-3 py-1 rounded text-sm ${activeTab==='experience' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-700'}`}>Experience</button>
                <button type="button" onClick={() => setActiveTab('blog')} className={`px-3 py-1 rounded text-sm ${activeTab==='blog' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-700'}`}>Blog</button>
                <button type="button" onClick={() => setActiveTab('service')} className={`px-3 py-1 rounded text-sm ${activeTab==='service' ? 'bg-gray-200 text-gray-900' : 'bg-white text-gray-700'}`}>Service</button>
              </div>
            </div>

            {activeTab === 'skill' && (
              <>
                <form onSubmit={handleAddSkill} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Skill Name*</label>
                    <input required value={skillForm.name} onChange={e=>setSkillForm({...skillForm,name:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input value={skillForm.category} onChange={e=>setSkillForm({...skillForm,category:e.target.value})} placeholder="e.g., Frontend, Backend" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Proficiency (%)</label>
                    <input type="number" min="0" max="100" value={skillForm.proficiency} onChange={e=>setSkillForm({...skillForm,proficiency:parseInt(e.target.value||0)})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order Index</label>
                    <input type="number" min="0" value={skillForm.order_index} onChange={e=>setSkillForm({...skillForm,order_index:parseInt(e.target.value||0)})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                  </div>
                  <div className="flex gap-2">
                    <button disabled={loading} type="submit" className="flex-1 btn-primary text-sm py-2">
                      {loading ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update' : 'Add')}
                    </button>
                    {editMode && (
                      <button type="button" onClick={() => { setEditMode(false); setSelectedItemId(null); setSkillForm({ name: '', category: '', proficiency: 50, order_index: 0 }); }} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm">
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Skills</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {portfolio.skills && portfolio.skills.length > 0 ? (
                      portfolio.skills.map((skill, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span>{skill.name}</span>
                          <button type="button" onClick={() => handleEditSkill(skill)} className="text-purple-600 hover:text-purple-800 text-xs">
                            Edit
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400">No skills yet</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'project' && (
              <>
              <form onSubmit={handleAddProject} className="space-y-3 max-h-96 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title*</label>
                  <input required value={projectForm.title} onChange={e=>setProjectForm({...projectForm,title:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Short Description</label>
                  <textarea value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={2} placeholder="Brief summary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Long Description</label>
                  <textarea value={projectForm.long_description} onChange={e=>setProjectForm({...projectForm,long_description:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={3} placeholder="Detailed description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Demo URL</label>
                  <input type="url" value={projectForm.demo_url} onChange={e=>setProjectForm({...projectForm,demo_url:e.target.value})} placeholder="https://..." className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">GitHub URL</label>
                  <input type="url" value={projectForm.github_url} onChange={e=>setProjectForm({...projectForm,github_url:e.target.value})} placeholder="https://github.com/..." className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Technologies (comma-separated)</label>
                  <input value={projectForm.technologies} onChange={e=>setProjectForm({...projectForm,technologies:e.target.value})} placeholder="React, Node.js, MongoDB" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input value={projectForm.category} onChange={e=>setProjectForm({...projectForm,category:e.target.value})} placeholder="Web App, Mobile, etc." className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="proj-featured" checked={projectForm.featured} onChange={e=>setProjectForm({...projectForm,featured:e.target.checked})} className="rounded" />
                  <label htmlFor="proj-featured" className="text-sm font-medium text-gray-700">Featured Project</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Index</label>
                  <input type="number" min="0" value={projectForm.order_index} onChange={e=>setProjectForm({...projectForm,order_index:parseInt(e.target.value||0)})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input type="file" accept="image/*" onChange={e=>setProjectForm({...projectForm,image:e.target.files[0]})} className="mt-1 block w-full text-sm text-gray-500" />
                </div>
                <div className="flex gap-2">
                  <button disabled={loading} type="submit" className="flex-1 btn-primary text-sm py-2">
                    {loading ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update' : 'Add')}
                  </button>
                  {editMode && (
                    <button type="button" onClick={() => { setEditMode(false); setSelectedItemId(null); setProjectForm({ title: '', description: '', long_description: '', demo_url: '', github_url: '', technologies: '', category: '', featured: false, order_index: 0, image: null }); }} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Projects</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {portfolio.projects && portfolio.projects.length > 0 ? (
                    portfolio.projects.map((project, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{project.title}</span>
                        <button type="button" onClick={() => handleEditProject(project)} className="text-purple-600 hover:text-purple-800 text-xs">
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No projects yet</p>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'experience' && (
              <>
              <form onSubmit={handleAddExperience} className="space-y-3 max-h-96 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company*</label>
                  <input required value={expForm.company} onChange={e=>setExpForm({...expForm,company:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <input value={expForm.position} onChange={e=>setExpForm({...expForm,position:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input value={expForm.location} onChange={e=>setExpForm({...expForm,location:e.target.value})} placeholder="City, Country" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employment Type</label>
                  <select value={expForm.employment_type} onChange={e=>setExpForm({...expForm,employment_type:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2">
                    <option value="">Select type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <input type="date" value={expForm.start_date} onChange={e=>setExpForm({...expForm,start_date:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input type="date" value={expForm.end_date} onChange={e=>setExpForm({...expForm,end_date:e.target.value})} disabled={expForm.is_current} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="exp-current" checked={expForm.is_current} onChange={e=>setExpForm({...expForm,is_current:e.target.checked, end_date: e.target.checked ? '' : expForm.end_date})} className="rounded" />
                  <label htmlFor="exp-current" className="text-sm font-medium text-gray-700">Currently working here</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={expForm.description} onChange={e=>setExpForm({...expForm,description:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={2} placeholder="Brief overview" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Responsibilities</label>
                  <textarea value={expForm.responsibilities} onChange={e=>setExpForm({...expForm,responsibilities:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={3} placeholder="Key responsibilities (one per line or comma-separated)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Technologies Used</label>
                  <input value={expForm.technologies} onChange={e=>setExpForm({...expForm,technologies:e.target.value})} placeholder="React, Node.js, AWS" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div className="flex gap-2">
                  <button disabled={loading} type="submit" className="flex-1 btn-primary text-sm py-2">
                    {loading ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update' : 'Add')}
                  </button>
                  {editMode && (
                    <button type="button" onClick={() => { setEditMode(false); setSelectedItemId(null); setExpForm({ company: '', position: 'Student', location: '', employment_type: '', start_date: '', end_date: '', is_current: false, description: '', responsibilities: '', technologies: '' }); }} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Experience</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {portfolio.experience && portfolio.experience.length > 0 ? (
                    portfolio.experience.map((exp, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{exp.position} at {exp.company}</span>
                        <button type="button" onClick={() => handleEditExperience(exp)} className="text-purple-600 hover:text-purple-800 text-xs">
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No experience yet</p>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'blog' && (
              <>
              <form onSubmit={handleAddBlog} className="space-y-3 max-h-96 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title*</label>
                  <input required value={blogForm.title} onChange={e=>setBlogForm({...blogForm,title:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Excerpt</label>
                  <textarea value={blogForm.excerpt} onChange={e=>setBlogForm({...blogForm,excerpt:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={2} placeholder="Short summary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Content</label>
                  <textarea value={blogForm.content} onChange={e=>setBlogForm({...blogForm,content:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={4} placeholder="Full blog content" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Author</label>
                  <input value={blogForm.author} onChange={e=>setBlogForm({...blogForm,author:e.target.value})} placeholder="Author name" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input value={blogForm.tags} onChange={e=>setBlogForm({...blogForm,tags:e.target.value})} placeholder="React, JavaScript, Tutorial" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="blog-published" checked={blogForm.published} onChange={e=>setBlogForm({...blogForm,published:e.target.checked})} className="rounded" />
                  <label htmlFor="blog-published" className="text-sm font-medium text-gray-700">Publish immediately</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Publish Date</label>
                  <input type="datetime-local" value={blogForm.published_at} onChange={e=>setBlogForm({...blogForm,published_at:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cover Image</label>
                  <input type="file" accept="image/*" onChange={e=>setBlogForm({...blogForm,cover:e.target.files[0]})} className="mt-1 block w-full text-sm text-gray-500" />
                </div>
                <div className="flex gap-2">
                  <button disabled={loading} type="submit" className="flex-1 btn-primary text-sm py-2">
                    {loading ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update' : 'Add')}
                  </button>
                  {editMode && (
                    <button type="button" onClick={() => { setEditMode(false); setSelectedItemId(null); setBlogForm({ title: '', excerpt: '', content: '', author: '', tags: '', published: false, published_at: '', cover: null }); }} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Blogs</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {portfolio.blogs && portfolio.blogs.length > 0 ? (
                    portfolio.blogs.map((blog, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{blog.title}</span>
                        <button type="button" onClick={() => handleEditBlog(blog)} className="text-purple-600 hover:text-purple-800 text-xs">
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No blogs yet</p>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'service' && (
              <>
              <form onSubmit={handleAddService} className="space-y-3 max-h-96 overflow-y-auto pr-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Title*</label>
                  <input required value={serviceForm.title} onChange={e=>setServiceForm({...serviceForm,title:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea value={serviceForm.description} onChange={e=>setServiceForm({...serviceForm,description:e.target.value})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" rows={3} placeholder="Service description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Features (comma-separated)</label>
                  <input value={serviceForm.features} onChange={e=>setServiceForm({...serviceForm,features:e.target.value})} placeholder="Responsive design, SEO optimization" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price Range</label>
                  <input value={serviceForm.price_range} onChange={e=>setServiceForm({...serviceForm,price_range:e.target.value})} placeholder="$500 - $2000" className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="service-active" checked={serviceForm.active} onChange={e=>setServiceForm({...serviceForm,active:e.target.checked})} className="rounded" />
                  <label htmlFor="service-active" className="text-sm font-medium text-gray-700">Active Service</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Index</label>
                  <input type="number" min="0" value={serviceForm.order_index} onChange={e=>setServiceForm({...serviceForm,order_index:parseInt(e.target.value||0)})} className="mt-1 block w-full rounded-md border border-gray-300 p-2" />
                </div>
                <div className="flex gap-2">
                  <button disabled={loading} type="submit" className="flex-1 btn-primary text-sm py-2">
                    {loading ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update' : 'Add')}
                  </button>
                  {editMode && (
                    <button type="button" onClick={() => { setEditMode(false); setSelectedItemId(null); setServiceForm({ title: '', description: '', features: '', price_range: '', active: true, order_index: 0 }); }} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Services</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {portfolio.services && portfolio.services.length > 0 ? (
                    portfolio.services.map((service, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{service.title}</span>
                        <button type="button" onClick={() => handleEditService(service)} className="text-purple-600 hover:text-purple-800 text-xs">
                          Edit
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No services yet</p>
                  )}
                </div>
              </div>
              </>
            )}
          </div>

          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
