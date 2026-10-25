import {
  LARGO_MINIMO_PASSWORD,
  estadoDelRequisito,
  evaluarPassword,
  nivelDeProgreso,
  passwordCumpleTodo,
} from './password';

describe('evaluarPassword', () => {
  it('marca cuáles de las cinco reglas cumple una contraseña a medias', () => {
    const resultado = evaluarPassword('clave123', '');
    const cumple = (clave: string) => resultado.find((r) => r.clave === clave)?.cumple;

    expect(resultado.length).toBe(5);
    expect(cumple('largo')).toBe(true);
    expect(cumple('mayuscula')).toBe(false);
    expect(cumple('minuscula')).toBe(true);
    expect(cumple('numero')).toBe(true);
    expect(cumple('sin-dni')).toBe(true);
  });

  it('la regla de largo pide al menos el mínimo de caracteres', () => {
    const largo = (password: string) =>
      evaluarPassword(password).find((r) => r.clave === 'largo')?.cumple;

    expect(largo('a'.repeat(LARGO_MINIMO_PASSWORD - 1))).toBe(false);
    expect(largo('a'.repeat(LARGO_MINIMO_PASSWORD))).toBe(true);
  });

  it('rechaza una contraseña que contiene el DNI', () => {
    const sinDni = (password: string) =>
      evaluarPassword(password, '43.880.335').find((r) => r.clave === 'sin-dni')?.cumple;

    expect(sinDni('Clave43880335')).toBe(false);
    expect(sinDni('Clave1234')).toBe(true);
  });
});

describe('passwordCumpleTodo', () => {
  it('acepta una contraseña que cumple todo y rechaza la que no', () => {
    expect(passwordCumpleTodo('Clave1234')).toBe(true);
    expect(passwordCumpleTodo('clave1234')).toBe(false);
    expect(passwordCumpleTodo('')).toBe(false);
  });
});

describe('estadoDelRequisito', () => {
  it('cumplido cuando hay texto y la regla se cumple', () => {
    expect(estadoDelRequisito(true, true)).toBe('cumplido');
  });

  it('falta cuando ya se empezó a escribir y la regla no se cumple', () => {
    expect(estadoDelRequisito(false, true)).toBe('falta');
  });

  it('pendiente con el campo vacío: todavía no se reta a nadie', () => {
    expect(estadoDelRequisito(false, false)).toBe('pendiente');
  });

  it('con el campo vacío, una regla que "cumple por vacío" tampoco se tilda', () => {
    expect(estadoDelRequisito(true, false)).toBe('pendiente');
  });

  it('resaltarFaltantes fuerza el rojo aunque no se haya escrito nada', () => {
    expect(estadoDelRequisito(false, false, true)).toBe('falta');
    expect(estadoDelRequisito(true, false, true)).toBe('falta');
  });

  it('resaltarFaltantes no apaga lo que ya está cumplido', () => {
    expect(estadoDelRequisito(true, true, true)).toBe('cumplido');
  });
});

describe('nivelDeProgreso', () => {
  it.each([
    [0, 5, 'vacio'],
    [1, 5, 'bajo'],
    [2, 5, 'bajo'],
    [3, 5, 'medio'],
    [4, 5, 'medio'],
    [5, 5, 'completo'],
    [0, 4, 'vacio'],
    [2, 4, 'medio'],
    [4, 4, 'completo'],
  ])('%i de %i requisitos es nivel "%s"', (cumplidos, total, esperado) => {
    expect(nivelDeProgreso(cumplidos, total)).toBe(esperado);
  });

  it('sin requisitos que cumplir no hay progreso que mostrar', () => {
    expect(nivelDeProgreso(0, 0)).toBe('vacio');
  });
});
