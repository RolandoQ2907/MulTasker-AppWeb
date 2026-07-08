const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getMonthInfo(year, month) {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    return { year, month, daysInMonth, firstWeekday };
}

document.addEventListener('DOMContentLoaded', () => {
    const bottomNavItems = document.querySelectorAll('.bottom-nav__item');
    const economySection = document.querySelector('.economy-section');
    const calendarSection = document.querySelector('.calendar-section');
    const economyTabButtons = document.querySelectorAll('.economy-tab-btn');
    const views = document.querySelectorAll('.economy-view');
    const economyList = document.querySelector('.economy-list');
    const economyForm = document.querySelector('.economy-form');
    const rangeButtons = document.querySelectorAll('.summary-range-btn');
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarCurrentMonthEl = document.getElementById('calendarCurrentMonth');
    const calendarNavButtons = document.querySelectorAll('.calendar-nav-btn');
    const eventDateInput = document.getElementById('eventDate');
    const calendarEventForm = document.getElementById('calendarEventForm');

    let currentRange = 'today';
    let calendarDate = new Date();
    calendarDate.setDate(1);
    let calendarEvents = loadCalendarEvents();

    function showSection(tab) {
        if (tab === 'economy') {
            if (economySection) economySection.style.display = 'flex';
            if (calendarSection) calendarSection.style.display = 'none';
        } else if (tab === 'calendar') {
            if (economySection) economySection.style.display = 'none';
            if (calendarSection) calendarSection.style.display = 'flex';
        } else {
            if (economySection) economySection.style.display = 'none';
            if (calendarSection) calendarSection.style.display = 'none';
        }
    }

    function setEconomyView(view) {
        economyTabButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === view));
        views.forEach(v => v.classList.toggle('is-visible', v.classList.contains(`economy-view--${view}`)));
    }

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
        return sign * Number(numeric || 0);
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
                    itemDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
                }
            }

            if (itemDate && range !== 'all') {
                if (itemDate < start || itemDate > now) return;
            } else if (range !== 'all' && !itemDate) {
                return;
            }

            const val = parseAmountFromText(amountEl.textContent || '');
            if (val >= 0) income += val;
            else expense += Math.abs(val);
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
            barIncome.style.width = `${Math.round((income / maxVal) * 100)}%`;
            barExpense.style.width = `${Math.round((expense / maxVal) * 100)}%`;
        }
    }

    function eventOccursOnDate(ev, dateStr) {
        if (ev.date === dateStr) return true;

        if (ev.repeat !== 'yearly') return false;

        const base = new Date(ev.date);
        const target = new Date(dateStr);

        return (
            base.getMonth() === target.getMonth() &&
            base.getDate() === target.getDate() &&
            target >= base
        );
    }

    function renderCalendar() {
        if (!calendarGrid || !calendarCurrentMonthEl) return;

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();
        const { daysInMonth, firstWeekday } = getMonthInfo(year, month);

        calendarCurrentMonthEl.textContent = `${MONTH_NAMES_ES[month]} ${year}`;
        calendarGrid.innerHTML = '';

        for (let i = 0; i < firstWeekday; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day calendar-day--empty';
            calendarGrid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cellDate = new Date(year, month, day);
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.dataset.date = cellDate.toISOString().split('T')[0];

            const dateLabel = document.createElement('div');
            dateLabel.className = 'calendar-day__date';
            dateLabel.textContent = day;

            const eventsContainer = document.createElement('div');
            eventsContainer.className = 'calendar-day__events';

            const dayEvents = calendarEvents.filter(ev => eventOccursOnDate(ev, dayEl.dataset.date));

            if (dayEvents.length) {
                dayEl.classList.add('has-events');
            }

            dayEvents.forEach(ev => {
                const pill = document.createElement('div');
                pill.className = 'calendar-day__event-pill';
                pill.textContent = ev.title;
                eventsContainer.appendChild(pill);
            });

            dayEl.appendChild(dateLabel);
            dayEl.appendChild(eventsContainer);

            dayEl.addEventListener('click', () => {
                if (eventDateInput) eventDateInput.value = dayEl.dataset.date;
                renderSelectedDayEvents(dayEl.dataset.date);
            });

            calendarGrid.appendChild(dayEl);
        }
    }
    function renderSelectedDayEvents(date) {
        const secEvents = document.getElementById('secEvents');
        if (!secEvents) return;

        const events = calendarEvents.filter(ev => eventOccursOnDate(ev, date));
        secEvents.innerHTML = '';

        if (!events.length) {
            secEvents.innerHTML = '<p class="sec-events__empty">No hay eventos para este día.</p>';
            return;
        }

        events.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'sec-event-card';
            card.style.borderLeftColor = ev.color || '#2ecc71';

            const timeText = ev.allDay
                ? 'Todo el día'
                : `${ev.startTime || '--:--'} - ${ev.endTime || '--:--'}`;

            card.innerHTML = `
            <div class="sec-event-card__title">${ev.title}</div>
            <div class="sec-event-card__meta">
                <span>${date}</span>
                <span>${timeText}</span>
                <span>${ev.repeat !== 'none' ? ev.repeat : 'Sin repetición'}</span>
            </div>
            ${ev.description ? `<div class="sec-event-card__desc">${ev.description}</div>` : ''}
        `;

            secEvents.appendChild(card);
        });
    }


    bottomNavItems.forEach(btn => {
        btn.addEventListener('click', () => {
            bottomNavItems.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');
            showSection(btn.dataset.tab);
            if (btn.dataset.tab === 'calendar') renderCalendar();
        });
    });

    economyTabButtons.forEach(btn => {
        btn.addEventListener('click', () => setEconomyView(btn.dataset.view));
    });

    rangeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentRange = btn.dataset.range || 'today';
            rangeButtons.forEach(b => b.classList.toggle('is-active', b.dataset.range === currentRange));
            updateSummary(currentRange);
        });
    });

    if (economyList) {
        economyList.addEventListener('click', (e) => {
            if (e.target.classList.contains('economy-item__delete')) {
                const item = e.target.closest('.economy-item');
                if (item) item.remove();
                updateSummary(currentRange);
            }
        });
    }

    if (economyForm && economyList) {
        economyForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const amountInput = economyForm.querySelector('#amount');
            const typeSelect = economyForm.querySelector('#type');
            const categorySelect = economyForm.querySelector('#category');
            const descTextarea = economyForm.querySelector('#description');
            const detailsTextarea = economyForm.querySelector('#details');
            const colorInput = economyForm.querySelector('#color');
            const datetimeInput = economyForm.querySelector('#datetime');

            const amountValue = amountInput.value.trim();
            const typeValue = typeSelect.value;
            const categoryValue = categorySelect.value;
            const descValue = descTextarea.value.trim();
            const detailsValue = detailsTextarea.value.trim();
            const colorValue = colorInput.value || '#fdfdfd';
            const datetimeValue = datetimeInput.value;

            if (!amountValue || !descValue) return;

            const numericAmount = Number(amountValue);
            const sign = typeValue === 'expense' ? '- ' : '+ ';
            const formattedAmount = `${sign}$${numericAmount.toLocaleString('es-AR')}`;

            const categoryMap = {
                food: 'Comida',
                service: 'Servicio',
                transport: 'Transporte',
                other: 'Otros'
            };
            const categoryText = categoryMap[categoryValue] || 'Otros';

            let datetimeText = '';
            if (datetimeValue) {
                const d = new Date(datetimeValue);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                datetimeText = `${day}/${month}/${year} ${hours}:${minutes}`;
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
            li.dataset.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
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
            li.style.color = getContrastTextColor(colorValue);
            economyList.appendChild(li);

            amountInput.value = '';
            typeSelect.value = 'income';
            categorySelect.value = 'food';
            descTextarea.value = '';
            detailsTextarea.value = '';
            colorInput.value = '#f6f8fb';
            datetimeInput.value = '';

            setEconomyView('list');
            document.querySelector('.economy-tab-btn[data-view="list"]')?.classList.add('is-active');
            updateSummary(currentRange);
        });
    }

    if (calendarNavButtons.length) {
        calendarNavButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'prev') calendarDate.setMonth(calendarDate.getMonth() - 1);
                if (action === 'next') calendarDate.setMonth(calendarDate.getMonth() + 1);
                renderCalendar();
            });
        });
    }

    if (calendarGrid) {
        renderCalendar();
    }

    if (calendarEventForm) {
        calendarEventForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const title = document.getElementById('eventTitle')?.value.trim();
            const date = document.getElementById('eventDate')?.value;
            const allDay = document.getElementById('eventAllDay')?.checked;
            const startTime = document.getElementById('eventStartTime')?.value;
            const endTime = document.getElementById('eventEndTime')?.value;
            const repeat = document.getElementById('eventRepeat')?.value || 'none';
            const description = document.getElementById('eventDescription')?.value.trim() || '';

            if (!title || !date) return;

            calendarEvents.push({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
                title,
                date,
                allDay,
                startTime,
                endTime,
                repeat,
                description
            });

            // guardar en localStorage
            saveCalendarEvents(calendarEvents);

            calendarEventForm.reset();
            renderCalendar();
            showSection('calendar');
            bottomNavItems.forEach(b => b.classList.remove('is-active'));
            document.querySelector('.bottom-nav__item[data-tab="calendar"]')?.classList.add('is-active');
        });
    }

    showSection('economy');
    updateSummary(currentRange);
    setEconomyView('list');
    renderCalendar();
});