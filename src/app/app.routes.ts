import { Routes } from '@angular/router';
import { Homepage } from './homepage/homepage';
import { CarDetail } from './car-detail/car-detail';
import { Contact } from './contact/contact';
import { Admin } from './admin/admin';

export const routes: Routes = 
  [{ path: '', component: Homepage },
  { path: 'voiture/:id', component: CarDetail },
  { path: 'contact', component: Contact },
  { path: 'admin', component: Admin },
];