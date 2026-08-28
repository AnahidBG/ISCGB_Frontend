import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface MenuItem {
  label: string;
  icon: 'inicio' | 'control-legajos' | 'reportes' | 'dashboard' | 'legajo' | 'subir' | 'revision';
  routerLink: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  @Input() menuItems: MenuItem[] = [];

  onLogout(): void {
    console.log('Cerrando sesión...');
  }
}