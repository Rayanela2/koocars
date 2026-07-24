import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lrtgndbxlfsuqzfsjxou.supabase.co';
const SUPABASE_KEY = 'sb_publishable_o5vCvXWbIyYNFEWeCkRJiA_NbjtFbY_';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

  // AUTH
  signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.client.auth.signOut();
  }

  getUser() {
    return this.client.auth.getUser();
  }

  // VOITURES
getCars(page = 0, limit = 50) {
  return this.client
    .from('cars')
    .select('*')
    .range(page * limit, (page + 1) * limit - 1);
}

getCarsByMarque(marque: string, limit = 6) {
  return this.client
    .from('cars')
    .select('*')
    .eq('marque', marque)
    .limit(limit);
}
  addCar(car: any) {
    return this.client.from('cars').insert(car);
  }

  deleteCar(id: number) {
    return this.client.from('cars').delete().eq('id', id);
  }

  // PHOTOS
  uploadPhoto(file: File, path: string) {
    return this.client.storage.from('car-photos').upload(path, file);
  }

  getPhotoUrl(path: string) {
    return this.client.storage.from('car-photos').getPublicUrl(path).data.publicUrl;
  }
}