import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CargadorGlobal } from './core/carga/cargador-global';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CargadorGlobal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('iscgb-frontend');
}
