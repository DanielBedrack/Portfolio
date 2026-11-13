import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/HomePage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectPage } from '../pages/ProjectPage'
import { isPortfolioChatEnabled } from '../chatbot/config'
import { PortfolioChat } from '../components/chat/PortfolioChat'

export function PortfolioRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/projects/megureit"
        element={<Navigate replace to="/projects/real-estate-company" />}
      />
      <Route path="/projects/:slug" element={<ProjectPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export function App() {
  const chatEnabled = isPortfolioChatEnabled(import.meta.env.VITE_PORTFOLIO_CHAT_ENABLED)

  return (
    <BrowserRouter basename="/Portfolio">
      <PortfolioRoutes />
      {chatEnabled ? <PortfolioChat /> : null}
    </BrowserRouter>
  )
}
