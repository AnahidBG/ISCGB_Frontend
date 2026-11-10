import { TestBed } from '@angular/core/testing';
import { Boton } from './boton';

describe('Boton', () => {
  it('el host es inline-flex, así el botón ocupa todo su alto y queda alineado con los de al lado', async () => {
    const fixture = TestBed.createComponent(Boton);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.classList).toContain('inline-flex');
    expect(host.classList).not.toContain('w-full');

    fixture.componentRef.setInput('anchoCompleto', true);
    await fixture.whenStable();

    expect(host.classList).toContain('w-full');
  });
});
