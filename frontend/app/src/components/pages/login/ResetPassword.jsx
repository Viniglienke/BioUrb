import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaLock, FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import { api } from "../../../services/api";
import FormBase from "../../../components/FormBase/FormBase";
import "./Login.css";

const ResetPassword = () => {
    const { token } = useParams(); // Pega o token da URL
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);

    useEffect(() => {
        // Verifica tamanho básico (tokens hex de 20 bytes têm 40 caracteres)
        if (!token || token.length !== 40) {
            toast.error("Link de recuperação inválido ou incompleto.");
            navigate("/"); // Chuta o usuário para o login
            return;
        }
        setIsValidToken(true);
    }, [token, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.warn("A senha deve ter no mínimo 6 caracteres.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }

        setLoading(true);

        try {
            // Envia a nova senha e o token para o backend
            await api.post(`/reset-password/${token}`, { password });

            toast.success("Senha alterada com sucesso! Faça login.");

            // Redireciona para o Login
            setTimeout(() => navigate("/"), 3000);

        } catch (error) {
            if (error.response && error.response.data && error.response.data.msg) {
                toast.error(error.response.data.msg);
            } else {
                toast.error("Erro ao redefinir senha. O link pode ter expirado.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <FormBase
            title="Nova Senha"
            subtitle="Crie uma nova senha segura para sua conta"
            onSubmit={handleSubmit}
            className="login-card"
        >
            <div className="auth-form-group">
                <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Nova senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {/* Botão de Olhinho para ver a senha */}
                    <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                </div>
            </div>

            <div className="auth-form-group">
                <div className="input-wrapper">
                    <FaLock className="input-icon" />
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirme a nova senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? (
                    <><FaSpinner className="icon-spin" /> Salvando...</>
                ) : "Definir Nova Senha"}
            </button>

        </FormBase>
    );
};

export default ResetPassword;