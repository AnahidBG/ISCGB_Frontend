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
  styleUrls: ['./control-legajos.scss']
})
export class ControlLegajosComponent {

  docentes: DocenteLegajo[] = [
    {
      idDocente: 1,
      nombre: 'Docente Ejemplo 1',
      dni: '32.456.789',
      materia: 'Control de Proyectos',
      iniciales: 'DM',
      progreso: 100,
      estado: 'Completo'
    },
    {
      idDocente: 2,
      nombre: 'Docente Ejemplo 2',
      dni: '28.123.456',
      materia: 'Interface de Usuario',
      iniciales: 'SM',
      progreso: 60,
      estado: 'En Proceso'
    },
    {
      idDocente: 3,
      nombre: 'Docente Ejemplo 3',
      dni: '32.456.789',
      materia: 'Práctica Profes. II (IDS)',
      iniciales: 'DM',
      progreso: 100,
      estado: 'Completo'
    },
    {
      idDocente: 4,
      nombre: 'Docente Ejemplo 4',
      dni: '32.456.789',
      materia: 'Práctica Profes. III (Implementación)',
      iniciales: 'DM',
      progreso: 75,
      estado: 'En Proceso'
    },
    {
      idDocente: 5,
      nombre: 'Docente Ejemplo 5',
      dni: '33.890.123',
      materia: 'Inglés',
      iniciales: 'AA',
      progreso: 100,
      estado: 'Completo'
    },
    {
      idDocente: 6,
      nombre: 'Docente Ejemplo 6',
      dni: '29.456.789',
      materia: 'Ingeniería de Software',
      iniciales: 'BA',
      progreso: 45,
      estado: 'En Proceso'
    },
    {
      idDocente: 7,
      nombre: 'Docente Ejemplo 7',
      dni: '28.123.456',
      materia: 'Programación III',
      iniciales: 'SM',
      progreso: 80,
      estado: 'En Proceso'
    },
    {
      idDocente: 8,
      nombre: 'Docente Ejemplo 8',
      dni: '33.890.123',
      materia: 'Inglés Técnico',
      iniciales: 'AA',
      progreso: 100,
      estado: 'Completo'
    }
  ];

  constructor(private router: Router) {}

  revisarLegajo(idDocente: number): void {
    console.log('Revisar legajo del docente ID:', idDocente);
  }
}