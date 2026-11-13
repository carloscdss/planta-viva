// src/modelo/grafo-v2.js
import { GestorComandos, Comando } from './comando.js';

export class GrafoV2 {
    constructor() {
        this.componentes = new Map(); // id -> Componente
        this.conexiones = new Map();  // id -> Conexion
        this.gestorComandos = new GestorComandos();
    }

    // 1. Agregar Componente (Equipo)
    agregarComponente(componente) {
        if (this.componentes.has(componente.id)) {
            throw new Error(`El componente con ID ${componente.id} ya existe.`);
        }
        
        // Validar que el Tag sea único
        for (let c of this.componentes.values()) {
            if (c.tag === componente.tag) {
                throw new Error(`El Tag ${componente.tag} ya está en uso.`);
            }
        }

        const comando = new Comando(
            () => this.componentes.set(componente.id, componente),
            () => this.componentes.delete(componente.id)
        );
        this.gestorComandos.ejecutar(comando);
    }

    // 2. Eliminar Componente (y sus conexiones)
    eliminarComponente(id) {
        if (!this.componentes.has(id)) return;

        const componente = this.componentes.get(id);
        const conexionesAfectadas = [];
        
        // Buscar conexiones que usen este componente
        for (let [idConexion, conexion] of this.conexiones.entries()) {
            if (conexion.componenteA.id === id || conexion.componenteB.id === id) {
                conexionesAfectadas.push({ id: idConexion, conexion });
            }
        }

        const comando = new Comando(
            () => {
                this.componentes.delete(id);
                conexionesAfectadas.forEach(c => this.conexiones.delete(c.id));
            },
            () => {
                this.componentes.set(id, componente);
                conexionesAfectadas.forEach(c => this.conexiones.set(c.id, c.conexion));
            }
        );
        this.gestorComandos.ejecutar(comando);
    }

    // 3. Mover Componente (Actualizar posición)
    moverComponente(id, nuevaPosicion, nuevaRotacion) {
        const componente = this.componentes.get(id);
        if (!componente) return;

        // Guardamos copia segura de la posición y rotación viejas
        const posVieja = { x: componente.posicion.x, y: componente.posicion.y, z: componente.posicion.z };
        const rotVieja = componente.rotacionY;

        const comando = new Comando(
            () => {
                // Aplicamos los nuevos valores
                componente.posicion.x = nuevaPosicion.x;
                componente.posicion.y = nuevaPosicion.y;
                componente.posicion.z = nuevaPosicion.z;
                componente.rotacionY = nuevaRotacion;
                if (componente.actualizarMalla) componente.actualizarMalla();
            },
            () => {
                // Restauramos los valores viejos
                componente.posicion.x = posVieja.x;
                componente.posicion.y = posVieja.y;
                componente.posicion.z = posVieja.z;
                componente.rotacionY = rotVieja;
                if (componente.actualizarMalla) componente.actualizarMalla();
            }
        );
        this.gestorComandos.ejecutar(comando);
    }

    // 4. Conectar Componentes
    agregarConexion(conexion) {
        if (this.conexiones.has(conexion.id)) return;
        
        const comando = new Comando(
            () => this.conexiones.set(conexion.id, conexion),
            () => this.conexiones.delete(conexion.id)
        );
        this.gestorComandos.ejecutar(comando);
    }

    // 5. Exportar para guardar o P&ID
    aJSON() {
        return {
            componentes: Array.from(this.componentes.values()).map(c => c.aJSON()),
            conexiones: Array.from(this.conexiones.values()).map(c => c.aJSON())
        };
    }

    // 6. Undo / Redo
    undo() { return this.gestorComandos.undo(); }
    redo() { return this.gestorComandos.redo(); }
}
