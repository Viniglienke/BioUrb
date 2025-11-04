import axios from "axios";

// Cria uma instância personalizada do Axios com uma URL base
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});