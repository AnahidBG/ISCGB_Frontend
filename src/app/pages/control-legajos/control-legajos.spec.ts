import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlLegajosComponent } from './control-legajos';

describe('ControlLegajos', () => {
  let component: ControlLegajosComponent;
  let fixture: ComponentFixture<ControlLegajosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlLegajosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlLegajosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
