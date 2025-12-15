import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:8000/user'

function useAuthToken() {
  return localStorage.getItem('AUTH_TOKEN')
}

export default function CreatePortfolio() {
  const token = useAuthToken()
  const navigate = useNavigate()
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const [portfolio, setPortfolio] = useState({
    about: { name: '', description: '', profile_image: '' },
    skills: [],
    projects: [],
    experience: [],
    blogs: []
  })
  const [about, setAbout] = useState({ name: '', description: '' })
  const [profileImage, setProfileImage] = useState(null)
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

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
              blogs: data.data.blogs || []
            })
            setAbout({
              name: data.data.about?.name || '',
              description: data.data.about?.description || ''
            })
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
  const handleAboutSubmit = async e => {
    e.preventDefault()
    if (!token) return setMessage({ type: 'error', text: 'You must be logged in' })
    setLoading(true)
    setMessage(null)
    try {
      const form = new FormData()
      if (about.name) form.append('name', about.name)
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

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="fixed top-4 right-4 z-50 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-all"
      >
        {isPanelOpen ? '✕' : '✎'}
      </button>

      {/* Full Page Preview */}
      <div className={`w-full transition-all duration-300 ${isPanelOpen ? 'pr-80' : 'pr-0'}`}>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
          <div className="max-w-7xl mx-auto px-4 w-full">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Left: Name and Description */}
              <div className="text-white space-y-6">
                <h1 className="text-5xl md:text-7xl font-bold gradient-text">
                  {portfolio.about.name || 'Your Name'}
                </h1>
                <p className="text-xl md:text-2xl text-gray-300">
                  {portfolio.about.description || 'Your description goes here'}
                </p>
              </div>
              
              {/* Right: Profile Image */}
              <div className="flex justify-center md:justify-end">
                {portfolio.about.profile_image ? (
                  <img
                    src={portfolio.about.profile_image}
                    alt="Profile"
                    className="w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-white/30 object-cover shadow-2xl"
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

        {/* Skills Section */}
        <section className="section-padding bg-white">
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
        <section className="section-padding bg-gray-50">
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
        <section className="section-padding bg-white">
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
        <section className="section-padding bg-gray-50">
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
      </div>

      {/* Edit Side Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 z-40 overflow-y-auto ${
          isPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
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

          {/* Quick Add Buttons */}
          <div>
            <h3 className="font-medium mb-3">Quick Add</h3>
            <div className="space-y-2">
              <button
                onClick={() => createPlaceholder('skills', { name: 'New Skill', proficiency: 80 })}
                className="w-full btn-primary text-sm py-2"
              >
                Add Skill
              </button>
              <button
                onClick={() => createPlaceholder('project', { title: 'New Project', description: 'Project description' })}
                className="w-full btn-primary text-sm py-2"
              >
                Add Project
              </button>
              <button
                onClick={() => createPlaceholder('experience', { company: 'Company Name', position: 'Role' })}
                className="w-full btn-primary text-sm py-2"
              >
                Add Experience
              </button>
              <button
                onClick={() => createPlaceholder('blogs', { title: 'Blog Title', content: 'Blog content...' })}
                className="w-full btn-primary text-sm py-2"
              >
                Add Blog
              </button>
            </div>
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
