import React, { useRef } from 'react'
import { Link } from 'react-router-dom'

export default function PortfolioNavbar({ 
	onTogglePanel, 
	previewMode = false, 
	isPublished = false, 
	username = null, 
	onTogglePublish 
}) {
	const rootRef = useRef(null)

	const scrollTo = id => e => {
		e && e.preventDefault()
		const el = document.getElementById(id)
		if (!el) return
		const navHeight = rootRef.current ? rootRef.current.offsetHeight : 56
		const top = el.getBoundingClientRect().top + window.scrollY - navHeight
		window.scrollTo({ top, behavior: 'smooth' })
	}

	const handleViewPublished = () => {
		if (username) {
			window.open(`${window.location.origin}/${username}/publish`, '_blank')
		}
	}

	return (
		<div ref={rootRef} className="w-full sticky top-0 z-50 border-b border-white/10 shadow-sm" style={{ backgroundColor: '#111827' }}>
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center justify-between h-14">
					<nav className="flex items-center gap-4 overflow-x-auto no-scrollbar">
						<a href="#about" onClick={scrollTo('about')} className="text-gray-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium">About</a>
						<a href="#skills" onClick={scrollTo('skills')} className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Skills</a>
						<a href="#projects" onClick={scrollTo('projects')} className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Projects</a>
						<a href="#experience" onClick={scrollTo('experience')} className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Experience</a>
						<a href="#blogs" onClick={scrollTo('blogs')} className="text-gray-200 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Blogs</a>
					</nav>

					{!previewMode && (
						<div className="flex items-center gap-3">
							<button
								onClick={() => onTogglePanel && onTogglePanel()}
								className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-2 rounded-md"
							>
								Edit
							</button>
							<button onClick={() => window.open(`${window.location.origin}/preview`, '_blank')} className="text-sm text-gray-200 hover:text-white">Preview</button>
							<button 
								onClick={onTogglePublish}
								className={`text-sm px-3 py-2 rounded-md ${
									isPublished 
										? 'bg-red-600 hover:bg-red-700 text-white' 
										: 'bg-green-600 hover:bg-green-700 text-white'
								}`}
							>
								{isPublished ? 'Unpublish' : 'Publish'}
							</button>
							{isPublished && username && (
								<button 
									onClick={handleViewPublished}
									className="text-sm text-blue-400 hover:text-blue-300"
								>
									View
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

