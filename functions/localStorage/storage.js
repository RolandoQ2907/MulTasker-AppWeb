// functions/localStorage/storage.js
const ECONOMY_STORAGE_KEY = 'economy-items';
const CALENDAR_STORAGE_KEY = 'calendar-events';

// ---------- ECONOMY ----------

/**
 * Extrae datos del DOM (Función de compatibilidad/transición).
 * NOTA: Lo ideal es que tu app mantenga un array de JavaScript como "fuente de verdad" 
 * y pases ese array a saveEconomyItems(), en lugar de leer el DOM.
 */
function extractEconomyItemsFromDOM() {
    const items = [];
    document.querySelectorAll('.economy-item').forEach(item => {
        items.push({
            // Recomendación: Asegúrate de añadir un data-id en tu HTML al crear el elemento
            id: item.dataset.id || Date.now().toString(), 
            amount: item.querySelector('.economy-item__amount')?.textContent?.trim() || '',
            category: item.querySelector('.economy-item__category')?.textContent?.trim() || '',
            desc: item.querySelector('.economy-item__desc')?.textContent?.trim() || '',
            metaHtml: item.querySelector('.economy-item__meta')?.innerHTML?.trim() || '',
            // Es mejor guardar el tipo de dato que el color directamente
            type: item.dataset.type || 'expense' 
        });
    });
    return items;
}

/**
 * Guarda los items de economía.
 * Ahora acepta un array (como hace Calendar). 
 * Si no se le pasa nada, lee del DOM por compatibilidad con tu código actual.
 */
function saveEconomyItems(itemsArray = null) {
    try {
        const dataToSave = itemsArray || extractEconomyItemsFromDOM();
        localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
        console.error('No se pudo guardar Economy en localStorage', e);
    }
}

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
// Estas funciones están perfectas, no necesitan cambios.

function saveCalendarEvents(eventsArray) {
    try {
        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(eventsArray));
    } catch (e) {
        console.error('No se pudo guardar Calendar en localStorage', e);
    }
}

function loadCalendarEvents() {
    try {
        const raw = localStorage.getItem(CALENDAR_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('No se pudo leer Calendar desde localStorage', e);
        return [];
    }
}