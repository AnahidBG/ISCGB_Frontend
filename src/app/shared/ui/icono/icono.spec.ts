import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icono } from './icono';

describe('Icono', () => {
  let component: Icono;
  let fixture: ComponentFixture<Icono>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Icono],
    }).compileComponents();

    fixture = TestBed.createComponent(Icono);
    fixture.componentRef.setInput('nombre', 'panel');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dibuja un solo <svg> por ícono', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('svg').length).toBe(1);
  });
});
