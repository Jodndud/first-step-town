import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Stock from "./pages/Game/Stock";
import Typing from "./pages/Game/Typing";
import Calculating from "./pages/Game/Calculating";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game">
          <Route path="stock" element={<Stock />} />
          <Route path="styping" element={<Typing />} />
          <Route path="calculating" element={<Calculating />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
