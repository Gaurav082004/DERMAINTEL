import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PersonalizedHome from "./pages/PersonalizedHome.jsx";
import AnalyzeSkin from "./pages/AnalyzeSkin.jsx";
import EnvironmentalInfo from "./pages/EnvironmentalInfo";
import Confirmation from "./pages/Confirmation.jsx";
import Processing from "./pages/Processing.jsx";
import PredictionResult from "./pages/PredictionResult.jsx";
import History from "./pages/History.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import Profile from "./pages/Profile.jsx";


export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/home" element={<PersonalizedHome />} />
      <Route path="/analyze" element={<AnalyzeSkin />} />
      <Route path="/environment" element={<EnvironmentalInfo />} />
      <Route path="/confirmation" element={<Confirmation />} />
      <Route path="/processing" element={<Processing />} />
      <Route path="/result" element={<PredictionResult />} />
      <Route path="/history" element={<History />} />
      <Route path="/recommendations" element={<Recommendations />} />
      <Route path="/profile" element={<Profile />} />
      

    </Routes>
  );
}