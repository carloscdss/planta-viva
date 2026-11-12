// src/supervisor.js - Supervisor Técnico Inteligente (100% Local, sin APIs)

export async function analizarMaqueta(escena, grafo) {
    try {
        // Extraemos los datos reales del grafo de la maqueta
        const datosGrafo = grafo.aJSON();
        
        // CORRECCIÓN: Nuestro grafo devuelve 'componentes' y 'conexiones'
        const equipos = datosGrafo.componentes || [];
        const conexiones = datosGrafo.conexiones || [];

        // 1. Análisis de equipos desconectados
        const equiposDesconectados = equipos.filter(eq => {
            // Verificamos si el ID del equipo aparece en alguna conexión
            const tieneConexion = conexiones.some(c => c.componenteA === eq.id || c.componenteB === eq.id);
            return !tieneConexion;
        });

        // 2. Análisis de Bombas y Tanques
        const bombas = equipos.filter(eq => eq.familia === 'bomba' || (eq.tag && eq.tag.includes('BOM')));
        const tanques = equipos.filter(eq => eq.familia === 'tanque' || (eq.tag && eq.tag.includes('TK')));

        // 3. Construcción del reporte
        let reporte = "### 📊 REPORTE TÉCNICO DEL SUPERVISOR INDUSTRIAL\n\n";
        
        reporte += "#### 1. Verificación de Topología y Conexiones:\n";
        if (equipos.length === 0) {
            reporte += "⚠️ **Planta vacía:** No hay equipos desplegados en la maqueta. Coloca algunos equipos para empezar.\n";
        } else if (equiposDesconectados.length > 0) {
            reporte += `⚠️ **Atención:** Se detectaron ${equiposDesconectados.length} equipo(s) aislados sin enlazar a la red de tuberías de proceso.\n`;
            // Mostrar los tags de los que están desconectados
            const tagsDesconectados = equiposDesconectados.map(e => e.tag).join(', ');
            reporte += `   *Equipos aislados:* ${tagsDesconectados}\n`;
        } else {
            reporte += "✔ **Topología íntegra:** Todos los equipos desplegados están correctamente enlazados al esquema general.\n";
        }

        reporte += "\n#### 2. Validación de Equipos Principales:\n";
        reporte += `- **Total de equipos activos:** ${equipos.length}\n`;
        reporte += `- **Bombas detectadas:** ${bombas.length}\n`;
        reporte += `- **Tanques detectados:** ${tanques.length}\n`;
        reporte += `- **Líneas de enlace (tuberías/conexiones):** ${conexiones.length}\n`;
        
        if (bombas.length > 0 && tanques.length === 0) {
            reporte += "- ⚠️ **Recomendación de Proceso:** Cuenta con sistemas de bombeo pero se sugiere añadir tanques de almacenamiento o succión aguas arriba.\n";
        } else if (bombas.length > 0 && tanques.length > 0) {
            reporte += "- ✔ **Balance de equipos:** Hay presencia de bombas y tanques, lo cual es correcto para el ciclo de fluido.\n";
        }

        reporte += "\n#### 3. Recomendaciones Operativas:\n";
        reporte += "1. **Instrumentación:** Asegurar la presencia de válvulas de bloqueo antes y después de los tramos de bombeo.\n";
        reporte += "2. **Seguridad de Línea:** Verificar las especificaciones de presión y los diámetros nominales en las transiciones de tubería.\n";
        reporte += "3. **Simulación:** El sistema está listo para avanzar a la fase de simulación de flujo con los parámetros actuales.\n";

        return reporte;

    } catch (error) {
        return "Error al procesar el análisis de la maqueta: " + error.message;
    }
}
