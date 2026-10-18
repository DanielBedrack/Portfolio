import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectPage } from '../pages/ProjectPage'

export function PortfolioRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects/:slug" element={<ProjectPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export function App() {
  return (
    <BrowserRouter basename="/portfolio">
      <PortfolioRoutes />
    </BrowserRouter>
  )
}
