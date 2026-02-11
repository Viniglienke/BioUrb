import { AppRouter } from "./routes";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/theme.css";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import Footer from "./components/layout/Footer";
import Urbaninho from "./components/urbaninho/Urbaninho";

export const App = () => {
  return (
    <AuthProvider>
      <div className="app-wrapper">
        <main className="app-main">
          <AppRouter />
        </main>
      </div>

      <ThemeToggle />
      <Urbaninho />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable />
    </AuthProvider>
  );
};

export default App;