import { useEffect, useState } from 'react';

/**
 * The dispersion made visible: a fixed spectrum down the edge of the page, with
 * a marker at your position in it. It is the page's only piece of chrome, and it
 * earns its place by explaining why the colour keeps changing.
 */
export function Rail() {
  const [top, setTop] = useState(0);
  const [band, setBand] = useState('violet');

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      // Kept inside the viewport rather than running off the bottom edge.
      setTop(progress * (window.innerHeight - 88));

      // The rail is fixed, so it sits outside every band and cannot inherit a
      // wavelength. It reads whichever band crosses the middle of the viewport,
      // which is also the section the reader is actually looking at.
      const middle = window.innerHeight / 2;
      let current = 'violet';
      for (const el of document.querySelectorAll<HTMLElement>('[data-band]')) {
        const box = el.getBoundingClientRect();
        if (box.top <= middle && box.bottom >= middle) current = el.dataset.band ?? current;
      }
      setBand(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <>
      <div className="rail" aria-hidden />
      <div className="rail-thumb" data-band={band} style={{ top }} aria-hidden />
    </>
  );
}
