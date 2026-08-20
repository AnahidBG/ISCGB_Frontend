import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsigniaEstado } from './insignia-estado';

describe('InsigniaEstado', () => {
  let component: InsigniaEstado;
  let fixture: ComponentFixture<InsigniaEstado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsigniaEstado],
    }).compileComponents();

    fixture = TestBed.createComponent(InsigniaEstado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
