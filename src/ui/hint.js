// Quiet diegetic hints at the bottom of the screen.

export function createHint(element) {
  let timer = 0;
  return {
    show(text, ms = 4200) {
      clearTimeout(timer);
      element.textContent = text;
      element.classList.add('visible');
      timer = setTimeout(() => element.classList.remove('visible'), ms);
    },
    hide() {
      clearTimeout(timer);
      element.classList.remove('visible');
    },
  };
}
