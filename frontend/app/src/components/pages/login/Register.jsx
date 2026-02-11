import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaUser, FaEnvelope, FaIdCard, FaLock, FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import { api } from "../../../services/api";
import FormBase from "../../../components/FormBase/FormBase";
import "./Login.css"; // Usa o mesmo CSS padronizado

const Register = () => {
  const [values, setValues] = useState({
    name: "",
    email: "",
    cpf: "",
    password: "",
  });

  const [cpfError, setCpfError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCPFChange = (e) => {
    let cpf = e.target.value.replace(/\D/g, "");
    if (cpf.length <= 11) {
      cpf = cpf
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    setValues({ ...values, cpf });
    if (cpfError) setCpfError(false);
  };

  const isValidCPF = (cpf) => {
    const cleaned = cpf.replace(/\D/g, "");
    if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
    const digits = cleaned.split("").map(Number);
    const calc = (base, factor) =>
      (base.reduce((s, d, i) => s + d * (factor - i), 0) * 10) % 11 % 10;
    return (
      calc(digits.slice(0, 9), 10) === digits[9] &&
      calc(digits.slice(0, 10), 11) === digits[10]
    );
  };

  const handleChange = (e) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!values.name || !values.email || !values.cpf || !values.password) {
        toast.warn("Preencha todos os campos.");
        return;
    }

    if (!isValidCPF(values.cpf)) {
      setCpfError(true);
      toast.error("CPF inválido.");
      return;
    }

    if (values.password.length < 6) {
        toast.warn("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    setLoading(true);

    const payload = {
        ...values,
        cpf: values.cpf.replace(/\D/g, "") 
    };

    try {
      await api.post("/register", payload);
      toast.success("Usuário cadastrado com sucesso!");
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.msg) {
          toast.error(error.response.data.msg);
      } else {
          toast.error("Erro ao conectar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormBase
      title="Criar Conta"
      subtitle="Preencha os dados para se cadastrar"
      onSubmit={handleSubmit}
    >
      <div className="auth-form-group">
        <div className="input-wrapper">
            <FaUser className="input-icon" />
            <input
            type="text"
            name="name"
            placeholder="Nome"
            value={values.name}
            onChange={handleChange}
            />
        </div>
      </div>

      <div className="auth-form-group">
        <div className="input-wrapper">
            <FaEnvelope className="input-icon" />
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
            <FaIdCard className="input-icon" />
            <input
            type="text"
            name="cpf"
            placeholder="CPF"
            value={values.cpf}
            onChange={handleCPFChange}
            className={cpfError ? "input-error" : ""}
            maxLength={14}
            />
        </div>
      </div>

      <div className="auth-form-group">
        <div className="input-wrapper">
            <FaLock className="input-icon" />
            <input
            type="password"
            name="password"
            placeholder="Senha (mín. 6 caracteres)"
            value={values.password}
            onChange={handleChange}
            />
        </div>
      </div>

      <button type="submit" className="btn-auth" disabled={loading}>
        {loading ? (
            <><FaSpinner className="icon-spin" /> Cadastrando...</>
        ) : "Registrar"}
      </button>

      <div className="auth-footer-link">
        <p>
          Já tem uma conta? <Link to="/">Entrar</Link>
        </p>
      </div>
    </FormBase>
  );
};

export default Register;