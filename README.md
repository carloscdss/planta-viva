# planta-viva
Editor y simulador de planta industrial 3D
📘 PLANTA VIVA v2.0: Documento Técnico Consolidado y Guía de Arquitectura
1. Visión y Objetivo del Proyecto

Planta Viva no es solo una maqueta 3D; es un Gemelo Digital (Digital Twin) de ingeniería. El objetivo es construir una aplicación web (sin backend obligatorio, compatible con GitHub Pages) que permita:

    Modelar una planta industrial (desde un tornillo hasta una caldera).

    Generar el P&ID (Plano de Tuberías e Instrumentación) desde el modelo 3D, o escanear un P&ID para generar el 3D.

    Simular el proceso físico (temperatura, flujo, presión, nivel, apagones eléctricos).

    Controlar mediante una capa lógica tipo PLC (Allen-Bradley, Siemens, Modbus) y DCS (Foxboro/Honeywell vía OPC UA).

    Calcular los Cómputos Métricos (BOQ) de todas las disciplinas (Civil, Eléctrico, Instrumentación, Mecánica) de forma automática.

    Operar a través de una HMI (Interfaz Hombre-Máquina) que funcione como una panera virtual real.

    Todo esto en la web, con diseño responsive, optimizado para un móvil Poco X3 Pro.

2. La Filosofía "Única Fuente de Verdad" (Single Source of Truth)

El corazón del sistema es el Grafo. El 3D, el P&ID, la simulación y los cómputos son solo proyecciones de este grafo.

    Contrato inviolable: Cada equipo tiene un uuid permanente (que nunca cambia) y un tag editable (ej. BOM-101).

    Sincronización: Si mueves un equipo en 3D, su símbolo en el P&ID se mueve. Si cambias una tubería, el cómputo métrico se actualiza. Si algo no se puede actualizar, se marca como pending (pendiente), nunca se corrompe ni se inventa.

3. Arquitectura de Módulos (El Mapa de Ingredientes)
🧱 Módulo 1: El Núcleo de Datos (Grafo)

    Basado en: 3d-with-pid / core.

    Qué hace: Almacena equipos, tuberías e instrumentos. Maneja transacciones (Undo/Redo).

    Implementación: src/modelo/grafo.js. Usar el patrón de "Comandos con inversa" para poder deshacer cualquier acción (50 pasos).

🏗️ Módulo 2: El Editor 3D y el P&ID

    Basado en: 3d-with-pid (drafting y geometry).

    3D (Three.js): Catálogo de equipos paramétricos (no modelos rígidos). Un equipo es una composición de primitivas (un tanque es un cilindro + una tapa esférica; una bomba es una voluta + un motor).

    P&ID: Generación de SVG con simbología ISA-5.1. Símbolos paramétricos. Importación de planos escaneados usando IA con "vocabulario controlado" (la IA extrae lo que ve, pero tú lo confirmas antes de agregarlo al grafo).

📦 Módulo 3: El Catálogo y el Layout

    Basado en: Open-Industry-Project (part-sdk).

    Catálogo: Desde el tornillo hasta la caldera. Cada familia tiene un manifiesto (manifest.schema.json) que declara sus propiedades, puertos de conexión y niveles de detalle (LOD).

    Edición: Mover equipos con un dedo. Al mover, las tuberías conectadas se marcan como pending y se estiran o se re-rutean automáticamente.

🌡️ Módulo 4: Simulación de Proceso y Control (PLC/DCS)

    Basado en: Open-Industry-Project (sim/ y plc/) + kerf (verificación).

    Simulación Física: Motor determinista en un Web Worker (10 Hz). Simula Temperatura, Flujo, Presión y Nivel. Tolerancias de balance de masa (nada se crea de la nada).

    Eventos: Apagón eléctrico, pérdida de aire de instrumento, parada de emergencia.

    Capa PLC: Editor integrado de Lenguaje Estructurado (ST) y Ladder. Validación estática del código antes de ejecutar.

    Capa DCS: Interfaz OPC UA para conectar con Foxboro/Honeywell (se necesitará un pequeño Gateway en Node.js para conectar hardware real, pero el navegador solo usa WebSocket).

    HMI: Pantalla de operación con caras de lazo (PV/SP/OP/Man/Auto), alarmas y tendencias, según el estándar ISA-101.

📊 Módulo 5: Cómputos Métricos y Disciplinas

    Basado en: project-template (listas) / core (MTO).

    Qué hace: A partir del grafo, calcula metros de tubería, número de válvulas, cantidad de instrumentos, metros cuadrados de civil, etc.

    Regla de Oro: Ningún número en el cómputo sin una fuente que lo respalde. Exportación a Excel con SheetJS, vinculada a los componentes en 3D.

🎨 Módulo 6: UI/UX y Rendimiento

    Basado en: Open-Industry-Project (render).

    Diseño: Interfaz 100% en español. Estilo profesional, oscuro, tipo SCADA.

    Móvil: Optimizado para Poco X3 Pro (pantalla de ~6.67"). Uso de InstancedMesh para dibujar miles de tornillos sin que el teléfono se quede sin memoria.
