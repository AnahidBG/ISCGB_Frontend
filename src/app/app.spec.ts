import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('arranca el tema: deja puesto data-tema en <html> desde el primer ciclo', async () => {
    document.documentElement.removeAttribute('data-tema');

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    TestBed.inject(ApplicationRef).tick();

    expect(['claro', 'oscuro']).toContain(document.documentElement.getAttribute('data-tema'));
  });

  it('se crea sin errores', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
