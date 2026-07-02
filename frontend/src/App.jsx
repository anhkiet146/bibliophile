import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import StoryDetails from './pages/StoryDetails';
import Reader from './pages/Reader';
import WriterStudio from './pages/WriterStudio';
import Auth from './pages/Auth';

function MainAppLayout() {
  const location = useLocation();
  // Hide global navbar on the reader page for a distraction-free experience
  const isReaderPage = location.pathname.includes('/read/');

  return (
    <>
      {!isReaderPage && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/story/:id" element={<StoryDetails />} />
        <Route path="/story/:id/read/:chapterId" element={<Reader />} />
        <Route path="/studio" element={<WriterStudio />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <MainAppLayout />
      </Router>
    </AuthProvider>
  );
}
