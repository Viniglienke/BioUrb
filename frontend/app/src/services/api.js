import axios from "axios";

// Cria uma instância personalizada do Axios com base no .env do Vite
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Log opcional (ajuda no debug)
console.log("🌱 API base URL:", import.meta.env.VITE_API_URL);