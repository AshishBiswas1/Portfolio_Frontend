import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [message, setMessage] = useState(null)

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')

      if (data.token) {
        try {
          const maxAge = data.expires_in ?? data.data?.session?.expires_in ?? 604800
          // Set token cookie
          document.cookie = `AUTH_TOKEN=${data.token}; path=/; max-age=${maxAge}; samesite=Lax`
          // Save user name in cookie if available
          const name = data.data?.user?.user_metadata?.name ?? data.data?.session?.user?.user_metadata?.name
          if (name) {
            document.cookie = `AUTH_USER=${encodeURIComponent(name)}; path=/; max-age=${maxAge}; samesite=Lax`
          }
        } catch (cookieErr) {
          // ignore cookie errors
        }

        // Notify other parts of the app that auth changed
        window.dispatchEvent(new Event('authChanged'))

        setMessage({ type: 'success', text: 'Login successful!' })
        setTimeout(() => navigate('/'), 1000)
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link to="/" className="text-4xl font-bold gradient-text inline-block">
            FolioForge
          </Link>
          <p className="mt-2 text-gray-300">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="glass-effect rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            {message && (
              <div
                className={`p-4 rounded-lg text-sm font-medium ${
                  message.type === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-green-500/20 text-green-300 border border-green-500/30'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300 text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-gray-400 hover:text-gray-300 text-sm transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
