export const UNIDADES = Object.freeze({ longitud: 'm', angulo: 'rad' });

export function metros(valor) {
  if (!Number.isFinite(valor)) throw new TypeError('La medida debe ser un número finito.');
  return valor;
}
