export function montarHud({ catalogo, alColocar, alExportar, alCambiarModo }) {
  const hud = document.getElementById('hud');
  if (!hud) throw new Error('No se encontró el contenedor #hud.');

  hud.innerHTML = `
    <header class="barra" aria-label="Herramientas de edición">
      <button class="accion" id="btn-catalogo" type="button" aria-expanded="false" aria-controls="cajon">☰ <span>Catálogo</span></button>
      <span class="marca"><i class="punto" aria-hidden="true"></i><span>Planta Viva</span><span class="fase">Fase 1</span></span>
      <span class="relleno"></span>
      <button class="accion" id="btn-conexiones" type="button" aria-pressed="false">Conexiones</button>
      <button class="accion accion-principal" id="btn-json" type="button">Exportar JSON</button>
    </header>
    <aside class="cajon" id="cajon" aria-label="Catálogo de equipos" aria-hidden="true" inert>
      <div class="cajon-cab">
        <h2>Catálogo de equipos</h2>
        <input id="buscador" class="buscador" type="search" placeholder="Buscar bomba, tanque…" aria-label="Buscar equipo">
      </div>
      <div id="lista" class="cajon-lista"></div>
    </aside>
    <section id="propiedades" class="propiedades oculto" aria-live="polite" aria-label="Propiedades del equipo seleccionado"></section>
    <div id="avisos" class="avisos" aria-live="polite" aria-atomic="true"></div>
    <aside id="leyenda" class="leyenda oculto" aria-label="Leyenda de tipos de puertos">
      <b>Puertos</b>
      <span><i style="background:#3b82f6"></i>Proceso</span>
      <span><i style="background:#f59e0b"></i>Eléctrico</span>
      <span><i style="background:#22d3ee"></i>Señal</span>
      <span><i style="background:#84cc16"></i>Tierra</span>
    </aside>`;

  const drawer = hud.querySelector('#cajon');
  const lista = hud.querySelector('#lista');
  const buscador = hud.querySelector('#buscador');
  const propiedades = hud.querySelector('#propiedades');
  const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function avisar(texto, error = false) {
    const elemento = document.createElement('div');
    elemento.className = `aviso${error ? ' error' : ''}`;
    elemento.setAttribute('role', error ? 'alert' : 'status');
    elemento.textContent = texto;
    hud.querySelector('#avisos').append(elemento);
    window.setTimeout(() => elemento.remove(), 2800);
  }

  function crearFicha(definicion) {
    const ficha = document.createElement('div');
    ficha.className = 'ficha oculto';
    const descripcion = document.createElement('p');
    descripcion.textContent = definicion.descripcion ?? '';
    ficha.append(descripcion);

    for (const [clave, campo] of Object.entries(definicion.campos ?? {})) {
      const contenedor = document.createElement('div');
      contenedor.className = 'campo';
      const id = `campo-${definicion.id}-${clave}`;
      if (campo.tipo === 'numero') {
        const label = document.createElement('label');
        label.htmlFor = id;
        const nombre = document.createElement('span');
        nombre.textContent = campo.etiqueta;
        const output = document.createElement('output');
        label.append(nombre, output);
        const input = document.createElement('input');
        Object.assign(input, { id, type: 'range', min: campo.min, max: campo.max, step: campo.paso, value: campo.defecto });
        const actualizar = () => { output.textContent = `${input.value} ${campo.unidad ?? ''}`.trim(); };
        input.addEventListener('input', actualizar);
        actualizar();
        contenedor.append(label, input);
      } else {
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = campo.etiqueta;
        const select = document.createElement('select');
        select.id = id;
        for (const opcion of campo.opciones ?? []) {
          const option = document.createElement('option');
          option.value = opcion;
          option.textContent = opcion;
          option.selected = opcion === campo.defecto;
          select.append(option);
        }
        contenedor.append(label, select);
      }
      ficha.append(contenedor);
    }

    const boton = document.createElement('button');
    boton.className = 'colocar';
    boton.type = 'button';
    boton.textContent = 'Elegir y colocar';
    boton.addEventListener('click', () => {
      const params = {};
      ficha.querySelectorAll('input, select').forEach((input) => {
        const clave = input.id.slice(`campo-${definicion.id}-`.length);
        params[clave] = input.type === 'range' ? Number(input.value) : input.value;
      });
      alColocar?.(definicion.id, params);
    });
    ficha.append(boton);
    return ficha;
  }

  function pintarCatalogo(filtro = '') {
    lista.replaceChildren();
    const consulta = filtro.trim().toLocaleLowerCase();
    const categorias = new Map();
    for (const definicion of catalogo) {
      const texto = `${definicion.nombre} ${definicion.codigo} ${definicion.familia} ${definicion.descripcion}`.toLocaleLowerCase();
      if (consulta && !texto.includes(consulta)) continue;
      const categoria = definicion.categoria ?? 'Otros';
      if (!categorias.has(categoria)) categorias.set(categoria, []);
      categorias.get(categoria).push(definicion);
    }

    for (const [categoria, definiciones] of categorias) {
      const titulo = document.createElement('h3');
      titulo.className = 'cat-titulo';
      titulo.textContent = categoria;
      lista.append(titulo);
      for (const definicion of definiciones) {
        const fila = document.createElement('button');
        fila.type = 'button';
        fila.className = 'fila';
        fila.setAttribute('aria-expanded', 'false');
        fila.innerHTML = `<span class="nombre">${escapar(definicion.nombre)}</span><span class="cod">${escapar(definicion.codigo)}</span><span class="chev" aria-hidden="true">＋</span>`;
        const ficha = crearFicha(definicion);
        fila.addEventListener('click', () => {
          const abierta = fila.getAttribute('aria-expanded') === 'true';
          lista.querySelectorAll('.fila').forEach((otra) => { otra.setAttribute('aria-expanded', 'false'); otra.querySelector('.chev').textContent = '＋'; });
          lista.querySelectorAll('.ficha').forEach((otra) => otra.classList.add('oculto'));
          if (!abierta) { fila.setAttribute('aria-expanded', 'true'); fila.querySelector('.chev').textContent = '−'; ficha.classList.remove('oculto'); }
        });
        lista.append(fila, ficha);
      }
    }
    if (!lista.childElementCount) {
      const vacio = document.createElement('p');
      vacio.className = 'sin-resultados';
      vacio.textContent = 'No se encontraron equipos.';
      lista.append(vacio);
    }
  }

  function mostrarPropiedades(componente) {
    if (!componente) { propiedades.classList.add('oculto'); propiedades.replaceChildren(); return; }
    const definicion = catalogo.find((item) => item.id === componente.descriptorId);
    propiedades.innerHTML = `
      <button class="accion cerrar" type="button" aria-label="Cerrar propiedades">×</button>
      <h2>${escapar(componente.nombre ?? definicion?.nombre ?? componente.tipo)}</h2>
      <span class="tag">${escapar(componente.tag)}</span>
      <dl><dt>ID</dt><dd>${escapar(componente.id)}</dd><dt>Puertos</dt><dd>${componente.puertos?.length ?? 0}</dd></dl>`;
    propiedades.querySelector('.cerrar').addEventListener('click', () => mostrarPropiedades(null));
    propiedades.classList.remove('oculto');
  }

  buscador.addEventListener('input', () => pintarCatalogo(buscador.value));
  pintarCatalogo();
  hud.querySelector('#btn-catalogo').addEventListener('click', (evento) => {
    const abierto = drawer.classList.toggle('abierto');
    drawer.setAttribute('aria-hidden', String(!abierto));
    drawer.inert = !abierto;
    evento.currentTarget.setAttribute('aria-expanded', String(abierto));
    if (abierto) buscador.focus();
  });
  hud.querySelector('#btn-json').addEventListener('click', () => alExportar?.());
  hud.querySelector('#btn-conexiones').addEventListener('click', (evento) => {
    const activo = evento.currentTarget.getAttribute('aria-pressed') !== 'true';
    evento.currentTarget.setAttribute('aria-pressed', String(activo));
    hud.querySelector('#leyenda').classList.toggle('oculto', !activo);
    alCambiarModo?.(activo);
  });

  return {
    aviso: avisar,
    mostrarPropiedades,
    abrirCajon(abierto = true) {
      drawer.classList.toggle('abierto', abierto);
      drawer.setAttribute('aria-hidden', String(!abierto));
      drawer.inert = !abierto;
      hud.querySelector('#btn-catalogo').setAttribute('aria-expanded', String(abierto));
    }
  };
}
