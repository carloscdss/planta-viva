export class Grafo {
  #componentes = new Map();
  #conexiones = new Map();

  agregar(componente) {
    if (this.#componentes.has(componente.id)) throw new Error(`El componente ${componente.id} ya existe.`);
    this.#componentes.set(componente.id, componente);
    return componente;
  }

  obtener(id) { return this.#componentes.get(id) ?? null; }
  listar() { return [...this.#componentes.values()]; }
  listarConexiones() { return [...this.#conexiones.values()]; }

  conectar(componenteA, puertoA, componenteB, puertoB) {
    if (componenteA === componenteB) throw new Error('No se puede conectar un componente consigo mismo.');
    const componente1 = this.obtener(componenteA);
    const componente2 = this.obtener(componenteB);
    const a = componente1?.puertos.find((puerto) => puerto.id === puertoA);
    const b = componente2?.puertos.find((puerto) => puerto.id === puertoB);
    if (!a || !b) throw new Error('No se encontraron ambos puertos en el grafo.');
    if (a.tipo !== b.tipo) throw new Error('Los puertos no son compatibles.');
    if (a.conectadoA || b.conectadoA) throw new Error('Uno de los puertos ya está conectado.');

    const id = `${componenteA}:${puertoA}--${componenteB}:${puertoB}`;
    const conexion = {
      id,
      tipo: a.tipo,
      extremoA: { componenteId: componenteA, puertoId: puertoA },
      extremoB: { componenteId: componenteB, puertoId: puertoB }
    };
    a.conectadoA = { componenteId: componenteB, puertoId: puertoB };
    b.conectadoA = { componenteId: componenteA, puertoId: puertoA };
    this.#conexiones.set(id, conexion);
    return conexion;
  }

  aJSON() {
    return {
      componentes: this.listar().map((componente) => componente.aJSON()),
      conexiones: this.listarConexiones()
    };
  }
}
