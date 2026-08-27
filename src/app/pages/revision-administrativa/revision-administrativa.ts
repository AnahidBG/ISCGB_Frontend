import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent, MenuItem } from '../../shared/components/sidebar/sidebar';

interface DocumentoPendiente {
  id: number;
  docente: string;
  archivo: string;
  categoria: string;
  fecha: string;
  estado: string;
}

@Component({
  selector: 'app-revision-administrativa',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './revision-administrativa.html',
  styleUrl: './revision-administrativa.scss',
})
export class RevisionAdministrativaComponent {
  filtroTab: 'pendientes' | 'historial' = 'pendientes';
  busqueda: string = '';
  comentario: string = '';

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      routerLink: '/dashboard',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`
    },
    {
      label: 'Mi Legajo',
      routerLink: '/mi-legajo',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
    },
    {
      label: 'Subir Documento',
      routerLink: '/subir-documento',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`
    },
    {
      label: 'Revisión Administrativa',
      routerLink: '/revision-administrativa',
      iconSvg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
    }
  ];

  documentos: DocumentoPendiente[] = [
    { id: 1, docente: 'Prof. 1', archivo: 'Constancia_CUIL.pdf', categoria: 'Laboral', fecha: '10/05/2026', estado: 'pendiente' },
    { id: 2, docente: 'Prof. 2', archivo: 'Titulo_Especializacion.pdf', categoria: 'Títulos', fecha: '11/05/2026', estado: 'pendiente' },
    { id: 3, docente: 'Prof. 3', archivo: 'Apto_Psicofisico.pdf', categoria: 'Salud', fecha: '11/05/2026', estado: 'pendiente' },
    { id: 4, docente: 'Prof. 4', archivo: 'DNI_Actualizado_2026.pdf', categoria: 'Identidad', fecha: '12/05/2026', estado: 'pendiente' }
  ];

  docSeleccionado: DocumentoPendiente = this.documentos[0];

  seleccionarDoc(doc: DocumentoPendiente) {
    this.docSeleccionado = doc;
  }
}