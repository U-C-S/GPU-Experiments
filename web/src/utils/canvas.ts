export function resizeCanvasToDisplaySize(target: HTMLCanvasElement) {
  const width = Math.max(
    1,
    Math.floor(target.clientWidth * window.devicePixelRatio),
  );
  const height = Math.max(
    1,
    Math.floor(target.clientHeight * window.devicePixelRatio),
  );

  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
}
