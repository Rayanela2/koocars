import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Processus } from './processus';

describe('Processus', () => {
  let component: Processus;
  let fixture: ComponentFixture<Processus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Processus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Processus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
