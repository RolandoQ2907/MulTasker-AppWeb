// Guardar lista de registros en localStorage
function saveEconomyItems() {
    try {
        const items = [];
        document.querySelectorAll('.economy-item').forEach(item => {
            const amountEl   = item.querySelector('.economy-item__amount');
            const categoryEl = item.querySelector('.economy-item__category');
            const descEl     = item.querySelector('.economy-item__desc');
            const metaEl     = item.querySelector('.economy-item__meta');

            items.push({
                amount   : amountEl ? amountEl.textContent || '' : '',
                category : categoryEl ? categoryEl.textContent || '' : '',
                desc     : descEl ? descEl.textContent || '' : '',
                metaHtml : metaEl ? metaEl.innerHTML || '' : '',
                bgColor  : item.style.background || '',
                textColor: item.style.color || ''
            });
        });

        localStorage.setItem(ECONOMY_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error('No se pudo guardar Economy en localStorage', e);
    }
}

// Cargar lista de registros desde localStorage
function loadEconomyItems() {
    try {
        const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw);
    } catch (e) {
        console.error('No se pudo leer Economy desde localStorage', e);
        return [];
    }
}

// Decide si el texto debe ser negro o blanco según el color de fondo (hex)
function getContrastTextColor(hex) {
    if (!hex) return '#000000';
    let r = 0, g = 0, b = 0;

    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substr(1, 2), 16);
        g = parseInt(hex.substr(3, 2), 16);
        b = parseInt(hex.substr(5, 2), 16);
    }

    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
    return brightness > 149 ? '#000000' : '#ffffff';
}

function parseAmountFromText(text) {
    const sign = text.trim().startsWith('-') ? -1 : 1;
    const numeric = text.replace(/[^\d]/g, '');
    const value = Number(numeric || 0);
    return sign * value;
}

function computeSummary(range) {
    const items = document.querySelectorAll('.economy-item');
    let income = 0;
    let expense = 0;

    const now = new Date();
    const start = new Date();

    if (range === 'today') {
        start.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
        start.setDate(now.getDate() - 7);
    } else if (range === 'month') {
        start.setMonth(now.getMonth());
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    } else if (range === 'year') {
        start.setFullYear(now.getFullYear());
        start.setMonth(0);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    }

    items.forEach(item => {
        const amountEl = item.querySelector('.economy-item__amount');
        if (!amountEl) return;

        const metaEl = item.querySelector('.economy-item__meta span:last-child');
        let itemDate = null;
        if (metaEl) {
            const txt = metaEl.textContent || '';
            const match = txt.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2})/);
            if (match) {
                const [, dd, mm, yyyy, hh, min] = match;
                itemDate = new Date(
                    Number(yyyy),
                    Number(mm) - 1,
                    Number(dd),
                    Number(hh),
                    Number(min)
                );
            }
        }

        if (itemDate && range !== 'all') {
            if (itemDate < start || itemDate > now) {
                return;
            }
        } else if (range !== 'all' && !itemDate) {
            return;
        }

        const val = parseAmountFromText(amountEl.textContent || '');
        if (val >= 0) {
            income += val;
        } else {
            expense += Math.abs(val);
        }
    });

    return { income, expense, balance: income - expense };
}

function updateSummary(range) {
    const { income, expense, balance } = computeSummary(range);

    const summaryEl = document.getElementById('summaryBalance');
    const barIncome = document.getElementById('summaryBarIncome');
    const barExpense = document.getElementById('summaryBarExpense');

    if (summaryEl) {
        summaryEl.textContent = `$${balance.toLocaleString('es-AR')}`;
        summaryEl.style.color = balance < 0 ? '#d62c2c' : '#1b7bd8';
    }

    if (barIncome && barExpense) {
        const maxVal = Math.max(income, expense, 1);
        const incomePct = Math.round((income / maxVal) * 100);
        const expensePct = Math.round((expense / maxVal) * 100);

        barIncome.style.width = `${incomePct}%`;
        barExpense.style.width = `${expensePct}%`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons   = document.querySelectorAll('.economy-tab-btn');
    const views        = document.querySelectorAll('.economy-view');
    const economyList  = document.querySelector('.economy-list');
    const economyForm  = document.querySelector('.economy-form');
    const rangeButtons = document.querySelectorAll('.summary-range-btn');

    let currentRange = 'today';

    // Reconstruir registros guardados
    if (economyList) {
        const storedItems = loadEconomyItems();
        storedItems.forEach(data => {
            const li = document.createElement('li');
            li.className = 'economy-item';

            li.innerHTML = `
      <div class="economy-item__main">
        <span class="economy-item__amount">${data.amount}</span>
        <span class="economy-item__category">${data.category}</span>
        <button class="economy-item__delete" type="button">X</button>
      </div>
      <p class="economy-item__desc">${data.desc}</p>
      ${data.metaHtml ? `<div class="economy-item__meta">${data.metaHtml}</div>` : ''}
    `;

            li.style.background = data.bgColor || '#fdfdfd';
            li.style.color      = data.textColor || getContrastTextColor(data.bgColor || '#fdfdfd');

            economyList.appendChild(li);
        });
    }

    function setRange(range) {
        currentRange = range;
        rangeButtons.forEach(btn => {
            btn.classList.toggle('is-active', btn.dataset.range === range);
        });
        updateSummary(range);
    }

    // Tabs Ver / Añadir
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetView = btn.dataset.view;

            tabButtons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');

            views.forEach(view => view.classList.remove('is-visible'));

            const viewToShow = document.querySelector(`.economy-view--${targetView}`);
            if (viewToShow) viewToShow.classList.add('is-visible');
        });
    });

    // Rango rendimiento
    if (rangeButtons.length) {
        rangeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setRange(btn.dataset.range || 'today');
            });
        });
        setRange('today');
    }

    // Eliminar registro
    if (economyList) {
        economyList.addEventListener('click', (e) => {
            if (e.target.classList.contains('economy-item__delete')) {
                const item = e.target.closest('.economy-item');
                if (item) item.remove();
                updateSummary(currentRange);
                saveEconomyItems(); // aquí sí se guarda
            }
        });
    }

    // Añadir registro con campos extra
    if (economyForm && economyList) {
        economyForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const amountInput    = economyForm.querySelector('#amount');
            const typeSelect     = economyForm.querySelector('#type');
            const categorySelect = economyForm.querySelector('#category');
            const descTextarea   = economyForm.querySelector('#description');
            const detailsTextarea= economyForm.querySelector('#details');
            const colorInput     = economyForm.querySelector('#color');
            const datetimeInput  = economyForm.querySelector('#datetime');

            const amountValue   = amountInput.value.trim();
            const typeValue     = typeSelect.value;
            const categoryValue = categorySelect.value;
            const descValue     = descTextarea.value.trim();
            const detailsValue  = detailsTextarea.value.trim();
            const colorValue    = colorInput.value || '#fdfdfd';
            const datetimeValue = datetimeInput.value;

            if (!amountValue || !descValue) {
                return;
            }

            const numericAmount = Number(amountValue);
            const sign = typeValue === 'expense' ? '- ' : '+ ';
            const formattedAmount = `${sign}$${numericAmount.toLocaleString('es-AR')}`;

            const categoryMap = {
                food     : 'Comida',
                service  : 'Servicio',
                transport: 'Transporte',
                other    : 'Otros'
            };
            const categoryText = categoryMap[categoryValue] || 'Otros';

            let datetimeText = '';
            if (datetimeValue) {
                const d       = new Date(datetimeValue);
                const day     = String(d.getDate()).padStart(2, '0');
                const month   = String(d.getMonth() + 1).padStart(2, '0');
                const year    = d.getFullYear();
                const hours   = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                datetimeText  = `${day}/${month}/${year} ${hours}:${minutes}`;
            }

            let metaHtml = '';
            if (detailsValue || datetimeText) {
                metaHtml = `
          <div class="economy-item__meta">
            ${detailsValue ? `<span>${detailsValue}</span>` : ''}
            ${datetimeText ? `<span>${datetimeText}</span>` : ''}
          </div>
        `;
            }

            const li = document.createElement('li');
            li.className = 'economy-item';
            li.innerHTML = `
        <div class="economy-item__main">
          <span class="economy-item__amount">${formattedAmount}</span>
          <span class="economy-item__category">${categoryText}</span>
          <button class="economy-item__delete" type="button">X</button>
        </div>
        <p class="economy-item__desc">${descValue}</p>
        ${metaHtml}
      `;

            li.style.background = colorValue;
            const textColor = getContrastTextColor(colorValue);
            li.style.color = textColor;

            economyList.appendChild(li);

            amountInput.value    = '';
            typeSelect.value     = 'income';
            categorySelect.value = 'food';
            descTextarea.value   = '';
            detailsTextarea.value= '';
            colorInput.value     = '#f6f8fb';
            datetimeInput.value  = '';

            views.forEach(view => view.classList.remove('is-visible'));
            document.querySelector('.economy-view--list').classList.add('is-visible');

            tabButtons.forEach(b => b.classList.remove('is-active'));
            const verBtn = document.querySelector('.economy-tab-btn[data-view="list"]');
            if (verBtn) verBtn.classList.add('is-active');

            updateSummary(currentRange);
            saveEconomyItems(); // guardar también al añadir
        });
    }

    // Inicializar resumen al cargar
    updateSummary(currentRange);
});