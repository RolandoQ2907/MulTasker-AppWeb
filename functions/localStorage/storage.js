// functions/localStorage/storage.js

// Claves de localStorage
const ECONOMY_STORAGE_KEY = 'economy-items';
const CALENDAR_STORAGE_KEY = 'calendar-events';

// ---------- ECONOMY ----------

// Guarda todos los <li class="economy-item"> actuales en localStorage
function saveEconomyItems() {
    try {
        const items = [];
        document.querySelectorAll('.economy-item').forEach(item => {
            const amountEl = item.querySelector('.economy-item__amount');
            const categoryEl = item.querySelector('.economy-item__category');
            const descEl = item.querySelector('.economy-item__desc');
            const metaEl = item.querySelector('.economy-item__meta');

            items.push({
                amount: amountEl ? amountEl.textContent || '' : '',
                category: categoryEl ? categoryEl.textContent || '' : '',
                desc: descEl ? descEl.textContent || '' : '',
                metaHtml: metaEl ? metaEl.innerHTML || '' : '',
                bgColor: item.style.background || '',
                textColor: item.style.color || ''
            });
        });

        localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('No se pudo guardar Economy en localStorage', e);
    }
}

// Devuelve array de registros de Economy desde localStorage
function loadEconomyItems() {
    try {
        const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('No se pudo leer Economy desde localStorage', e);
        return [];
    }
}

// ---------- CALENDAR ----------

// Guarda el array de eventos de calendario en localStorage
function saveCalendarEvents(eventsArray) {
    try {
        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(eventsArray));
    } catch (e) {
        console.error('No se pudo guardar Calendar en localStorage', e);
    }
}

// Devuelve array de eventos de calendario desde localStorage
function loadCalendarEvents() {
    try {
        const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('No se pudo leer Calendar desde localStorage', e);
        return [];
    }
}