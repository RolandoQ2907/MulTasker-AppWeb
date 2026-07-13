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

function toDateOnly(dateStr) {
    return new Date(`${dateStr}T00:00:00`);
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
    const secEvents = document.getElementById('secEvents');
    const eventRepeatSelect = document.getElementById('eventRepeat');
    const repeatDaysRow = document.getElementById('repeatDaysRow');
    const eventRepeatDaysInput = document.getElementById('eventRepeatDays');

    let currentRange = 'today';
    let calendarDate = new Date();
    calendarDate.setDate(1);
    let calendarEvents = loadCalendarEvents();
    let selectedCalendarDate = '';

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
        const target = toDateOnly(dateStr);
        const base = toDateOnly(ev.date);

        if (dateStr === ev.date) return true;

        if (ev.repeat === 'yearly') {
            return (
                base.getMonth() === target.getMonth() &&
                base.getDate() === target.getDate() &&
                target >= base
            );
        }

        if (ev.repeat === 'monthly') {
            if (target < base) return false;
            return target.getDate() === base.getDate();
        }

        if (ev.repeat === 'weekly') {
            if (target < base) return false;
            const diffDays = Math.floor((target - base) / 86400000);
            return diffDays % 7 === 0;
        }

        if (ev.repeat === 'daily') {
            if (target < base) return false;
            const diffDays = Math.floor((target - base) / 86400000);
            const totalDays = Number(ev.repeatDays || 1);
            return diffDays >= 0 && diffDays < totalDays;
        }

        return false;
    }

    function updateRepeatFields() {
        const repeatValue = eventRepeatSelect?.value || 'none';
        if (!repeatDaysRow) return;

        repeatDaysRow.style.display = repeatValue === 'daily' ? 'flex' : 'none';
        if (repeatValue !== 'daily' && eventRepeatDaysInput) {
            eventRepeatDaysInput.value = '';
        }
    }

    function renderSelectedDayEvents(date) {
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

            let repeatText = 'Sin repetición';
            if (ev.repeat === 'daily') repeatText = `Diario (${ev.repeatDays || 1} días)`;
            if (ev.repeat === 'weekly') repeatText = 'Semanal (cada 7 días)';
            if (ev.repeat === 'monthly') repeatText = 'Mensual';
            if (ev.repeat === 'yearly') repeatText = 'Anual';

            card.innerHTML = `
                <div class="sec-event-card__title">${ev.title}</div>
                <div class="sec-event-card__meta">
                    <span>${date}</span>
                    <span>${timeText}</span>
                    <span>${repeatText}</span>
                </div>
                ${ev.description ? `<div class="sec-event-card__desc">${ev.description}</div>` : ''}
                <button type="button" class="sec-event-card__delete" data-id="${ev.id}">⨯</button>
            `;

            secEvents.appendChild(card);
        });
    }

    function renderCalendar() {
    if (!calendarGrid || !calendarCurrentMonthEl) return;

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const { daysInMonth, firstWeekday } = getMonthInfo(year, month);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    calendarCurrentMonthEl.textContent = `${MONTH_NAMES_ES[month]} ${year}`;
    calendarGrid.innerHTML = '';

    for (let i = 0; i < firstWeekday; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day calendar-day--empty';
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cellDate = new Date(year, month, day);
        const dayStr = cellDate.toISOString().split('T')[0];
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.dataset.date = dayStr;

        const dayEvents = calendarEvents.filter(ev => eventOccursOnDate(ev, dayStr));

        if (dayStr === todayStr) {
            dayEl.classList.add('calendar-day--today');
        }

        if (dayEvents.length) {
            dayEl.classList.add('has-events');
        }

        const dateLabel = document.createElement('div');
        dateLabel.className = 'calendar-day__date';
        dateLabel.textContent = day;

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'calendar-day__events';

        dayEvents.forEach(ev => {
            const pill = document.createElement('div');
            pill.className = 'calendar-day__event-pill';
            pill.textContent = ev.title;
            eventsContainer.appendChild(pill);
        });

        dayEl.appendChild(dateLabel);
        dayEl.appendChild(eventsContainer);

        dayEl.addEventListener('click', () => {
            selectedCalendarDate = dayStr;
            if (eventDateInput) eventDateInput.value = selectedCalendarDate;
            renderSelectedDayEvents(selectedCalendarDate);
        });

        calendarGrid.appendChild(dayEl);
    }
}

    if (secEvents) {
        secEvents.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.sec-event-card__delete');
            if (!deleteBtn) return;

            const id = deleteBtn.dataset.id;
            calendarEvents = calendarEvents.filter(ev => ev.id !== id);
            saveCalendarEvents(calendarEvents);

            if (selectedCalendarDate) {
                renderSelectedDayEvents(selectedCalendarDate);
            }
            renderCalendar();
        });
    }

    if (eventRepeatSelect) {
        eventRepeatSelect.addEventListener('change', updateRepeatFields);
        updateRepeatFields();
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
            const repeatDays = Number(document.getElementById('eventRepeatDays')?.value || 0);
            const description = document.getElementById('eventDescription')?.value.trim() || '';

            if (!title || !date) return;

            if (repeat === 'daily' && repeatDays < 1) {
                alert('Indica durante cuántos días se repetirá el evento diario.');
                return;
            }

            calendarEvents.push({
                id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
                title,
                date,
                allDay,
                startTime,
                endTime,
                repeat,
                repeatDays: repeat === 'daily' ? repeatDays : null,
                description
            });

            saveCalendarEvents(calendarEvents);

            calendarEventForm.reset();
            updateRepeatFields();
            renderCalendar();

            if (selectedCalendarDate) {
                renderSelectedDayEvents(selectedCalendarDate);
            }

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