import { Route, Routes } from 'react-router-dom';
import ScenePage from './pages/ScenePage';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Momentor</h1>
        <p>Simulador analític de màquines simples per a ESO i Batxillerat</p>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/*" element={<ScenePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
