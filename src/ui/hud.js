export function montarHud({ catalogo, alColocar, alExportar, alCambiarModo }) {
  const hud = document.getElementById('hud');
  if (!hud) throw new Error('No se encontró el contenedor #hud.');

  hud.innerHTML = `
    <header class="barra">
      <button class="accion" id="btn-catalogo" aria-expanded="false" aria-controls="cajon">☰ Catálogo</button>
      <span class="marca"><i class="punto"></i>Planta Viva <span class="fase">Fase 1</span></span>
      <span class="relleno"></span>
      <button class="accion" id="btn-conexiones" aria-pressed="false">Conexiones</button>
      <button class="accion accion-principal" id="btn-json">Exportar JSON</button>
    </header>
    <aside class="cajon" id="cajon" aria-label="Catálogo de equipos" aria-hidden="true">
      <div class="cajon-cab"><h2>Catálogo</h2><input id="buscador" class="buscador" type="search" placeholder="Buscar bomba, tanque…" aria-label="Buscar equipo"></div>
      <div id="lista" class="cajon-lista"></div>
    </aside>
    <section id="propiedades" class="propiedades oculto" aria-live="polite"></section>
    <div id="avisos" class="avisos" aria-live="polite" aria-atomic="true"></div>
    <aside id="leyenda" class="leyenda oculto" aria-label="Leyenda de tipos de puertos">
      <b>Puertos</b>
      <span><i style="background:#3b82f6"></i>Proceso</span><span><i style="background:#f59e0b"></i>Eléctrico</span><span><i style="background:#22d3ee"></i>Señal</span><span><i style="background:#84cc16"></i>Tierra</span>
    </aside>`;

  const drawer = hud.querySelector('#cajon');
  const lista = hud.querySelector('#lista');
  const buscador = hud.querySelector('#buscador');
  const propiedades = hud.querySelector('#propiedades');
  const leyenda = hud.querySelector('#leyenda');
  const escapar = (valor) => String(valor).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function avisar(texto, error = false) {
    const elemento = document.createElement('div');
    elemento.className = `aviso${error ? ' error' : ''}`;
    elemento.textContent = texto;
    hud.querySelector('#avisos').append(elemento);
    window.setTimeout(() => elemento.remove(), 2800);
  }

  function crearFicha(definicion) {
    const ficha = document.createElement('div');
    ficha.className = 'ficha oculto';
    ficha.innerHTML = `<p>${escapar(definicion.descripcion ?? '')}</p>`;

    for (const [clave, campo] of Object.entries(definicion.campos ?? {})) {
      const contenedor = document.createElement('div');
      contenedor.className = 'campo';
      const id = `campo-${definicion.id}-${clave}`;
      if (campo.tipo === 'numero') {
        contenedor.innerHTML = `<label for="${id}"><span>${escapar(campo.etiqueta)}</span><output></output></label><input id="${id}" type="range" min="${campo.min}" max="${campo.max}" step="${campo.paso}" value="${campo.defecto}">`;
        const input = contenedor.querySelector('input');
        const output = contenedor.querySelector('output');
        const actualizar = () => { output.textContent = `${input.value} ${campo.unidad ?? ''}`.trim(); };
        input.addEventListener('input', actualizar);
        actualizar();
      } else {
        contenedor.innerHTML = `<label for="${id}">${escapar(campo.etiqueta)}</label><select id="${id}">${(campo.opciones ?? []).map((opcion) => `<option value="${escapar(opcion)}" ${opcion === campo.defecto ? 'selected' : ''}>${escapar(opcion)}</option>`).join('')}</select>`;
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
      alColocar(definicion.id, params);
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
      if (!categorias.has(definicion.categoria)) categorias.set(definicion.categoria, []);
      categorias.get(definicion.categoria).push(definicion);
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
        fila.innerHTML = `<span class="nombre">${escapar(definicion.nombre)}</span><span class="cod">${escapar(definicion.codigo)}</span><span class="chev">＋</span>`;
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
    const filas = [
      ['ID', componente.id.slice(0, 8)],
      ['Familia', componente.familia ?? componente.tipo],
      ['Puertos', componente.puertos.length],
      ['Huella', `${componente.area ?? '—'} m²`],
      ...Object.entries(componente.params ?? {}).map(([clave, valor]) => [definicion?.campos?.[clave]?.etiqueta ?? clave, `${valor} ${definicion?.campos?.[clave]?.unidad ?? ''}`.trim()])
    ];
    propiedades.innerHTML = `<button class="accion cerrar" type="button" aria-label="Cerrar propiedades">×</button><h2>${escapar(definicion?.nombre ?? componente.tipo)}</h2><span class="tag">${escapar(componente.tag)}</span><dl>${filas.map(([etiqueta, valor]) => `<dt>${escapar(etiqueta)}</dt><dd>${escapar(valor)}</dd>`).join('')}</dl>`;
    propiedades.querySelector('.cerrar').addEventListener('click', () => mostrarPropiedades(null));
    propiedades.classList.remove('oculto');
  }

  buscador.addEventListener('input', () => pintarCatalogo(buscador.value));
  pintarCatalogo();
  hud.querySelector('#btn-catalogo').addEventListener('click', (evento) => {
    const abierto = drawer.classList.toggle('abierto');
    drawer.setAttribute('aria-hidden', String(!abierto));
    evento.currentTarget.setAttribute('aria-expanded', String(abierto));
    if (abierto) buscador.focus();
  });
  hud.querySelector('#btn-json').addEventListener('click', () => alExportar?.());
  hud.querySelector('#btn-conexiones').addEventListener('click', (evento) => {
    const activo = evento.currentTarget.getAttribute('aria-pressed') !== 'true';
    evento.currentTarget.setAttribute('aria-pressed', String(activo));
    leyenda.classList.toggle('oculto', !activo);
    alCambiarModo?.(activo);
  });

  return {
    aviso: avisar,
    mostrarPropiedades,
    abrirCajon(abierto = true) {
      drawer.classList.toggle('abierto', abierto);
      drawer.setAttribute('aria-hidden', String(!abierto));
      hud.querySelector('#btn-catalogo').setAttribute('aria-expanded', String(abierto));
    }
  };
}
