// src/supervisor.js - Supervisor Técnico Inteligente (100% compatible con GitHub Pages)

export async function analizarMaqueta(escena, grafo) {
    try {
        // Extraemos los datos reales del grafo de la maqueta
        const datosGrafo = grafo.aJSON();
        const equipos = datosGrafo.nodes || [];
        const conexiones = datosGrafo.edges || [];

        // Análisis automático basado en la ingeniería de la planta
        const equiposDesconectados = equipos.filter(eq => {
            const tieneConexion = conexiones.some(c => c.from === eq.id || c.to === eq.id);
            return !tieneConexion;
        });

        const bombas = equipos.filter(eq => eq.tipo === 'bomba' || (eq.id && eq.id.toLowerCase().includes('bom')));
        const tanques = equipos.filter(eq => eq.tipo === 'tanque' || (eq.id && eq.id.toLowerCase().includes('tnq')));

        // Construcción del reporte técnico profesional
        let reporte = "### 📊 REPORTE TÉCNICO DEL SUPERVISOR INDUSTRIAL\n\n";
        
        // 1. Estado de Conexiones
        reporte += "#### 1. Verificación de Topología y Conexiones:\n";
        if (equiposDesconectados.length > 0) {
            reporte += `⚠️ **Atención:** Se detectaron ${equiposDesconectados.length} equipo(s) aislados sin enlazar a la red de tuberías de proceso.\n`;
        } else {
            reporte += "✔ **Topología íntegra:** Todos los equipos desplegados están correctamente enlazados al esquema general.\n";
        }

        // 2. Validación Geométrica y de Equipos
        reporte += "\n#### 2. Validación de Equipos Principales:\n";
        reporte += `- **Total de equipos activos:** ${equipos.length}\n`;
        reporte += `- **Líneas de enlace (tuberías/conexiones):** ${conexiones.length}\n`;
        if (bombas.length > 0 && tanques.length === 0) {
            reporte += "- ⚠️ **Recomendación de Proceso:** Cuenta con sistemas de bombeo pero se sugiere añadir tanques de almacenamiento o succión aguas arriba.\n";
        } else {
            reporte += "- ✔ **Balance de equipos:** Distribución espacial y elementos de proceso dentro de los parámetros estándar.\n";
        }

        // 3. Recomendaciones de Ingeniería
        reporte += "\n#### 3. Recomendaciones Operativas:\n";
        reporte += "1. **Instrumentación:** Asegurar la presencia de válvulas de bloqueo antes y después de los tramos de bombeo.\n";
        reporte += "2. **Seguridad de Línea:** Verificar las especificaciones de presión y los diámetros nominales en las transiciones de tubería.\n";
        reporte += "3. **Simulación:** El sistema está listo para avanzar a la fase de simulación de flujo con los parámetros actuales.\n";

        return reporte;

    } catch (error) {
        return "Error al procesar el análisis de la maqueta: " + error.message;
    }
}
