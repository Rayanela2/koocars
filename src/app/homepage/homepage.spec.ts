import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Homepage } from './homepage';
import { SupabaseService } from '../services/supabase.service';

describe('Homepage', () => {
  let component: Homepage;
  let fixture: ComponentFixture<Homepage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Homepage],
      providers: [
        {
          provide: SupabaseService,
          useValue: {
            getCarsByMarque: jasmine.createSpy('getCarsByMarque').and.returnValue(Promise.resolve({ data: [] }))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Homepage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fallback to local catalog data when Supabase returns no vehicles', async () => {
    await component.loadCars();
    expect(component.cars.length).toBeGreaterThan(0);
  });
});
