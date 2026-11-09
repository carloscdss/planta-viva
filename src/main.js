const hud = montarHud({ 
    alExportar: () => { console.log(JSON.stringify(grafo.aJSON(), null, 2)); alert("JSON copiado en consola"); },
    alCambiarModo: (activo) => { modoConexiones = activo; },
    alColocar: (familia, params) => { /* lógica para colocar */ }
});

window.colocarGabinete = () => { hud.avisar("Haz clic en el suelo para colocar Gabinete"); familiaActiva = 'gabinete'; };
window.colocarBomba = () => { hud.avisar("Haz clic en el suelo para colocar Bomba"); familiaActiva = 'bomba'; };