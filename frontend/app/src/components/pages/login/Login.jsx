import { useState, useContext } from "react";
import { FaUser, FaLock, FaSpinner } from "react-icons/fa";
import { Link, Navigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import FormBase from "../../../components/FormBase/FormBase";
import { toast } from "react-toastify";
import "./Login.css";

const Login = () => {
  const { signIn, signed } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [values, setValues] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!values.email || !values.password) {
      toast.warn("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    try {
      await signIn(values);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  if (signed) {
    return <Navigate to="/home" />;
  }

  return (
    <FormBase
      title="BioUrb"
      subtitle="Acesse sua conta"
      onSubmit={handleSubmit}
      className="login-card"
    >
      <div className="auth-form-group">
        <div className="input-wrapper">
          <FaUser className="input-icon" />
          <input
            type="email"
            name="email"
            placeholder="E-mail"
            value={values.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="auth-form-group">
        <div className="input-wrapper">
          <FaLock className="input-icon" />
          <input
            type="password"
            name="password"
            placeholder="Senha"
            value={values.password}
            onChange={handleChange}
          />
        </div>

        <div className="forgot-password-link">
          <Link to="/forgot-password">Esqueceu a senha?</Link>
        </div>

      </div>

      <button type="submit" className="btn-auth" disabled={loading}>
        {loading ? (
          <><FaSpinner className="icon-spin" /> Entrando...</>
        ) : "Entrar"}
      </button>

      <div className="auth-footer-link">
        <p>
          Não tem uma conta? <Link to="/register">Registrar</Link>
        </p>
      </div>
    </FormBase>
  );
};

export default Login;