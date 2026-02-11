import { BrowserRouter as Router, Routes, Route, } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Container from "../components/layout/Container";
import Home from '../components/pages/home/Home'
import Login from '../components/pages/login/Login';
import Trees from '../components/pages/trees/Trees';
import Monitoring from '../components/pages/monitoring/Monitoring';
import Contact from '../components/pages/contact/Contact';
import Register from '../components/pages/login/Register';
import Areas from '../components/pages/areas/Areas';
import Shop from '../components/pages/shop/Shop';
import Inventory from '../components/pages/inventory/Inventory';
import AdminPanel from '../components/pages/admin/AdminPanel';
import AdminRoute from './AdminRoute';
import { PrivateRoute } from "./PrivateRoutes";
import Profile from "../components/pages/profile/Profile";
import Scanner from "../components/pages/scanner/Scanner";
import MapPage from '../components/pages/map/MapPage';
import ForgotPassword from "../components/pages/login/ForgotPassword";
import ResetPassword from "../components/pages/login/ResetPassword";

export const AppRouter = () => {
    return (
        <Router>

            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

                <Navbar />

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Container customClass="min-height">
                        <Routes>
                            <Route path="/" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/home" element={<Home />} />
                            <Route path="/trees" element={<PrivateRoute />}>
                                <Route path="/trees" element={<Trees />} />
                            </Route>
                            <Route path="/areas" element={<PrivateRoute />}>
                                <Route path="/areas" element={<Areas />} />
                            </Route>
                            <Route path="/monitoring" element={<PrivateRoute />}>
                                <Route path="/monitoring" element={<Monitoring />} />
                            </Route>
                            <Route path="/shop" element={<PrivateRoute />}>
                                <Route path="/shop" element={<Shop />} />
                            </Route>
                            <Route path="/inventory" element={<PrivateRoute />}>
                                <Route path="/inventory" element={<Inventory />} />
                            </Route>
                            <Route path="/admin" element={<AdminRoute>
                                <AdminPanel />
                            </AdminRoute>
                            } />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/scanner" element={<Scanner />} />
                            <Route path="/map" element={<PrivateRoute />}>
                                <Route path="/map" element={<MapPage />} />
                            </Route>
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password/:token" element={<ResetPassword />} />
                        </Routes>
                    </Container>
                </div>

                <Footer />

            </div>
        </Router>
    );
};