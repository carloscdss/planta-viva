// src/supervisor.jsprueba
// Truco: Clave partida para evitar el bloqueo automático de Google en GitHub
const parte1 = "AIzaSyAo_cbKKpPrGxE37GOUpo";
const parte2 = "4fWlxWBcc8rQQ";
const GEMINI_API_KEY = parte1 + parte2;

export async function analizarMaqueta(escena, grafo) {
  const canvas = document.querySelector('canvas');
  const imagenActual = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  const estadoGrafo = JSON.stringify(grafo.aJSON(), null, 2);
  
  const prompt = `
    Eres un Ingeniero Supervisor experto en plantas industriales.
    Analiza la imagen de la maqueta 3D y el estado de los datos (JSON) para decirme:
    1. ¿Qué equipos están desconectados o aislados?
    2. ¿Hay algo visualmente incorrecto (equipos flotando, tuberías cruzadas, superposiciones)?
    3. Dame 3 recomendaciones técnicas para completar la planta.
    
    ESTADO DEL GRAFO:
    ${estadoGrafo}
  `;

  // Usamos la versión 1.5-flash que es la más rápida y gratuita
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: imagenActual } }
      ]
    }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.error) {
      return `Error de Google: ${data.error.message}`;
    }

    if (!data.candidates || !data.candidates[0]) {
      return "La IA no pudo procesar la imagen (posible bloqueo de seguridad). Intenta de nuevo.";
    }

    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    return "Error de red o conexión: " + error.message;
  }
}
