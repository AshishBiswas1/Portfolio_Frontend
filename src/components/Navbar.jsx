import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Contact', href: '#footer' }
  ];

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : null
  }

  const deleteCookie = (name) => {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  const [userName, setUserName] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const readAuth = () => {
      const name = getCookie('AUTH_USER')
      setUserName(name)
    }

    readAuth()
    window.addEventListener('authChanged', readAuth)
    return () => window.removeEventListener('authChanged', readAuth)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-gray-900/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="#home" className="text-2xl md:text-3xl font-bold gradient-text">
              FolioForge
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 hover:bg-white/10"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* CTA Button / Auth */}
          <div className="hidden md:flex items-center gap-4">
            {userName ? (
              <>
                <span className="text-gray-200 font-medium">{userName}</span>
                <button
                  onClick={() => {
                    deleteCookie('AUTH_TOKEN')
                    deleteCookie('AUTH_USER')
                    window.dispatchEvent(new Event('authChanged'))
                    navigate('/')
                  }}
                  className="btn-ghost text-sm px-3 py-2 border border-white/10 rounded-md text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-primary">Get Started</Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-md">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors duration-300 hover:bg-white/10"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            {userName ? (
              <div className="px-3 py-2 w-full flex items-center justify-between">
                <span className="text-gray-200">{userName}</span>
                <button
                  onClick={() => {
                    deleteCookie('AUTH_TOKEN')
                    deleteCookie('AUTH_USER')
                    window.dispatchEvent(new Event('authChanged'))
                    setIsMobileMenuOpen(false)
                    navigate('/')
                  }}
                  className="btn-ghost text-sm px-3 py-2 border border-white/10 rounded-md text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="w-full mt-4 btn-primary block text-center">Get Started</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
