import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PostcardEditor from './PostcardEditor';
import PostcardViewer from './PostcardViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PostcardEditor />} />
        <Route path="/postcard/:id" element={<PostcardViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
