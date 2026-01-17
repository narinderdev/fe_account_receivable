import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chart, registerables } from 'chart.js';

import { InvoiceReport } from './invoice-report';

function setupCanvasMock() {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: function () {
      return {
        canvas: Object.assign(this, { id: `mock-canvas-${Math.random()}` }),
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        quadraticCurveTo: () => {},
        clip: () => {},
        strokeRect: () => {},
        strokeText: () => {},
        fillText: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        setLineDash: () => {},
        resetTransform: () => {},
      };
    },
  });
}

describe('InvoiceReport', () => {
  let component: InvoiceReport;
  let fixture: ComponentFixture<InvoiceReport>;

  beforeAll(() => {
    setupCanvasMock();
    Chart.register(...registerables);
    (globalThis as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceReport],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
