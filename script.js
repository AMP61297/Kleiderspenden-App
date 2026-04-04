/**
 * KleiderherzEN – Kleiderspenden-Registrierung
 * script.js
 *
 * Funktionen:
 * - Multi-Step-Formular (Schritt 1: Übergabeart, Schritt 2: Details, Schritt 3: Bestätigung)
 * - Übergabe vor Ort vs. Abholung (mit/ohne Adressfelder)
 * - PLZ-Näheprüfung (erste 2 Stellen müssen mit Geschäftsstelle übereinstimmen)
 * - Input-Sanitisierung gegen Code-Injection (XSS-Schutz)
 * - Formularvalidierung
 * - Responsive Burger-Menü
 */

'use strict';

// =============================================
// KONFIGURATION
// =============================================

/** PLZ der Geschäftsstelle – die ersten 2 Ziffern werden für die Näheprüfung verwendet */
const GESCHAEFTSSTELLE_PLZ_PREFIX = '12';

// =============================================
// SICHERHEIT: Input-Sanitisierung (XSS-Schutz)
// =============================================

/**
 * Entfernt gefährliche Zeichen aus einem String, um Code-Injection zu verhindern.
 * Ersetzt HTML-Sonderzeichen durch ihre Entitäts-Entsprechungen.
 * @param {string} raw - Roheingabe des Nutzers
 * @returns {string} - Bereinigter, sicherer String
 */
function sanitize(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Gibt den sanitisierten Wert eines Eingabefeldes zurück.
 * @param {string} id - ID des Input-Elements
 * @returns {string}
 */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? sanitize(el.value) : '';
}

// =============================================
// PLZ-VALIDIERUNG
// =============================================

/**
 * Prüft, ob eine PLZ genau 5 Ziffern hat.
 */
function isValidPlz(plz) {
  return /^\d{5}$/.test(plz);
}

/**
 * Prüft, ob die ersten 2 Stellen der PLZ mit denen der Geschäftsstelle übereinstimmen.
 */
function isNearGeschaeftsstelle(plz) {
  return plz.startsWith(GESCHAEFTSSTELLE_PLZ_PREFIX);
}

// =============================================
// FEHLER-ANZEIGE / -VERSTECKEN
// =============================================

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
}

function markFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('error');
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('error');
}

// =============================================
// STEP-INDICATOR
// =============================================

function setStep(activeStep) {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < activeStep)  dot.classList.add('done');
    if (i === activeStep) dot.classList.add('active');
  }
  const lines = document.querySelectorAll('.step-line');
  lines.forEach((line, idx) => {
    if (idx < activeStep - 1) {
      line.classList.add('done');
    } else {
      line.classList.remove('done');
    }
  });
}

// =============================================
// SEITEN-WECHSEL
// =============================================

function showPage(pageNum) {
  document.querySelectorAll('.form-page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageNum}`);
  if (target) target.classList.add('active');
  setStep(pageNum);
  const formCard = document.getElementById('form-card');
  if (formCard) {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// =============================================
// FORMULARLOGIK: Übergabeart
// =============================================

let selectedDelivery = null;

function initDeliveryOptions() {
  const radios = document.querySelectorAll('input[name="delivery"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      selectedDelivery = radio.value;
      hideError('error-delivery');
    });
  });
}

// =============================================
// ADRESSBLOCK EIN-/AUSBLENDEN
// =============================================

function showAddressBlock(show) {
  const block = document.getElementById('address-block');
  if (!block) return;
  if (show) {
    block.classList.remove('hidden');
  } else {
    block.classList.add('hidden');
    ['street', 'plz', 'city'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
      clearFieldError(id);
      hideError(`error-${id}`);
    });
  }
}

// =============================================
// VALIDIERUNG: Schritt 1
// =============================================

function validateStep1() {
  if (!selectedDelivery) {
    showError('error-delivery', 'Bitte wähle eine Übergabeart aus.');
    return false;
  }
  hideError('error-delivery');
  return true;
}

// =============================================
// VALIDIERUNG: Schritt 2
// =============================================

function validateStep2() {
  let valid = true;

  if (selectedDelivery === 'abholung') {
    const street = getVal('street');
    const plz    = getVal('plz');
    const city   = getVal('city');

    if (!street) {
      showError('error-street', 'Bitte gib eine Straße und Hausnummer an.');
      markFieldError('street');
      valid = false;
    } else {
      hideError('error-street');
      clearFieldError('street');
    }

    if (!plz) {
      showError('error-plz', 'Bitte gib eine Postleitzahl an.');
      markFieldError('plz');
      valid = false;
    } else if (!isValidPlz(plz)) {
      showError('error-plz', 'Die Postleitzahl muss aus genau 5 Ziffern bestehen.');
      markFieldError('plz');
      valid = false;
    } else if (!isNearGeschaeftsstelle(plz)) {
      showError(
        'error-plz',
        `Deine Adresse liegt außerhalb unseres Einzugsgebiets (PLZ-Bereich ${GESCHAEFTSSTELLE_PLZ_PREFIX}xxx). Bitte nutze die Übergabe an der Geschäftsstelle.`
      );
      markFieldError('plz');
      valid = false;
    } else {
      hideError('error-plz');
      clearFieldError('plz');
    }

    if (!city) {
      showError('error-city', 'Bitte gib einen Ort an.');
      markFieldError('city');
      valid = false;
    } else {
      hideError('error-city');
      clearFieldError('city');
    }
  }

  const clothing = getVal('clothing-type');
  if (!clothing) {
    showError('error-clothing', 'Bitte wähle eine Kleidungsart aus.');
    markFieldError('clothing-type');
    valid = false;
  } else {
    hideError('error-clothing');
    clearFieldError('clothing-type');
  }

  const crisis = getVal('crisis-region');
  if (!crisis) {
    showError('error-crisis', 'Bitte wähle ein Krisengebiet aus.');
    markFieldError('crisis-region');
    valid = false;
  } else {
    hideError('error-crisis');
    clearFieldError('crisis-region');
  }

  return valid;
}

// =============================================
// BESTÄTIGUNGSSEITE AUFBAUEN
// =============================================

function getClothingLabel(val) {
  const map = {
    winterkleidung: 'Winterkleidung (Jacken, Mäntel, Pullover)',
    sommerkleidung: 'Sommerkleidung (T-Shirts, Shorts, Kleider)',
    kinderkleidung: 'Kinderkleidung (alle Größen)',
    schuhe:         'Schuhe',
    bettwaesche:    'Bettwäsche & Decken',
    gemischt:       'Gemischt / Sonstiges',
  };
  return map[val] || val;
}

function buildSummary() {
  const now = new Date();
  const datumStr   = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const uhrzeitStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  const clothing = getClothingLabel(getVal('clothing-type'));

  // Krisengebiet-Label sicher auslesen
  const crisisSelect = document.getElementById('crisis-region');
  const crisisLabel  = crisisSelect
    ? sanitize(crisisSelect.options[crisisSelect.selectedIndex].text)
    : '';

  const name = getVal('donor-name') || '–';

  let rows = [];

  if (selectedDelivery === 'vorort') {
    rows.push({ label: 'Übergabeart', value: 'Übergabe an der Geschäftsstelle' });
    rows.push({ label: 'Ort',         value: 'Musterstraße 12, 12345 Musterstadt' });
  } else {
    const street = sanitize(document.getElementById('street').value);
    const plz    = sanitize(document.getElementById('plz').value);
    const city   = sanitize(document.getElementById('city').value);
    rows.push({ label: 'Übergabeart',  value: 'Abholung durch Sammelfahrzeug' });
    rows.push({ label: 'Abholadresse', value: `${street}, ${plz} ${city}` });
  }

  rows.push({ label: 'Art der Kleidung', value: clothing });
  rows.push({ label: 'Krisengebiet',     value: crisisLabel });
  rows.push({ label: 'Datum',            value: datumStr });
  rows.push({ label: 'Uhrzeit',          value: uhrzeitStr });
  rows.push({ label: 'Spender:in',       value: name });

  const summaryBox = document.getElementById('summary-box');
  summaryBox.innerHTML = '';

  rows.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'summary-row';

    const label = document.createElement('span');
    label.className = 's-label';
    label.textContent = row.label;  // textContent = XSS-sicher

    const val = document.createElement('span');
    val.className = 's-value';
    val.textContent = row.value;    // textContent = XSS-sicher

    rowEl.appendChild(label);
    rowEl.appendChild(val);
    summaryBox.appendChild(rowEl);
  });
}

// =============================================
// FORMULAR ZURÜCKSETZEN
// =============================================

function resetForm() {
  selectedDelivery = null;

  document.querySelectorAll('input[name="delivery"]').forEach(r => r.checked = false);

  ['street', 'plz', 'city', 'donor-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['clothing-type', 'crisis-region'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });

  document.querySelectorAll('.form-error').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

  showAddressBlock(false);

  const summaryBox = document.getElementById('summary-box');
  if (summaryBox) summaryBox.innerHTML = '';

  showPage(1);
}

// =============================================
// BURGER-MENÜ
// =============================================

function initBurgerMenu() {
  const burger = document.getElementById('burger');
  const nav    = document.getElementById('main-nav');
  if (!burger || !nav) return;

  burger.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', isOpen.toString());
  });

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
}

// =============================================
// LIVE-VALIDIERUNG
// =============================================

function initLiveValidation() {
  const plzInput = document.getElementById('plz');
  if (plzInput) {
    plzInput.addEventListener('input', () => {
      plzInput.value = plzInput.value.replace(/\D/g, '').slice(0, 5);
    });
  }
}

// =============================================
// HAUPT-INIT
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  initBurgerMenu();
  initDeliveryOptions();
  initLiveValidation();

  // Schritt 1: Weiter
  const btnNext1 = document.getElementById('btn-next-1');
  if (btnNext1) {
    btnNext1.addEventListener('click', () => {
      if (!validateStep1()) return;
      showAddressBlock(selectedDelivery === 'abholung');
      showPage(2);
    });
  }

  // Schritt 2: Zurück
  const btnBack2 = document.getElementById('btn-back-2');
  if (btnBack2) {
    btnBack2.addEventListener('click', () => showPage(1));
  }

  // Schritt 2: Registrieren
  const btnNext2 = document.getElementById('btn-next-2');
  if (btnNext2) {
    btnNext2.addEventListener('click', () => {
      if (!validateStep2()) return;
      buildSummary();
      showPage(3);
    });
  }

  // Schritt 3: Neue Spende
  const btnNew = document.getElementById('btn-new');
  if (btnNew) {
    btnNew.addEventListener('click', () => resetForm());
  }

  // Aktiven Nav-Link beim Scrollen setzen
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));

});
