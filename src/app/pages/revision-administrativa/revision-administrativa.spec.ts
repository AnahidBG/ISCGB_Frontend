import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RevisionAdministrativa } from './revision-administrativa';

describe('RevisionAdministrativa', () => {
  let component: RevisionAdministrativa;
  let fixture: ComponentFixture<RevisionAdministrativa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevisionAdministrativa],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisionAdministrativa);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
