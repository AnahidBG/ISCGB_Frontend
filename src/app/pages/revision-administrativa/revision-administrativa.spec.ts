import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionAdministrativaComponent } from './revision-administrativa';

describe('RevisionAdministrativa', () => {
  let component: RevisionAdministrativaComponent;
  let fixture: ComponentFixture<RevisionAdministrativaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevisionAdministrativaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisionAdministrativaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
