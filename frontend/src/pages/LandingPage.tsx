import React from "react";
import { Link } from "react-router-dom";

const LandingPage = () => (
  <div className="bg-gray-50 text-gray-900 min-h-screen">
    {/* Header */}
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow-md">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mr-3">
          <span className="text-2xl font-bold text-blue-700">CRPF</span>
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">CRPF Mental Health & Wellness Portal</h1>
          <p className="text-sm text-blue-700">Prioritizing Mental Well-being for Our Protectors</p>
        </div>
      </div>
    </header>

    {/* Hero Section */}
    <section className="hero-bg flex flex-col items-center justify-center text-center py-20 md:py-32 relative" style={{background: "linear-gradient(135deg, #4f8a8b 0%, #cce3de 100%), url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80')", backgroundBlendMode: "overlay", backgroundSize: "cover", backgroundPosition: "center"}}>
      <div className="bg-white bg-opacity-80 rounded-xl p-8 md:p-12 shadow-lg max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-blue-800 animate-fade-in">Support. Strength. Stability.</h2>
        <p className="text-lg md:text-xl mb-8 text-gray-700">Weekly check-ins and mental wellness support for CRPF personnel.</p>
        <div className="flex flex-col md:flex-row gap-4 justify-center">
            <Link to="/login" className="flex items-center justify-center px-6 py-3 bg-blue-700 text-white rounded-lg shadow hover:bg-blue-800 transition duration-200 font-semibold text-lg">
              <i className="fas fa-shield-alt mr-2"></i> Admin Login
            </Link>
            <Link to="/soldier/login" className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-200 font-semibold text-lg">
              <i className="fas fa-hard-hat mr-2"></i> Soldier Login
            </Link>
        </div>
      </div>
    </section>

    {/* About Section */}
    <section className="py-12 px-6 bg-white">
      <div className="max-w-3xl mx-auto text-center">
        <h3 className="text-2xl font-bold mb-4 text-blue-800">About the Portal</h3>
        <p className="text-lg mb-6 text-gray-700">This platform enables weekly mental health surveys, analytics, and confidential support tailored for CRPF personnel.</p>
        <div className="flex justify-center gap-8">
          <span className="inline-flex flex-col items-center">
            <i className="fas fa-brain text-3xl text-blue-500 mb-2"></i>
            <span className="text-sm">Mental Health</span>
          </span>
          <span className="inline-flex flex-col items-center">
            <i className="fas fa-heartbeat text-3xl text-green-500 mb-2"></i>
            <span className="text-sm">Wellness</span>
          </span>
          <span className="inline-flex flex-col items-center">
            <i className="fas fa-user-shield text-3xl text-blue-700 mb-2"></i>
            <span className="text-sm">Confidentiality</span>
          </span>
        </div>
      </div>
    </section>

    {/* Features Section */}
    <section className="py-12 px-6 bg-gray-100">
      <div className="max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold mb-8 text-center text-blue-800">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <i className="fas fa-calendar-check text-3xl text-blue-500 mb-3"></i>
            <h4 className="font-semibold mb-2">Weekly Mental Health Surveys</h4>
            <p className="text-sm text-gray-600">Regular check-ins to monitor and support mental well-being.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <i className="fas fa-user-secret text-3xl text-green-500 mb-3"></i>
            <h4 className="font-semibold mb-2">Data Privacy & Confidentiality</h4>
            <p className="text-sm text-gray-600">All responses are secure and confidential.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <i className="fas fa-chart-line text-3xl text-blue-700 mb-3"></i>
            <h4 className="font-semibold mb-2">Real-time Dashboard for Admin</h4>
            <p className="text-sm text-gray-600">Instant analytics and insights for authorized personnel.</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center text-center hover:scale-105 transition-transform">
            <i className="fas fa-book-medical text-3xl text-green-700 mb-3"></i>
            <h4 className="font-semibold mb-2">Mental Wellness Resources</h4>
            <p className="text-sm text-gray-600">Access to curated resources for mental health support.</p>
          </div>
        </div>
      </div>
    </section>

    {/* Call-to-Action Section */}
    <section className="py-12 px-6 bg-white text-center">
      <h3 className="text-2xl font-bold mb-4 text-blue-800">Begin your journey towards mental well-being.</h3>
      <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link to="/admin/login" className="flex items-center justify-center px-6 py-3 bg-blue-700 text-white rounded-lg shadow hover:bg-blue-800 transition duration-200 font-semibold text-lg">
            <i className="fas fa-shield-alt mr-2"></i> Admin Login
          </Link>
          <Link to="/soldier/login" className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition duration-200 font-semibold text-lg">
            <i className="fas fa-hard-hat mr-2"></i> Soldier Login
          </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="bg-gray-800 text-gray-200 py-6 px-6 mt-8">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <span className="text-lg font-bold text-blue-400 mr-2">CRPF</span>
          <span className="text-sm">Mental Health & Wellness Portal</span>
        </div>
        <div className="text-sm">&copy; 2025 CRPF. All rights reserved.</div>
        <div className="text-sm">
          <a href="#" className="text-blue-300 hover:underline">Contact / Support</a>
        </div>
      </div>
    </footer>
  </div>
);

export default LandingPage;
