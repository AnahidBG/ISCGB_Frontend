import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface DocenteLegajo {
  idDocente: number;
  nombre: string;
  dni: string;
  materia: string;
  iniciales: string;
  progreso: number;
  estado: 'Completo' | 'En Proceso';
}

@Component({
  selector: 'app-control-legajos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './control-legajos.html',
  styleUrl: './control-legajos.scss'
})
export class ControlLegajosComponent {

 //Creamos una lista ficticia (Mock) para diseñar y ver la interfaz en tiempo real sin depender del backend
  docentes: DocenteLegajo[] = [
    {
      idDocente: 1,
      nombre: 'Docente Ejemplo 1',
      dni: '30.123.456',
      materia: 'Materia A',
      iniciales: 'D1',
      progreso: 100,
      estado: 'Completo'
    },
    {
      idDocente: 2,
      nombre: 'Docente Ejemplo 2',
      dni: '28.987.654',
      materia: 'Materia B',
      iniciales: 'D2',
      progreso: 60,
      estado: 'En Proceso'
    }
  ];

  constructor(private router: Router) {}

  revisarLegajo(idDocente: number): void {
    console.log('Revisar legajo del docente ID:', idDocente);
  }
}