// src/modelo/comando.js
// Patrón de Diseño: Command (Comando) para Undo/Redo
export class Comando {
    constructor(ejecutar, deshacer) {
        this.ejecutar = ejecutar;
        this.deshacer = deshacer;
    }
}

export class GestorComandos {
    constructor() {
        this.historial = [];
        this.indice = -1;
    }

    ejecutar(comando) {
        // Si hay comandos "deshacer" en el futuro, los borramos
        this.historial = this.historial.slice(0, this.indice + 1);
        comando.ejecutar();
        this.historial.push(comando);
        this.indice++;
    }

    undo() {
        if (this.indice >= 0) {
            this.historial[this.indice].deshacer();
            this.indice--;
            return true;
        }
        return false;
    }

    redo() {
        if (this.indice < this.historial.length - 1) {
            this.indice++;
            this.historial[this.indice].ejecutar();
            return true;
        }
        return false;
    }
}
