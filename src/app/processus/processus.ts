import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-processus',
  imports: [RouterLink],
  templateUrl: './processus.html',
  styleUrl: './processus.css',
})
export class Processus {
  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }
}
