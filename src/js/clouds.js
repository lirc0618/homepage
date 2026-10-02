// Vanta CLOUDS 0.5.24 with Three.js r134; licenses shipped in assets/vendor.
(function () {
  const element = document.getElementById('cloud-background');
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let effect = null;
  function destroy() {
    if (effect) effect.destroy();
    effect = null;
  }
  window.destroyIntroBackground = destroy;
  function start() {
    if (effect || document.hidden || !element.isConnected || typeof VANTA === 'undefined') return;
    try {
      effect = VANTA.CLOUDS({
        el: element,
        mouseControls: true,
        touchControls: false,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 3,
        scaleMobile: 12,
        backgroundColor: 0xffffff,
        skyColor: 0x68b8d7,
        cloudColor: 0xadc1de,
        cloudShadowColor: 0x183550,
        sunColor: 0xff9919,
        sunGlareColor: 0xff6633,
        sunlightColor: 0xff9933,
        speed: 0.7
      });
    } catch (error) {
      destroy();
      element.replaceChildren();
      // Keep the CSS sky background if WebGL is unavailable.
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) destroy();
    else start();
  });
  start();
})();
