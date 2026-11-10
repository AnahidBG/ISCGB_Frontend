import { aRolMesa, rolEnOracion } from './rol-mesa';

describe('aRolMesa', () => {
  it('lee los tres lugares del tribunal con su escritura oficial', () => {
    expect(aRolMesa('Presidente')).toBe('Presidente');
    expect(aRolMesa(' vocal1 ')).toBe('Vocal 1');
    expect(aRolMesa('VOCAL 2')).toBe('Vocal 2');
  });

  it('lo que no es un lugar del tribunal queda en null', () => {
    expect(aRolMesa(undefined)).toBeNull();
    expect(aRolMesa('Suplente')).toBeNull();
    expect(aRolMesa(3)).toBeNull();
  });
});

describe('rolEnOracion', () => {
  it('va en minúscula, para usar dentro de una oración', () => {
    expect(rolEnOracion('Presidente')).toBe('presidente');
    expect(rolEnOracion('Vocal 1')).toBe('vocal 1');
  });
});
