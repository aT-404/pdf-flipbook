declare module 'page-flip' {
  export interface FlipEvent {
    data: number | string;
  }

  export class PageFlip {
    constructor(element: HTMLElement, options: Record<string, unknown>);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    flipNext(corner?: string): void;
    flipPrev(corner?: string): void;
    flip(pageNumber: number, corner?: string): void;
    turnToPage(pageNumber: number): void;
    update(): void;
    destroy(): void;
    getCurrentPageIndex(): number;
    on(event: string, callback: (e: FlipEvent) => void): this;
    off(event: string): this;
  }
}
