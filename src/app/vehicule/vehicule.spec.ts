import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Vehicule } from './vehicule';

describe('Vehicule', () => {
  let component: Vehicule;
  let fixture: ComponentFixture<Vehicule>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Vehicule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Vehicule);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
