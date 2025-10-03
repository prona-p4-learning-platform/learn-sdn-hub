import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CharacterSelectPage from './pages/CharacterSelectPage.tsx'
import HomePage from './pages/HomePage.tsx';
import TaskPage from './pages/TaskPage.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CharacterSelectPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/task" element={<TaskPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)