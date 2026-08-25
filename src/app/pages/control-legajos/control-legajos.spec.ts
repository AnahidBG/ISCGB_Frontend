import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlLegajos } from './control-legajos';

describe('ControlLegajos', () => {
  let component: ControlLegajos;
  let fixture: ComponentFixture<ControlLegajos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlLegajos],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlLegajos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
