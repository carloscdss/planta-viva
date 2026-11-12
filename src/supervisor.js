// src/supervisor.js

// 1. URL de tu Worker (¡Verifica que sea la tuya!)
const WORKER_URL = "https://planta-viva-supervisor.iservicecd2021.workers.dev";

export async function analizarMaqueta(escena, grafo) {
  try {
    // 2. Tomamos la foto de la maqueta
    const canvas = document.querySelector('canvas');
    // Le bajamos la calidad a 0.5 para que pese menos y viaje rápido
    const imagenBase64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    
    const estadoGrafo = JSON.stringify(grafo.aJSON(), null, 2);
    
    const prompt = `
      Eres un Ingeniero Supervisor experto en plantas industriales. 
      MIRA LA IMAGEN ADJUNTA y analiza el JSON.
      1. ¿Hay equipos atravesados por tuberías o flotando en el aire?
      2. ¿Hay tanques amontonados uno encima de otro?
      3. ¿Qué ves visualmente mal que deba corregir?
      
      ESTADO DEL GRAFO:
      ${estadoGrafo}
    `;

    // 3. Enviamos todo al Worker
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imagenBase64 })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return `Error del Worker: ${data.error.message || data.error}`;
    }
    if (!data.candidates || !data.candidates[0]) {
      return "La IA no pudo procesar la imagen (posible bloqueo de seguridad o imagen muy pesada).";
    }

    return data.candidates[0].content.parts[0].text;
    
  } catch (error) {
    return "Error de conexión con el Supervisor: " + error.message;
  }
}
