const CLOUD_NAME = "dfqbcembe"; 
const UPLOAD_PRESET = "biourb_preset"; 

export const uploadTreePhoto = async (file) => {
  if (!file) return null;

  // 1. Preparar o formulário para envio
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "biourb_trees");

  try {
    // 2. Enviar para a API do Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Erro no upload para o Cloudinary");
    }

    // 3. Retornar a URL segura da imagem (https)
    return data.secure_url;

  } catch (error) {
    console.error("Erro no upload:", error);
    throw error;
  }
};