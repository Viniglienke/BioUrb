import { useState } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './Contact.css';
import emailjs from '@emailjs/browser';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendEmail = (e) => {
    e.preventDefault();

    if(name === '' || email === '' || message === ''){
      toast.error("Preencha todos os campos!");
      return;
    }

    setIsSubmitting(true);

    const templateParams = {
      from_name: name,
      message: message,
      email: email
    }

    emailjs.send("service_vk5hd8d", "template_c3yyd5r", templateParams, "0EZ5fZfY7LfCvIBry")
    .then((response) => {
      console.log("EMAIL ENVIADO", response.status, response.text)
      toast.success("Mensagem enviada com sucesso!")

      setName('')
      setEmail('')
      setMessage('')
    }, (err) => {
      console.log("ERRO: ", err)
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    })
    .finally(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <div className="contact-container">
      <header className="contact-header">
        <h1>Entre em Contato</h1>
        <p>Estamos aqui para ajudar. Entre em contato conosco para mais informações sobre o BioUrb.</p>
      </header>

      <section className="contact-info-section">
        <h2>Informações de Contato</h2>
        <div className="contact-info-grid">
          <div className="contact-info-item">
            <FaPhone className="contact-info-icon" />
            <div className="contact-info-text">
              <div className="contact-info-label">Telefone</div>
              <div className="contact-info-value">(49) 3664-0244</div>
            </div>
          </div>
          <div className="contact-info-item">
            <FaEnvelope className="contact-info-icon" />
            <div className="contact-info-text">
              <div className="contact-info-label">Email</div>
              <div className="contact-info-value">contato@biourb.com</div>
            </div>
          </div>
          <div className="contact-info-item">
            <FaMapMarkerAlt className="contact-info-icon" />
            <div className="contact-info-text">
              <div className="contact-info-label">Endereço</div>
              <div className="contact-info-value">Av. Araucária, 1234 - Maravilha, SC</div>
            </div>
          </div>
        </div>
      </section>

      <section className="contact-form-section">
        <h2>Envie sua Mensagem</h2>
        <form onSubmit={sendEmail}>
          <div className="input-field">
            <label htmlFor="name">Nome</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Seu nome completo"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="input-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-field">
            <label htmlFor="message">Mensagem</label>
            <textarea
              id="message"
              name="message"
              placeholder="Como podemos ajudar?"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            ></textarea>
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Contact;
