// Configura tu API Key aquí (solo para pruebas locales/personales)
const GEMINI_API_KEY = "AQ.Ab8RN6L3-pdD-U14ug2FS4BdxuKe8I5kJjBAj0EuHIFUIB-3Kw";

export async function analizarMaqueta(escena, grafo) {
  // 1. Tomamos una "foto" del canvas 3D
  const canvas = document.querySelector('canvas');
  const imagenBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

  // 2. Preparamos el contexto de los datos (el grafo)
  const estadoGrafo = JSON.stringify(grafo.aJSON(), null, 2);
  
  const prompt = `
    Eres un Ingeniero Supervisor de una planta industrial 3D.
    Analiza la imagen de la maqueta y el siguiente estado de los datos (JSON) para decirme:
    1. ¿Qué equipos faltan conectar?
    2. ¿Hay algo que se vea visualmente mal (equipos flotando, tuberías raras)?
    3. Dame 3 recomendaciones para mejorar la planta.
    
    ESTADO DEL GRAFO:
    ${estadoGrafo}
  `;

  // 3. Llamamos a Gemini directamente
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/jpeg", data: imagenBase64 } }
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
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    return "Error al conectar con el supervisor: " + error.message;
  }
}
