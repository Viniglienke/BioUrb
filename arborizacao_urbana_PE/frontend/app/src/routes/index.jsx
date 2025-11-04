import { BrowserRouter as Router, Routes, Route, } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import Navbar from '../components/layout/Navbar';
import Container from "../components/layout/Container";
import Home from '../components/pages/Home'
import Login from '../components/pages/Login';
import Trees from '../components/pages/Trees';
import Monitoring from '../components/pages/Monitoring';
import Contact from '../components/pages/Contact';
import Register from '../components/pages/Register';
import { PrivateRoute } from "./PrivateRoutes";

export const AppRouter = () => {
    return (
        <Router>
            <Navbar />
            <Container customClass="min-height">
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/trees" element={<PrivateRoute />}>
                    <Route path="/trees" element={<Trees />} />
                    </Route>
                    <Route path="/monitoring" element={<PrivateRoute />}>
                    <Route path="/monitoring" element={<Monitoring />} />
                    </Route>
                </Routes>
            </Container>
            <Footer />
        </Router>
    );
};