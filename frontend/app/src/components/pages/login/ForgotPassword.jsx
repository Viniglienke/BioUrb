import { useState, } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaSpinner, FaArrowLeft, FaCheck } from "react-icons/fa"; // Adicionado FaCheck
import { toast } from "react-toastify";
import { api } from "../../../services/api";
import FormBase from "../../../components/FormBase/FormBase";
import "./Login.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // Novo estado para travar o botão
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Trava de segurança: Se já está carregando OU já foi enviado, não faz nada
    if (loading || emailSent) return;

    if (!email) {
      toast.warn("Por favor, informe seu e-mail.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/forgot-password", { email });

      // SUCESSO: Trava o formulário para não permitir novos cliques
      setEmailSent(true);
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");

      setTimeout(() => navigate("/"), 5000);

    } catch (error) {
      // ERRO: Destrava para o usuário tentar corrigir o email
      setEmailSent(false);

      if (error.response && error.response.data && error.response.data.msg) {
        toast.error(error.response.data.msg);
      } else {
        toast.error("Erro ao enviar e-mail. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormBase
      title="Recuperar Senha"
      subtitle="Informe seu e-mail para receber o link de redefinição"
      onSubmit={handleSubmit}
      className="login-card"
    >
      <div className="auth-form-group">
        <div className="input-wrapper">
          <FaEnvelope className="input-icon" />
          <input
            type="email"
            name="email"
            placeholder="Seu e-mail cadastrado"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || emailSent} // Bloqueia digitação após envio
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn-auth"
        disabled={loading || emailSent} // Bloqueia clique após envio
        style={emailSent ? { backgroundColor: 'var(--accent-green)', cursor: 'default' } : {}}
      >
        {loading ? (
          <><FaSpinner className="icon-spin" /> Enviando...</>
        ) : emailSent ? (
          <><FaCheck style={{ marginRight: 8 }} /> Enviado!</>
        ) : (
          "Enviar Link"
        )}
      </button>

      <div className="auth-footer-link">
        <Link to="/" className="back-link">
          <FaArrowLeft size={12} style={{ marginRight: '5px' }} /> Voltar para o Login
        </Link>
      </div>
    </FormBase>
  );
};

export default ForgotPassword;