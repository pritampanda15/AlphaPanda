declare module '3dmol' {
  export interface GLViewer {
    addModel(data: string, format: string, options?: Record<string, unknown>): unknown;
    setStyle(sel: Record<string, unknown>, style: Record<string, unknown>): void;
    addStyle(sel: Record<string, unknown>, style: Record<string, unknown>): void;
    removeAllModels(): void;
    removeAllLabels(): void;
    removeAllShapes(): void;
    removeAllSurfaces(): void;
    addSurface(type: number, style: Record<string, unknown>, atomsel?: Record<string, unknown>): unknown;
    addLabel(text: string, options: Record<string, unknown>, sel?: Record<string, unknown>): unknown;
    addCylinder(spec: Record<string, unknown>): unknown;
    setClickable(
      sel: Record<string, unknown>,
      clickable: boolean,
      callback: (atom: { chain: string; resi: number; resn: string; b: number; x: number; y: number; z: number }) => void
    ): void;
    setBackgroundColor(color: string | number, alpha?: number): void;
    zoomTo(sel?: Record<string, unknown>, duration?: number): void;
    spin(axis?: string | boolean, speed?: number): void;
    resize(): void;
    render(): void;
    pngURI(): string;
    clear(): void;
  }

  export const SurfaceType: {
    VDW: number;
    MS: number;
    SAS: number;
    SES: number;
  };

  export function createViewer(
    element: HTMLElement | string,
    config?: Record<string, unknown>
  ): GLViewer;
}
