import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header/Header";
import { HomePage } from "./pages/HomePage";
import { WheelPage } from "./pages/WheelPage";
import { CoinPage } from "./pages/CoinPage";
import { DicePage } from "./pages/DicePage";
import { RandomNumberPage } from "./pages/RandomNumberPage";
import { NameDrawPage } from "./pages/NameDrawPage";
import { Footer } from "./components/Footer/Footer";

export default function App() {
  return (
    <BrowserRouter>
    <div className="appShell">
      <Header />
      <div className="appContent">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/wheel" element={<WheelPage />} />
        <Route path="/coin" element={<CoinPage />} />     
        <Route path="/dice" element={<DicePage />} /> 
        <Route path="/random-number" element={<RandomNumberPage />} />   
        <Route path="/name-draw" element={<NameDrawPage />} />
      </Routes>
      </div>
      <Footer />
    </div>
    </BrowserRouter>
  );
}
