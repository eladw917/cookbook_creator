import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'
import LandingPage from './components/LandingPage'
import RecipeCollection from './components/RecipeCollection'
import BookCreator from './components/BookCreator'
import BookEditor from './components/BookEditor'
import BookList from './components/BookList'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/recipes"
            element={
              <ProtectedRoute>
                <RecipeCollection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recipes/new"
            element={<Navigate to="/recipes" replace />}
          />
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <BookList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books/create"
            element={
              <ProtectedRoute>
                <BookCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books/:id/edit"
            element={
              <ProtectedRoute>
                <BookEditor />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
