import { Component } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, Sidebar, Navbar],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {

}
