const secEvents = document.getElementById('secEvents');

function getEventsForDate(date) {
    return calendarEvents.filter(ev => ev.date === date);
}

function renderSelectedDayEvents(date) {
    if (!secEvents) return;

    const events = getEventsForDate(date);
    secEvents.innerHTML = '';

    if (!events.length) {
        secEvents.innerHTML = '<p class="sec-events__empty">No hay eventos para este día.</p>';
        return;
    }

    events.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'sec-event-card';
        card.style.borderLeftColor = ev.color || '#1b7bd8';

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
const secEvents = document.getElementById('secEvents');

function getEventsForDate(date) {
    return calendarEvents.filter(ev => ev.date === date);
}

function renderSelectedDayEvents(date) {
    if (!secEvents) return;

    const events = getEventsForDate(date);
    secEvents.innerHTML = '';

    if (!events.length) {
        secEvents.innerHTML = '<p class="sec-events__empty">No hay eventos para este día.</p>';
        return;
    }

    events.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'sec-event-card';
        card.style.borderLeftColor = ev.color || '#1b7bd8';

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