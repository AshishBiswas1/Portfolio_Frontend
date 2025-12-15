const About = () => {
  const features = [
    {
      icon: '🎨',
      title: 'Modern Design',
      description: 'Cutting-edge UI/UX principles with beautiful, responsive layouts that adapt to any device.'
    },
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Built with React and Vite for optimal performance and instant page loads.'
    },
    {
      icon: '📱',
      title: 'Fully Responsive',
      description: 'Seamlessly works across all devices - desktop, tablet, and mobile.'
    },
    {
      icon: '🔧',
      title: 'Easy Customization',
      description: 'Flexible CMS integration allows you to manage content effortlessly.'
    },
    {
      icon: '🚀',
      title: 'SEO Optimized',
      description: 'Built with best practices to help your portfolio rank higher in search results.'
    },
    {
      icon: '💎',
      title: 'Premium Quality',
      description: 'Professional-grade code and design that stands out from the crowd.'
    }
  ];

  return (
    <section id="about" className="section-padding bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About <span className="gradient-text">FolioForge</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We create stunning portfolio websites that help you showcase your work and connect with clients. Our platform combines powerful CMS capabilities with modern design.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 text-center text-white">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Your Portfolio?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of creators who trust FolioForge for their online presence
          </p>
          <button className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 text-lg">
            Start Your Journey
          </button>
        </div>
      </div>
    </section>
  );
};

export default About;
