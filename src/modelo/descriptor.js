import { CONFIG } from '../config.js';

export function validarDescriptor(descriptor) {
  const errores = [];
  if (!descriptor || typeof descriptor !== 'object') return { valido: false, errores: ['El descriptor debe ser un objeto.'] };
  if (typeof descriptor.tipo !== 'string' || !descriptor.tipo.trim()) errores.push('El descriptor necesita un tipo.');
  if (!descriptor.id || typeof descriptor.id !== 'string') errores.push('El descriptor necesita un ID de catálogo.');

  const dimensiones = descriptor.dimensiones;
  if (!dimensiones || typeof dimensiones !== 'object') {
    errores.push('Faltan las dimensiones del componente.');
  } else {
    for (const eje of ['ancho', 'alto', 'profundidad']) {
      const valor = dimensiones[eje];
      if (!Number.isFinite(valor) || valor < CONFIG.minComponentDimension || valor > CONFIG.maxComponentDimension) {
        errores.push(`La dimensión "${eje}" debe estar entre ${CONFIG.minComponentDimension} y ${CONFIG.maxComponentDimension} m.`);
      }
    }
  }

  if (descriptor.puertos !== undefined && !Array.isArray(descriptor.puertos)) errores.push('Los puertos deben ser una lista.');
  for (const [indice, puerto] of (descriptor.puertos ?? []).entries()) {
    if (!puerto || typeof puerto.id !== 'string' || typeof puerto.tipo !== 'string') errores.push(`El puerto ${indice} necesita ID y tipo.`);
    if (puerto.posicion && ['x', 'y', 'z'].some((eje) => !Number.isFinite(puerto.posicion[eje]))) errores.push(`La posición del puerto ${indice} no es válida.`);
  }
  return { valido: errores.length === 0, errores };
}

export function exigirDescriptorValido(descriptor) {
  const resultado = validarDescriptor(descriptor);
  if (!resultado.valido) throw new TypeError(`Descriptor inválido: ${resultado.errores.join(' ')}`);
  return descriptor;
}
