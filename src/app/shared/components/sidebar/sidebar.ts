import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  label: string;
  iconSvg: string; // SVG del ícono en texto puro o identificador
  routerLink: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent {
  @Input() menuItems: MenuItem[] = [];

  onLogout(): void {
    // Lógica o evento de cierre de sesión
    console.log('Cerrando sesión...');
  }
}