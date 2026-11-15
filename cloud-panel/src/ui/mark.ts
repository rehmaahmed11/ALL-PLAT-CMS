/** The panel's logo mark, shared by the install wizard and the auth screens. */
export function iconMark(size = 34): string {
  return `<div class="logo" style="width:${size}px;height:${size}px;border-radius:${Math.round(size / 3.4)}px;font-size:${(size / 2.9).toFixed(1)}px">AM</div>`;
}
