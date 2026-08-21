/*
 * Anatomia do combo — os quatro desenhos que cada ingrediente percorre na
 * seção 02 da Home (desenho de 20/08/2026).
 *
 * Não são ícones de `scw-icons-v2.js`: são arte própria desta seção, com o
 * traço mais grosso que o disco de 84–124px pede. Por isso moram aqui e não na
 * biblioteca — a biblioteca é gerada no Design e não se edita à mão.
 *
 * A ordem é a ordem do ciclo: cada um aparece por um quarto de 8,8s.
 */
export const ANATOMIA_COMBO = {
  doce: [
    "<g transform=\"translate(0.05 1.75)\"><path d=\"M7.6 13.5a8.4 8.4 0 0 1 16.8 0Z\"></path><circle cx=\"16\" cy=\"3.6\" r=\"1.7\"></circle><path d=\"M8 13.5h16l-1.9 11.5a2 2 0 0 1-2 1.7h-8.2a2 2 0 0 1-2-1.7L8 13.5Z\"></path><path d=\"M13.5 17.2l-.6 7.4M18.5 17.2l.6 7.4\" stroke-width=\"1.7\"></path></g>",
    "<circle cx=\"16\" cy=\"16\" r=\"12\"></circle><circle cx=\"16\" cy=\"16\" r=\"3.8\"></circle><path d=\"M11.4 9.4l1.4 1.7M20.6 9.2l-1.3 1.9M23.6 14.4l-2 .7M8.6 18.6l2 .7M14 23.4l.7-2M21.6 21.4l-1.5-1.5\" stroke-width=\"1.7\"></path>",
    "<path d=\"M11.4 17.8 16 27.8l4.6-10\"></path><path d=\"M13.2 21.6h5.6\" stroke-width=\"1.6\"></path><circle cx=\"12.4\" cy=\"13.2\" r=\"4.6\"></circle><circle cx=\"19.6\" cy=\"13.2\" r=\"4.6\"></circle><circle cx=\"16\" cy=\"8.4\" r=\"4.2\"></circle>",
    "<g transform=\"translate(0.05 -0.75)\"><circle cx=\"16\" cy=\"13.4\" r=\"7.4\"></circle><path d=\"M7.4 20.6h17.2l-1.6 5.6a2 2 0 0 1-2 1.4h-10a2 2 0 0 1-2-1.4l-1.6-5.6Z\"></path><path d=\"M12.6 21.6l-.4 4.6M19.4 21.6l.4 4.6\" stroke-width=\"1.6\"></path><circle cx=\"13.4\" cy=\"11.6\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"18.4\" cy=\"12.6\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"15.6\" cy=\"16.2\" r=\"1.1\" fill=\"currentColor\" stroke=\"none\"></circle></g>",
  ],
  salgado: [
    "<g transform=\"translate(-0.05 -0.85)\"><circle cx=\"12.4\" cy=\"19\" r=\"7.6\"></circle><circle cx=\"22\" cy=\"12.6\" r=\"5.4\"></circle></g>",
    "<g transform=\"translate(0.05 0.55)\"><path d=\"M16 4.4c4.4 5.4 7.6 9.8 7.6 14.2a7.6 7.6 0 0 1-15.2 0C8.4 14.2 11.6 9.8 16 4.4Z\"></path><path d=\"M9.6 26.6h12.8\"></path></g>",
    "<g transform=\"translate(0.05 -3.55)\"><path d=\"M5.5 15h21l-1.6 8.8a2.2 2.2 0 0 1-2.2 1.8H9.3a2.2 2.2 0 0 1-2.2-1.8L5.5 15Z\"></path><path d=\"M6 15c1.7-2.4 3.5-2.4 5.2 0s3.6 2.4 5.3 0 3.6-2.4 5.3 0\" stroke-width=\"1.8\"></path></g>",
    "<g transform=\"translate(0.05 -1.95)\"><path d=\"M5.6 8.4h20.8L16 27.6 5.6 8.4Z\"></path><circle cx=\"12.6\" cy=\"13.4\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"18.8\" cy=\"13\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle><circle cx=\"15.6\" cy=\"18.6\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"></circle></g>",
  ],
  bebida: [
    "<g transform=\"translate(1.8 -0.1)\"><path d=\"M6.4 13.4h13v5.2a6.5 6.5 0 0 1-13 0v-5.2Z\"></path><path d=\"M6.2 13.4a6.6 6.6 0 0 1 13.4 0\"></path><path d=\"M19.4 15h2a2.5 2.5 0 0 1 0 5h-2\"></path><path d=\"M4.6 25.6h16.8\"></path></g>",
    "<g transform=\"translate(0.05 -2.55)\"><path d=\"M7.6 9.6h16.8l-6.6 8h-3.6L7.6 9.6Z\"></path><path d=\"M12.4 18.6h7.2l1.6 6.6a2 2 0 0 1-2 2.4h-6.4a2 2 0 0 1-2-2.4l1.6-6.6Z\"></path><path d=\"M16 20.6v1.8\" stroke-width=\"1.7\"></path></g>",
    "<path d=\"M9.6 10.4h12.8l-1.4 15a2.2 2.2 0 0 1-2.2 2h-5.6a2.2 2.2 0 0 1-2.2-2l-1.4-15Z\"></path><path d=\"M12.4 13.6h3.8v3.8h-3.8zM17 18.4h3.4v3.4H17z\" stroke-width=\"1.6\"></path><path d=\"M19.4 10.4 22 4.6\"></path>",
    "<g transform=\"translate(-0.35 -0.5)\"><path d=\"M9.6 13.5h12.8l-1.5 12.6a2 2 0 0 1-2 1.8h-5.8a2 2 0 0 1-2-1.8L9.6 13.5Z\"></path><path d=\"M9.2 13.5a6.8 6.8 0 0 1 13.6 0\"></path><path d=\"M20.4 12.6 23.6 5.2\"></path><path d=\"M10.6 20.5h10.8\" stroke-width=\"1.7\"></path></g>",
  ],
}
