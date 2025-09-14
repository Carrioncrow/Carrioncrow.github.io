/**
 * Google Calendar Integration for Parchment Website
 * This file handles all Google Calendar API interactions
 */

// Client ID and API key from the Google Developer Console
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Replace with actual client ID in production
const API_KEY = 'YOUR_API_KEY'; // Replace with actual API key in production

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'];

// Authorization scopes required by the API
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

/**
 * Initialize the Google Calendar API
 */
function initializeGoogleCalendar() {
    // Load the Google API client library
    gapi.load('client', initGapiClient);
}

/**
 * Initialize the gapi.client object
 */
async function initGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Initialize the tokenClient
 */
function initializeGoogleIdentityServices() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enable buttons if both APIs are initialized
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize-button').style.display = 'block';
    }
}

/**
 * Sign in the user upon button click
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('authorize-button').style.display = 'none';
        document.getElementById('signout-button').style.display = 'block';
        await listUpcomingEvents();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        // Skip display of account chooser and consent dialog
        tokenClient.requestAccessToken({prompt: ''});
    }
}

/**
 * Sign out the user upon button click
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('calendar-content').innerHTML = '<p>Please sign in to view your calendar events.</p>';
        document.getElementById('authorize-button').style.display = 'block';
        document.getElementById('signout-button').style.display = 'none';
    }
}

/**
 * List upcoming events from the user's calendar
 */
async function listUpcomingEvents() {
    let response;
    try {
        const request = {
            'calendarId': 'primary',
            'timeMin': (new Date()).toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 10,
            'orderBy': 'startTime',
        };
        response = await gapi.client.calendar.events.list(request);
    } catch (err) {
        document.getElementById('calendar-content').innerHTML = `<p>Error: ${err.message}</p>`;
        return;
    }

    const events = response.result.items;
    if (!events || events.length === 0) {
        document.getElementById('calendar-content').innerHTML = '<p class="no-events">No upcoming events found.</p>';
        return;
    }

    // Display the events
    let eventsHtml = '<ul class="event-list">';
    events.forEach((event) => {
        const start = event.start.dateTime || event.start.date;
        const formattedDate = formatEventDate(start);
        
        eventsHtml += `
            <li class="event-item">
                <div class="event-date">${formattedDate}</div>
                <div class="event-title">${event.summary}</div>
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                ${event.location ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>` : ''}
            </li>
        `;
    });
    eventsHtml += '</ul>';
    
    document.getElementById('calendar-content').innerHTML = eventsHtml;
    
    // Also update the upcoming events on the dashboard if it exists
    const upcomingEventsElement = document.getElementById('upcoming-events');
    if (upcomingEventsElement) {
        upcomingEventsElement.innerHTML = eventsHtml;
    }
}

/**
 * Format the event date for display
 */
function formatEventDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Generate a monthly calendar view
 */
function generateCalendarView(year, month) {
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get the day of the week the first day falls on (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate how many days to show from the previous month
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Calculate how many days to show from the next month
    const totalDaysToShow = 42; // 6 rows of 7 days
    const daysFromNextMonth = totalDaysToShow - (daysFromPrevMonth + lastDay.getDate());
    
    // Get the last day of the previous month
    const lastDayPrevMonth = new Date(year, month, 0).getDate();
    
    // Generate the calendar HTML
    let calendarHtml = `
        <div class="calendar-header">
            <div class="calendar-title">${new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
            <div class="calendar-nav">
                <button class="calendar-nav-btn prev-month">&lt;</button>
                <button class="calendar-nav-btn next-month">&gt;</button>
            </div>
        </div>
        <div class="calendar-grid">
    `;
    
    // Add day headers
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        calendarHtml += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Add days from previous month
    for (let i = 0; i < daysFromPrevMonth; i++) {
        const dayNumber = lastDayPrevMonth - daysFromPrevMonth + i + 1;
        calendarHtml += `
            <div class="calendar-day other-month">
                <div class="calendar-day-number">${dayNumber}</div>
            </div>
        `;
    }
    
    // Add days from current month
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
        const isToday = isCurrentMonth && today.getDate() === i;
        calendarHtml += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="calendar-day-number">${i}</div>
                <div class="calendar-day-events" data-date="${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}">
                    <!-- Events will be added here dynamically -->
                </div>
            </div>
        `;
    }
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
        calendarHtml += `
            <div class="calendar-day other-month">
                <div class="calendar-day-number">${i}</div>
            </div>
        `;
    }
    
    calendarHtml += `
        </div>
        <div class="calendar-controls">
            <div class="calendar-view-toggle">
                <button class="calendar-view-btn active" data-view="month">Month</button>
                <button class="calendar-view-btn" data-view="list">List</button>
            </div>
            <div class="calendar-actions">
                <button id="authorize-button" class="form-button">Connect Google Calendar</button>
                <button id="signout-button" class="form-button" style="display: none;">Disconnect</button>
            </div>
        </div>
    `;
    
    return calendarHtml;
}

/**
 * Populate calendar with events
 */
async function populateCalendarWithEvents(year, month) {
    if (!gapi.client || !gapi.client.calendar) {
        console.error('Google Calendar API not loaded');
        return;
    }
    
    try {
        // Set the time range for the month
        const timeMin = new Date(year, month, 1, 0, 0, 0).toISOString();
        const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        
        const response = await gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': timeMin,
            'timeMax': timeMax,
            'showDeleted': false,
            'singleEvents': true,
            'orderBy': 'startTime'
        });
        
        const events = response.result.items;
        if (!events || events.length === 0) {
            return;
        }
        
        // Add events to the calendar
        events.forEach(event => {
            const start = event.start.dateTime || event.start.date;
            const eventDate = new Date(start);
            const dateKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
            
            const eventContainer = document.querySelector(`.calendar-day-events[data-date="${dateKey}"]`);
            if (eventContainer) {
                const eventTime = event.start.dateTime ? 
                    new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 
                    'All Day';
                
                const eventElement = document.createElement('div');
                eventElement.className = 'calendar-event';
                eventElement.innerHTML = `${eventTime} - ${event.summary}`;
                eventElement.setAttribute('data-event-id', event.id);
                eventElement.addEventListener('click', () => showEventDetails(event));
                
                eventContainer.appendChild(eventElement);
            }
        });
    } catch (err) {
        console.error('Error fetching events:', err);
    }
}

/**
 * Show event details in a modal
 */
function showEventDetails(event) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('event-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'event-modal';
        modal.className = 'event-modal';
        document.body.appendChild(modal);
    }
    
    // Format event details
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const formattedStart = formatEventDate(start);
    const formattedEnd = end ? formatEventDate(end) : '';
    
    // Create modal content
    modal.innerHTML = `
        <div class="event-modal-content">
            <div class="event-modal-header">
                <h3 class="event-modal-title">${event.summary}</h3>
                <button class="event-modal-close">&times;</button>
            </div>
            <div class="event-modal-body">
                <div class="event-detail">
                    <span class="event-detail-label">Start:</span> ${formattedStart}
                </div>
                ${formattedEnd ? `
                <div class="event-detail">
                    <span class="event-detail-label">End:</span> ${formattedEnd}
                </div>
                ` : ''}
                ${event.description ? `
                <div class="event-detail">
                    <span class="event-detail-label">Description:</span>
                    <p>${event.description}</p>
                </div>
                ` : ''}
                ${event.location ? `
                <div class="event-detail">
                    <span class="event-detail-label">Location:</span> ${event.location}
                </div>
                ` : ''}
            </div>
            <div class="event-modal-footer">
                <button class="event-modal-btn secondary close-modal">Close</button>
                ${event.htmlLink ? `<a href="${event.htmlLink}" target="_blank" class="event-modal-btn primary">View in Google Calendar</a>` : ''}
            </div>
        </div>
    `;
    
    // Show the modal
    modal.style.display = 'flex';
    
    // Add event listeners
    modal.querySelector('.event-modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * Initialize calendar functionality
 */
function initCalendar() {
    const calendarContainer = document.getElementById('calendar-content');
    if (!calendarContainer) return;
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Generate and display the calendar
    calendarContainer.innerHTML = generateCalendarView(currentYear, currentMonth);
    
    // Add event listeners for navigation
    const prevMonthBtn = calendarContainer.querySelector('.prev-month');
    const nextMonthBtn = calendarContainer.querySelector('.next-month');
    
    let displayedYear = currentYear;
    let displayedMonth = currentMonth;
    
    prevMonthBtn.addEventListener('click', () => {
        displayedMonth--;
        if (displayedMonth < 0) {
            displayedMonth = 11;
            displayedYear--;
        }
        calendarContainer.innerHTML = generateCalendarView(displayedYear, displayedMonth);
        populateCalendarWithEvents(displayedYear, displayedMonth);
        
        // Re-add event listeners
        initCalendarControls();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        displayedMonth++;
        if (displayedMonth > 11) {
            displayedMonth = 0;
            displayedYear++;
        }
        calendarContainer.innerHTML = generateCalendarView(displayedYear, displayedMonth);
        populateCalendarWithEvents(displayedYear, displayedMonth);
        
        // Re-add event listeners
        initCalendarControls();
    });
    
    // Add event listeners for view toggle
    initCalendarControls();
    
    // Populate calendar with events if signed in
    if (gapi.client && gapi.client.getToken() !== null) {
        populateCalendarWithEvents(currentYear, currentMonth);
    }
}

/**
 * Initialize calendar control buttons
 */
function initCalendarControls() {
    const authorizeButton = document.getElementById('authorize-button');
    const signoutButton = document.getElementById('signout-button');
    
    if (authorizeButton) {
        authorizeButton.addEventListener('click', handleAuthClick);
    }
    
    if (signoutButton) {
        signoutButton.addEventListener('click', handleSignoutClick);
    }
    
    // View toggle buttons
    const viewButtons = document.querySelectorAll('.calendar-view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', () => {
            viewButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Switch view based on button data
            const view = button.getAttribute('data-view');
            switchCalendarView(view);
        });
    });
}

/**
 * Switch between calendar views (month/list)
 */
function switchCalendarView(view) {
    const calendarContainer = document.getElementById('calendar-content');
    const currentContent = calendarContainer.innerHTML;
    
    if (view === 'list') {
        // Save current month view
        calendarContainer.setAttribute('data-month-view', currentContent);
        
        // Show loading state
        calendarContainer.innerHTML = '<div class="calendar-loading"><div class="calendar-spinner"></div></div>';
        
        // Fetch events for list view
        fetchEventsForListView();
    } else if (view === 'month') {
        // Restore month view if saved
        const savedMonthView = calendarContainer.getAttribute('data-month-view');
        if (savedMonthView) {
            calendarContainer.innerHTML = savedMonthView;
            initCalendarControls();
        } else {
            // Regenerate month view
            const today = new Date();
            calendarContainer.innerHTML = generateCalendarView(today.getFullYear(), today.getMonth());
            populateCalendarWithEvents(today.getFullYear(), today.getMonth());
            initCalendarControls();
        }
    }
}

/**
 * Fetch events for list view
 */
async function fetchEventsForListView() {
    const calendarContainer = document.getElementById('calendar-content');
    
    if (!gapi.client || !gapi.client.calendar) {
        calendarContainer.innerHTML = '<p>Please sign in to view your calendar events.</p>';
        return;
    }
    
    try {
        const response = await gapi.client.calendar.events.list({
            'calendarId': 'primary',
            'timeMin': (new Date()).toISOString(),
            'showDeleted': false,
            'singleEvents': true,
            'maxResults': 30,
            'orderBy': 'startTime'
        });
        
        const events = response.result.items;
        if (!events || events.length === 0) {
            calendarContainer.innerHTML = '<p class="no-events">No upcoming events found.</p>';
            return;
        }
        
        // Generate list view HTML
        let listHtml = '<div class="calendar-list">';
        
        events.forEach(event => {
            const start = event.start.dateTime || event.start.date;
            const eventDate = new Date(start);
            
            const day = eventDate.getDate();
            const month = eventDate.toLocaleString('en-US', { month: 'short' });
            
            const timeStr = event.start.dateTime ? 
                eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 
                'All Day';
            
            listHtml += `
                <div class="calendar-list-item" data-event-id="${event.id}">
                    <div class="calendar-list-date">
                        <div class="calendar-list-day">${day}</div>
                        <div class="calendar-list-month">${month}</div>
                    </div>
                    <div class="calendar-list-content">
                        <div class="calendar-list-title">${event.summary}</div>
                        <div class="calendar-list-time">${timeStr}</div>
                        ${event.description ? `<div class="calendar-list-description">${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        listHtml += '</div>';
        
        // Add controls
        listHtml += `
            <div class="calendar-controls">
                <div class="calendar-view-toggle">
                    <button class="calendar-view-btn" data-view="month">Month</button>
                    <button class="calendar-view-btn active" data-view="list">List</button>
                </div>
                <div class="calendar-actions">
                    <button id="authorize-button" class="form-button" style="display: none;">Connect Google Calendar</button>
                    <button id="signout-button" class="form-button">Disconnect</button>
                </div>
            </div>
        `;
        
        calendarContainer.innerHTML = listHtml;
        
        // Add event listeners
        document.querySelectorAll('.calendar-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const eventId = item.getAttribute('data-event-id');
                const event = events.find(e => e.id === eventId);
                if (event) {
                    showEventDetails(event);
                }
            });
        });
        
        // Re-add control event listeners
        initCalendarControls();
        
    } catch (err) {
        calendarContainer.innerHTML = `<p>Error: ${err.message}</p>`;
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a page with calendar functionality
    const calendarContent = document.getElementById('calendar-content');
    if (calendarContent) {
        // Wait for Google API to load
        if (typeof gapi !== 'undefined') {
            initializeGoogleCalendar();
        } else {
            // If Google API isn't loaded yet, show a message
            calendarContent.innerHTML = '<p>Loading calendar functionality...</p>';
        }
    }
});

// Expose functions to global scope
window.handleAuthClick = handleAuthClick;
window.handleSignoutClick = handleSignoutClick;
window.initCalendar = initCalendar;