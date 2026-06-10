export function fadeInUp(
  el: HTMLElement,
  distance = 20,
  duration = 400
): Promise<void> {
  return new Promise((resolve) => {
    el.style.opacity = '0';
    el.style.transform = `translateY(${distance}px)`;
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      setTimeout(resolve, duration);
    });
  });
}

export function fadeOut(el: HTMLElement, duration = 300): Promise<void> {
  return new Promise((resolve) => {
    el.style.opacity = '1';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ease-in`;
      el.style.opacity = '0';
      setTimeout(resolve, duration);
    });
  });
}

export function slideOutRight(
  el: HTMLElement,
  distance = 120,
  duration = 300
): Promise<void> {
  return new Promise((resolve) => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ease-in, transform ${duration}ms ease-in`;
      el.style.opacity = '0';
      el.style.transform = `translateX(${distance}px)`;
      setTimeout(resolve, duration);
    });
  });
}

export function slideInLeft(
  el: HTMLElement,
  distance = 120,
  duration = 300
): Promise<void> {
  return new Promise((resolve) => {
    el.style.opacity = '0';
    el.style.transform = `translateX(-${distance}px)`;
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      el.style.opacity = '1';
      el.style.transform = 'translateX(0)';
      setTimeout(resolve, duration);
    });
  });
}

export function slideDrawerIn(
  el: HTMLElement,
  duration = 300
): Promise<void> {
  return new Promise((resolve) => {
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms ease-out`;
      el.style.transform = 'translateX(0)';
      setTimeout(resolve, duration);
    });
  });
}

export function slideDrawerOut(
  el: HTMLElement,
  duration = 300
): Promise<void> {
  return new Promise((resolve) => {
    el.style.transform = 'translateX(0)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration}ms ease-in`;
      el.style.transform = 'translateX(100%)';
      setTimeout(resolve, duration);
    });
  });
}

export function heartPulse(el: HTMLElement, duration = 250): Promise<void> {
  return new Promise((resolve) => {
    el.style.transition = 'none';
    el.style.transform = 'scale(1.0)';
    requestAnimationFrame(() => {
      el.style.transition = `transform ${duration * 0.5}ms ease-in-out`;
      el.style.transform = 'scale(1.2)';
      setTimeout(() => {
        el.style.transform = 'scale(1.0)';
        setTimeout(resolve, duration * 0.5);
      }, duration * 0.5);
    });
  });
}
