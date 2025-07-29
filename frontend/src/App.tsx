import React from 'react';
import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { router } from './router';
import './App.css';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <AuthProvider>
      <div className="App">
        <RouterProvider 
          router={router} 
          future={{ 
            v7_startTransition: true 
          }} 
        />
      </div>
    </AuthProvider>
  );
}

export default App;
