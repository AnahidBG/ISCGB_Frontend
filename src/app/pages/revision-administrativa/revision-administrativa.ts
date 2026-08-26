import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './revision-administrativa.html',
  styleUrl: './revision-administrativa.scss',
})
export class RevisionAdministrativaComponent {
  filtroTab: 'pendientes' | 'historial' = 'pendientes';
  busqueda: string = '';
  comentario: string = '';

  documentos: DocumentoPendiente[] = [
    { id: 1, docente: 'Prof. 1', archivo: 'Constancia_CUIL.pdf', categoria: 'Laboral', fecha: '10/05/2026', estado: 'pendiente' },
    { id: 2, docente: 'Prof. 2', archivo: 'Titulo_Especializacion.pdf', categoria: 'Títulos', fecha: '11/05/2026', estado: 'pendiente' },
    { id: 3, docente: 'Prof. 3', archivo: 'Apto_Psicofisico.pdf', categoria: 'Salud', fecha: '11/05/2026', estado: 'pendiente' },
    { id: 4, docente: 'Prof. 4', archivo: 'DNI_Actualizado_2026.pdf', categoria: 'Identidad', fecha: '12/05/2026', estado: 'pendiente' }
  ];

  docSeleccionado: DocumentoPendiente = this.documentos[0];

  seleccionarDoc(doc: DocumentoPendiente){
    this.docSeleccionado = doc;
  }
}
