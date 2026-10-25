/* Shared interaction contract. See ../INTERACTIONS.md before changing behavior. */
'use strict';
window.ZevianInteractions = Object.freeze({
  version: '2026-10-09',
  duration: 300,
  easing: 'ease-out',
  disclosure(key, label, content, open = false) {
    return '<details class="ds-disclosure" data-disclosure="'+esc(key)+'" '+(open?'open':'')+'><summary>'+esc(label)+'<img src="assets/figma/review-chevron.svg" alt=""></summary><div class="ds-disclosure-content">'+content+'</div></details>';
  },
  button(label, action, {icon, disabled = false, pressed} = {}) {
    return '<button class="btn xs ds-button" data-action="'+esc(action)+'" '+(disabled?'disabled':'')+(pressed !== undefined?' aria-pressed="'+pressed+'"':'')+'>'+(icon?'<img src="assets/figma/'+esc(icon)+'.svg" alt="">':'')+esc(label)+'</button>';
  },
  focusAction(action) {
    [...document.querySelectorAll('[data-action]')].find(el=>el.dataset.action===action&&el.getClientRects().length)?.focus({preventScroll:true});
  }
});
