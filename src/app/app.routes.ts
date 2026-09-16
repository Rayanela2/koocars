import { Routes } from '@angular/router';
import { Homepage } from './homepage/homepage';
import { Contact } from './contact/contact';
import { Admin } from './admin/admin';
import { Processus } from './processus/processus';
import { Vehicule } from './vehicule/vehicule';

export const routes: Routes = [
  { path: '', component: Homepage, pathMatch: 'full' },
  { path: 'contact', component: Contact },
  { path: 'admin', component: Admin },
  { path: 'processus', component: Processus },
  { path: 'vehicules/:marque', component: Vehicule },
  { path: 'vehicules', component: Vehicule },
];