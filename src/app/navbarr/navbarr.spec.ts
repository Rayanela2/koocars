import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Navbarr } from './navbarr';

describe('Navbarr', () => {
  let component: Navbarr;
  let fixture: ComponentFixture<Navbarr>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbarr]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Navbarr);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
