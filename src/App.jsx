import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './components/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CreatePortfolio from './pages/CreatePortfolio'
import PortfolioPreview from './pages/PortfolioPreview'
import PublicPortfolio from './pages/PublicPortfolio'
import AshishPortfolio from './pages/AshishPortfolio'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/create" element={<CreatePortfolio />} />
          <Route path="/preview" element={<PortfolioPreview />} />
          <Route path="/ashish-biswas" element={<AshishPortfolio />} />
          <Route path="/:username/publish" element={<PublicPortfolio />} />
          <Route
            path="/*"
            element={
              <>
                <Navbar />
                <Home />
              </>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
