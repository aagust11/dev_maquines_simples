import { Route, Routes } from 'react-router-dom';
import Editor from './routes/Editor';
import Gallery from './routes/Gallery';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/editor" element={<Editor />} />
    </Routes>
  );
};

export default App;
