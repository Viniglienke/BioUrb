import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";
import { FaUser, FaEnvelope, FaIdCard, FaLock } from "react-icons/fa";
import { toast } from "react-toastify";
import "./Login.css";

const Register = () => {
  // Estado que armazena os valores dos campos do formulário
  const [values, setValues] = useState({
    name: "",
    email: "",
    cpf: "",
    password: ""
  });

  // Estado para controlar se há erro no CPF
  const [cpfError, setCpfError] = useState(false);

  // Função para redirecionamento após cadastro
  const navigate = useNavigate();

  // Máscara de CPF: formata o valor enquanto o usuário digita
  const handleCPFChange = (e) => {
    let cpf = e.target.value;
    cpf = cpf.replace(/\D/g, ""); // remove tudo que não for número
    if (cpf.length <= 11) {
      cpf = cpf
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    setValues((prevValues) => ({
      ...prevValues,
      cpf: cpf
    }));
  };

  // Validação completa do CPF usando os dígitos verificadores
  const isValidCPF = (cpf) => {
    const cleaned = cpf.replace(/[^\d]/g, "");

    // Verifica se tem 11 dígitos e se todos os números são iguais
    if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;

    const digits = cleaned.split("").map(Number);

    // Validação do primeiro dígito verificador
    const firstCheck = digits
      .slice(0, 9)
      .reduce((sum, digit, index) => sum + digit * (10 - index), 0);
    const firstDigit = (firstCheck * 10) % 11 % 10;

    // Validação do segundo dígito verificador
    const secondCheck = digits
      .slice(0, 10)
      .reduce((sum, digit, index) => sum + digit * (11 - index), 0);
    const secondDigit = (secondCheck * 10) % 11 % 10;

     // Retorna true se os dígitos estiverem corretos
    return firstDigit === digits[9] && secondDigit === digits[10];
  };

  // Função chamada ao enviar o formulário
  const handleClickRegister = async (e) => {
    e.preventDefault();

    // Valida CPF antes de enviar
    if (!isValidCPF(values.cpf)) {
      setCpfError(true);
      toast.error("CPF inválido. Por favor, insira um CPF válido.");
      return;
    }

    setCpfError(false); // Limpa erro, caso CPF esteja válido

    try {
      // Envia os dados para a API de registro
      const response = await Axios.post(`${process.env.REACT_APP_API_URL}/register`, {
        cpf: values.cpf,
        name: values.name,
        email: values.email,
        password: values.password,
      });

      console.log("✅ Cadastro realizado:", response.data);
      toast.success("Usuário cadastrado com sucesso! Redirecionando...");

      // Redireciona para a tela de login após 2 segundos
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("🔥 Erro ao registrar:", error.response?.data || error.message);
      toast.error("Erro ao registrar. Verifique os dados e tente novamente.");
    }
  };


// Atualiza o estado `values` com os dados dos inputs
  const handleaddValues = (value) => {
    setValues((prevValues) => ({
      ...prevValues,
      [value.target.name]: value.target.value,
    }));
  };

  // Estrutura visual do formulário de registro
  return (
    <div className="container">
      <form onSubmit={handleClickRegister}>
        <h1>BioUrb</h1>
        <div className="input-field">
          <input
            type="text"
            placeholder="Nome"
            required
            id="name"
            name="name"
            value={values.name}
            onChange={handleaddValues}
          />
          <FaUser className="icon" />
        </div>
        <div className="input-field">
          <input
            type="email"
            placeholder="E-mail"
            required
            id="email"
            name="email"
            value={values.email}
            onChange={handleaddValues}
          />
          <FaEnvelope className="icon" />
        </div>
        <div className="input-field">
          <input
            type="text"
            placeholder="CPF"
            required
            id="cpf"
            name="cpf"
            value={values.cpf}
            onChange={handleCPFChange}
            maxLength={14}
            className={cpfError ? "cpf-error" : ""}
          />
          <FaIdCard className="icon" />
        </div>
        <div className="input-field">
          <input
            type="password"
            placeholder="Senha"
            required
            id="password"
            name="password"
            value={values.password}
            onChange={handleaddValues}
          />
          <FaLock className="icon" />
        </div>
        <button type="submit">Registrar</button>
        <div className="signup-link">
          <p>
            Já tem uma conta? <a href="/">Entrar</a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;