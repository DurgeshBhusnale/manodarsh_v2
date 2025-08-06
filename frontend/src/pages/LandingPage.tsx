import React from "react";
import { Link } from "react-router-dom";

const LandingPage = () => (
  <div className="bg-gradient-to-br from-orange-50 via-green-50 to-blue-50 text-gray-800 min-h-screen relative overflow-hidden">
    {/* Animated Background Elements */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-gradient-to-r from-orange-400 to-red-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute top-1/4 right-10 w-24 h-24 bg-gradient-to-r from-green-400 to-blue-400 rounded-full opacity-20 animate-bounce"></div>
      <div className="absolute bottom-20 left-1/4 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute bottom-10 right-1/3 w-16 h-16 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full opacity-20 animate-bounce"></div>
      <div className="absolute top-1/2 left-10 w-14 h-14 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
      <div className="absolute top-40 left-1/2 w-18 h-18 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full opacity-20 animate-bounce delay-500"></div>
    </div>

    {/* Header */}
    <header className="relative z-10 flex items-center justify-between px-6 py-6 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
      <div className="flex items-center">
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-4 shadow-xl">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <i className="fas fa-shield-alt text-white text-xl"></i>
          </div>
        </div>
        <div>
          <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
            CRPF Mental Health & Wellness Portal
          </h1>
          <p className="text-sm md:text-base text-gray-600 font-medium">Prioritizing Mental Well-being for Our Protectors</p>
        </div>
      </div>
    </header>

    {/* Hero Section */}
    <section className="relative z-10 flex flex-col items-center justify-center text-center py-24 md:py-40 px-6">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-16 shadow-2xl max-w-4xl mx-auto border border-white/20 relative">
        {/* Decorative elements */}
        <div className="absolute -top-6 -left-6 w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl rotate-45 opacity-80"></div>
        <div className="absolute -bottom-6 -right-6 w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl rotate-45 opacity-80"></div>
        
        <h2 className="text-4xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-yellow-500 to-green-600 bg-clip-text text-transparent animate-pulse">
          SATHI
        </h2>
        <p className="text-xl md:text-2xl mb-10 text-gray-700 font-light leading-relaxed">
          Supportive AI To Heal and Iterate
        </p>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center">
          <Link 
            to="/login" 
            className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg transform hover:scale-[1.02]"
          >
            <span className="flex items-center justify-center">
              <i className="fas fa-shield-alt mr-3 text-xl"></i> 
              Admin Login
            </span>
          </Link>
          
          <Link 
            to="/soldier/login" 
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg transform hover:scale-[1.02]"
          >
            <span className="flex items-center justify-center">
              <i className="fas fa-user-shield mr-3 text-xl"></i> 
              User Login
            </span>
          </Link>
        </div>
      </div>
    </section>

    {/* About Section */}
    <section className="relative z-10 py-16 px-6 bg-white/50 backdrop-blur-xl border-y border-white/20">
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
          About the Portal
        </h3>
        <p className="text-lg md:text-xl mb-10 text-gray-700 leading-relaxed max-w-3xl mx-auto">
          This platform enables comprehensive mental health surveys, advanced analytics, and confidential support 
          specifically tailored for CRPF personnel and their unique operational challenges.
        </p>
        
        <div className="flex justify-center gap-12 md:gap-16">
          <div className="group flex flex-col items-center transform hover:scale-110 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:shadow-orange-500/25">
              <i className="fas fa-brain text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-3xl text-white font-bold" style={{display: 'none'}}>🧠</span>
            </div>
            <span className="text-sm font-semibold text-orange-600">Mental Health</span>
          </div>
          
          <div className="group flex flex-col items-center transform hover:scale-110 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:shadow-green-500/25">
              <i className="fas fa-heartbeat text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-3xl text-white font-bold" style={{display: 'none'}}>💚</span>
            </div>
            <span className="text-sm font-semibold text-green-600">Wellness</span>
          </div>
          
          <div className="group flex flex-col items-center transform hover:scale-110 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-xl group-hover:shadow-blue-500/25">
              <i className="fas fa-user-shield text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-3xl text-white font-bold" style={{display: 'none'}}>🛡️</span>
            </div>
            <span className="text-sm font-semibold text-blue-600">Confidentiality</span>
          </div>
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section className="relative z-10 py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <h3 className="text-3xl md:text-4xl font-bold mb-16 text-center bg-gradient-to-r from-orange-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
          Key Features
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 flex flex-col items-center text-center hover:scale-105 transition-all duration-300 border border-white/20 hover:bg-white/90">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:shadow-orange-500/25">
              <i className="fas fa-calendar-check text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-2xl text-white font-bold" style={{display: 'none'}}>📅</span>
            </div>
            <h4 className="font-bold mb-3 text-lg text-orange-600">Weekly Mental Health Surveys</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Regular comprehensive check-ins to monitor and support mental well-being with actionable insights.</p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 flex flex-col items-center text-center hover:scale-105 transition-all duration-300 border border-white/20 hover:bg-white/90">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:shadow-green-500/25">
              <i className="fas fa-user-secret text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-2xl text-white font-bold" style={{display: 'none'}}>🔒</span>
            </div>
            <h4 className="font-bold mb-3 text-lg text-green-600">Data Privacy & Confidentiality</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Military-grade security ensuring all responses remain completely secure and confidential.</p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 flex flex-col items-center text-center hover:scale-105 transition-all duration-300 border border-white/20 hover:bg-white/90">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:shadow-blue-500/25">
              <i className="fas fa-chart-line text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-2xl text-white font-bold" style={{display: 'none'}}>📊</span>
            </div>
            <h4 className="font-bold mb-3 text-lg text-blue-600">Real-time Analytics Dashboard</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Advanced analytics and insights for authorized personnel with real-time monitoring capabilities.</p>
          </div>
          
          <div className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 flex flex-col items-center text-center hover:scale-105 transition-all duration-300 border border-white/20 hover:bg-white/90">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:shadow-purple-500/25">
              <i className="fas fa-book-medical text-3xl text-white drop-shadow-lg"></i>
              {/* Fallback if FontAwesome not loaded */}
              <span className="text-2xl text-white font-bold" style={{display: 'none'}}>📚</span>
            </div>
            <h4 className="font-bold mb-3 text-lg text-purple-600">Mental Wellness Resources</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Curated mental health resources and support materials designed for military personnel.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Call-to-Action Section */}
    <section className="relative z-10 py-20 px-6 bg-white/50 backdrop-blur-xl border-y border-white/20">
      <div className="max-w-4xl mx-auto text-center">
        <h3 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-orange-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
          Begin Your Journey Towards Mental Well-being
        </h3>
        <p className="text-lg md:text-xl mb-12 text-gray-700 max-w-2xl mx-auto">
          Join thousands of CRPF personnel who have already taken the first step towards better mental health
        </p>
        
        <div className="flex flex-col md:flex-row gap-8 justify-center">
          <Link 
            to="/admin/login" 
            className="px-10 py-5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-bold text-xl transform hover:scale-[1.02]"
          >
            <span className="flex items-center justify-center">
              <i className="fas fa-shield-alt mr-3 text-2xl"></i> 
              Admin Portal
            </span>
          </Link>
          
          <Link 
            to="/soldier/login" 
            className="px-10 py-5 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-bold text-xl transform hover:scale-[1.02]"
          >
            <span className="flex items-center justify-center">
              <i className="fas fa-user-shield mr-3 text-2xl"></i> 
              User Portal
            </span>
          </Link>
        </div>
      </div>
    </section>

    {/* Footer */}
    <footer className="relative z-10 bg-white/80 backdrop-blur-xl text-gray-800 py-8 px-6 mt-8 border-t border-white/20 shadow-lg">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-6 md:mb-0">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-white to-green-500 rounded-full flex items-center justify-center mr-4 shadow-xl">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <i className="fas fa-shield-alt text-white text-sm"></i>
            </div>
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 via-blue-600 to-green-600 bg-clip-text text-transparent">CRPF</span>
            <div className="text-sm text-gray-600">Mental Health & Wellness Portal</div>
          </div>
        </div>
        
        <div className="text-center md:text-left mb-4 md:mb-0">
          <div className="text-sm text-gray-500">&copy; 2025 Central Reserve Police Force. All rights reserved.</div>
          <div className="text-xs text-gray-400 mt-1">Protecting Those Who Protect Us</div>
        </div>
        
        <div className="text-sm">
          <button className="text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium">
            Contact / Support
          </button>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage;
