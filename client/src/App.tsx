import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AnalyzePage from './pages/AnalyzePage';
import Settings from './components/Settings';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AnalyzePage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

