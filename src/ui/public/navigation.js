export function initialiseNavigation() {
  const tabs = [...document.querySelectorAll('[data-panel-target]')];
  const panels = tabs.map((tab) => document.getElementById(tab.dataset.panelTarget));

  function selectPanel(panelId, updateHash = true) {
    tabs.forEach((tab) => {
      const selected = tab.dataset.panelTarget === panelId;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== panelId;
    });
    if (updateHash) history.replaceState(null, '', `#${panelId}`);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => selectPanel(tab.dataset.panelTarget));
  });

  const initialPanel = window.location.hash.slice(1);
  if (panels.some((panel) => panel.id === initialPanel)) selectPanel(initialPanel, false);
}
