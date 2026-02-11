import { useState } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaUser, FaPen, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { api } from '../../../services/api';
import './Contact.css';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sendEmail = async (e) => { // Transformei em async
    e.preventDefault();

    if (name === '' || email === '' || message === '') {
      toast.warn("Preencha todos os campos!"); // Mudei para warn (amarelo) pra ficar padrão
      return;
    }

    setIsSubmitting(true);

    try {
      // Envia para o SEU backend agora
      await api.post("/contact", {
        name,
        email,
        message
      });

      toast.success("Mensagem enviada com sucesso!");

      // Limpa os campos
      setName('');
      setEmail('');
      setMessage('');

    } catch (error) {
      console.error("ERRO: ", error);
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      <header className="contact-header">
        <h1>Entre em Contato</h1>
        <p>Estamos aqui para ajudar. Fale conosco para mais informações sobre o BioUrb.</p>
      </header>

      {/* Grid de Informações (Cards) - Mantive igual */}
      <section className="contact-info-section">
        <div className="contact-info-grid">
          <div className="contact-card">
            <div className="icon-box"><FaPhone /></div>
            <div className="contact-text">
              <h3>Telefone</h3>
              <p>(49) 3664-0044</p>
            </div>
          </div>

          <div className="contact-card">
            <div className="icon-box"><FaEnvelope /></div>
            <div className="contact-text">
              <h3>Email</h3>
              <p className="email-text" title="contato.biourb@gmail.com">
                contato.biourb@gmail.com
              </p>
            </div>
          </div>

          <div className="contact-card">
            <div className="icon-box"><FaMapMarkerAlt /></div>
            <div className="contact-text">
              <h3>Endereço</h3>
              <p title="Av. Euclides da Cunha, 60 - Centro, Maravilha - SC">Av. Euclides da Cunha, 60 - Centro, Maravilha - SC</p>
            </div>
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="contact-form-section">
        <div className="form-content">
          <h2>Envie sua Mensagem</h2>

          <form onSubmit={sendEmail}>

            <div className="form-group">
              <label htmlFor="name">Nome Completo</label>
              <div className="input-wrapper">
                <FaUser className="input-icon" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Seu nome"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <FaEnvelope className="input-icon" />
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
            </div>

            <div className="form-group">
              <label htmlFor="message">Mensagem</label>
              <div className="input-wrapper">
                <FaPen className="input-icon icon-top" />
                <textarea
                  id="message"
                  name="message"
                  placeholder="Como podemos ajudar?"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                />
              </div>
            </div>

            <button type="submit" className="btn-submit-contact" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando...' : <><FaPaperPlane style={{ marginRight: 8 }} /> Enviar Mensagem</>}
            </button>

          </form>
        </div>
      </section>
    </div>
  );
};

export default Contact;