import { CalendarioDelMes } from '../examenes/modelos/calendario-del-mes';
import { motivoSinLugar } from './lugar-en-el-dia';

describe('motivoSinLugar', () => {
  const calendario: CalendarioDelMes = {
    limite: 2,
    dias: [
      { fecha: '2026-11-20', cantidad: 2, limite: 2, estado: 'completo' },
      { fecha: '2026-11-21', cantidad: 1, limite: 2, estado: 'ocupado' },
    ],
  };

  it('un día completo no tiene lugar: dice el límite y que las mesas también cuentan', () => {
    expect(motivoSinLugar(calendario, '2026-11-20')).toBe(
      'Ese día ya alcanzó el límite de 2 parciales por día, y las mesas de examen también ' +
        'cuentan. Elegí otra fecha.',
    );
  });

  it('un día con lugar, o que el calendario no lista, no tiene motivo', () => {
    expect(motivoSinLugar(calendario, '2026-11-21')).toBeNull();
    expect(motivoSinLugar(calendario, '2026-11-22')).toBeNull();
  });
});
