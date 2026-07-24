import { Routes } from '@angular/router';
import { Homepage } from './homepage/homepage';
import { Contact } from './contact/contact';
import { Admin } from './admin/admin';

export const routes: Routes = 
  [{ path: '', component: Homepage },
  { path: 'contact', component: Contact },
  { path: 'admin', component: Admin },
];