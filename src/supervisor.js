// src/supervisor.js
const GEMINI_API_KEY = "AQ.Ab8RN6IhruFQfO8FtJV2YeC4qlZ6jw612aUdog2T4L1eNIoSQg"; // <-- ¿Ya pusiste tu clave aquí?

export async function analizarMaqueta(escena, grafo) {
  if (GEMINI_API_KEY === "AQ.Ab8RN6IhruFQfO8FtJV2YeC4qlZ6jw612aUdog2T4L1eNIoSQg") {
    return "ERROR: No has configurado tu API Key en src/supervisor.js. Ve a Google AI Studio, crea una clave y pégala en la línea 2.";
  }

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
    
    // Si la API devuelve un error (ej. clave inválida), lo mostramos
    if (data.error) {
      return `Error de la API de Google: ${data.error.message}`;
    }

    // Si la API bloqueó la imagen por seguridad
    if (!data.candidates || !data.candidates[0]) {
      return "La IA no pudo procesar la imagen (posible bloqueo de seguridad). Intenta de nuevo o cambia el ángulo de la cámara.";
    }

    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    return "Error de red o conexión: " + error.message;
  }
}
