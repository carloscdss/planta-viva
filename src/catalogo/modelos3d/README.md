# Modelos 3D escaneados

Esta carpeta está reservada para modelos GLB propios del proyecto, por ejemplo:

- `tanque_real.glb`
- `valvula_real.glb`

Los archivos binarios de escaneo no se generan como marcadores vacíos. Añade aquí los modelos reales cuando estén disponibles. Mientras tanto, tanque y válvula se dibujan con geometría paramétrica de Three.js y no requieren activos externos.

Para cargar un GLB en la escena será necesario integrar `GLTFLoader` y definir cómo centrar, escalar y orientar cada modelo respecto de sus puertos y dimensiones. Esa carga no se activa hasta que existan archivos válidos para evitar errores 404 y que el catálogo deje de iniciar.
