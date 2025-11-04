import { useState } from 'react';
import './Contact.css';
import emailjs from '@emailjs/browser';

const Contact = () => {
  // Estados para armazenar os valores do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Função executada ao enviar o formulário
  const sendEmail = (e) => {
    e.preventDefault(); // Evita o comportamento padrão de recarregar a página
    
    // Verificação simples: todos os campos devem estar preenchidos
    if(name === '' || email === '' || message === ''){
      alert("Preencha todos os campos!");
      return;
    }

    // Parâmetros que serão passados ao template do EmailJS
    const templateParams = {
      from_name: name,
      message: message,
      email: email
    }

    // Envia o email utilizando os parâmetros e identificadores do serviço e template
    emailjs.send("service_vk5hd8d", "template_c3yyd5r", templateParams, "0EZ5fZfY7LfCvIBry")
    .then((response) => {
      console.log("EMAIL ENVIADO", response.status, response.text)
      alert("Mensagem enviada!")

      // Limpa os campos do formulário após o envio bem-sucedido
      setName('')
      setEmail('')
      setMessage('')

    }, (err) => {
      console.log("ERRO: ", err)
    })

  };

// JSX retornado pelo componente
  return (
    <div className="contact-container">
      <header className="contact-header">
        <h1>Entre em Contato Conosco</h1>
        <p>Entre em contato para obter mais informações sobre nosso sistema.</p>
      </header>
      <section>
        <h2>Informações de Contato</h2>
        <p>Telefone: (49) 3664-0244</p>
        <p>Email: contato@biourb.com</p>
        <p>Endereço: Av. Araucária, 1234 - Maravilha, Santa Catarina</p>
      </section>
      <section>
        <h2>Formulário de Contato</h2>
        <form onSubmit={sendEmail}>
          <div className="input-field">
            <label htmlFor="name">Nome:</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="input-field">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-field">
            <label htmlFor="message">Mensagem:</label>
            <textarea
              id="message"
              name="message"
              rows="4"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            ></textarea>
          </div>
          <button type="submit">Enviar Mensagem</button>
        </form>
      </section>
      </div>
  );
};

export default Contact;
