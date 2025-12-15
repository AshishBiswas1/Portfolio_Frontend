const Reviews = () => {
  const reviews = [
    {
      name: 'Sarah Johnson',
      role: 'UI/UX Designer',
      image: '👩‍💼',
      rating: 5,
      text: 'FolioForge transformed my portfolio completely! The design is stunning and the CMS makes updating content a breeze. Highly recommended!'
    },
    {
      name: 'Michael Chen',
      role: 'Full Stack Developer',
      image: '👨‍💻',
      rating: 5,
      text: 'The best portfolio platform I\'ve used. Clean code, modern design, and excellent performance. My clients are impressed!'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Graphic Designer',
      image: '👩‍🎨',
      rating: 5,
      text: 'Amazing experience! The responsive design works flawlessly on all devices. I\'ve received multiple job offers since launching my new portfolio.'
    },
    {
      name: 'David Kim',
      role: 'Product Manager',
      image: '👨‍💼',
      rating: 5,
      text: 'Professional, modern, and easy to customize. FolioForge helped me stand out in a competitive market. Worth every penny!'
    },
    {
      name: 'Lisa Anderson',
      role: 'Photographer',
      image: '👩‍🎤',
      rating: 5,
      text: 'The perfect showcase for my work! Beautiful galleries, smooth animations, and excellent SEO. My website traffic has tripled!'
    },
    {
      name: 'James Wilson',
      role: 'Marketing Specialist',
      image: '👨‍🚀',
      rating: 5,
      text: 'Exceptional quality and support. The platform is intuitive and the results speak for themselves. A game-changer for my business!'
    }
  ];

  return (
    <section id="reviews" className="section-padding bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            What Our Clients Say
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Don't just take our word for it - hear from professionals who have transformed their careers with FolioForge
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="glass-effect p-8 rounded-2xl hover:scale-105 transition-transform duration-300"
            >
              {/* Avatar & Info */}
              <div className="flex items-center mb-6">
                <div className="text-5xl mr-4">{review.image}</div>
                <div>
                  <h4 className="text-xl font-bold text-white">{review.name}</h4>
                  <p className="text-gray-300 text-sm">{review.role}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex mb-4">
                {[...Array(review.rating)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Review Text */}
              <p className="text-gray-300 italic">"{review.text}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Reviews;
