// Main JavaScript for Knights of Pythias Website

document.addEventListener('DOMContentLoaded', function() {
    // Navigation menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('nav ul');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }
    
    // Scroll animation for photos
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in, .photo-item').forEach(item => {
        observer.observe(item);
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // In a real application, this would send the form data to a server
            alert('Thank you for your message. A lodge representative will contact you soon.');
            contactForm.reset();
        });
    }
});

// Google Calendar Integration
function initGoogleCalendar() {
    // This function will be called after Google API is loaded
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: 'YOUR_API_KEY', // Will be replaced with actual API key
            clientId: 'YOUR_CLIENT_ID', // Will be replaced with actual Client ID
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar.readonly'
        }).then(() => {
            // Listen for sign-in state changes
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
            
            // Handle the initial sign-in state
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
        });
    });
}

function updateSigninStatus(isSignedIn) {
    const authorizeButton = document.getElementById('authorize-button');
    const signoutButton = document.getElementById('signout-button');
    const calendarContent = document.getElementById('calendar-content');
    
    if (isSignedIn) {
        authorizeButton.style.display = 'none';
        signoutButton.style.display = 'block';
        listUpcomingEvents();
    } else {
        authorizeButton.style.display = 'block';
        signoutButton.style.display = 'none';
        calendarContent.innerHTML = '<p>Please sign in to view your calendar events.</p>';
    }
}

function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick() {
    gapi.auth2.getAuthInstance().signOut();
}

function listUpcomingEvents() {
    const calendarContent = document.getElementById('calendar-content');
    calendarContent.innerHTML = '<p>Loading events...</p>';
    
    gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': (new Date()).toISOString(),
        'showDeleted': false,
        'singleEvents': true,
        'maxResults': 10,
        'orderBy': 'startTime'
    }).then(response => {
        const events = response.result.items;
        
        if (events.length > 0) {
            let html = '<ul class="event-list">';
            events.forEach(event => {
                const start = event.start.dateTime || event.start.date;
                const formattedDate = new Date(start).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                html += `<li class="event-item">
                    <div class="event-date">${formattedDate}</div>
                    <div class="event-title">${event.summary}</div>
                </li>`;
            });
            html += '</ul>';
            calendarContent.innerHTML = html;
        } else {
            calendarContent.innerHTML = '<p>No upcoming events found.</p>';
        }
    });
}

// Authentication system for member area
class AuthSystem {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        
        // Check if user is already logged in (from localStorage)
        this.checkLoginStatus();
        
        // Predefined member accounts (in a real application, these would be stored on a server)
        this.members = [
            {
                email: 'member@knightsofpythias.org',
                password: 'pythias123',
                name: 'John Knight',
                role: 'member',
                memberSince: '2020-01-15'
            },
            {
                email: 'admin@knightsofpythias.org',
                password: 'admin123',
                name: 'Robert Chancellor',
                role: 'admin',
                memberSince: '2015-03-22'
            }
        ];
    }
    
    checkLoginStatus() {
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isLoggedIn = true;
                this.updateUI();
            } catch (e) {
                console.error('Error parsing user data:', e);
                localStorage.removeItem('userData');
            }
        }
    }
    
    login(email, password) {
        // In a real application, this would make an API call to verify credentials
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Find member with matching email
                const member = this.members.find(m => m.email === email);
                
                if (member && member.password === password) {
                    this.isLoggedIn = true;
                    // Create a copy without the password
                    this.currentUser = {
                        email: member.email,
                        name: member.name,
                        role: member.role,
                        memberSince: member.memberSince
                    };
                    
                    // Save to localStorage
                    localStorage.setItem('userData', JSON.stringify(this.currentUser));
                    
                    this.updateUI();
                    resolve(this.currentUser);
                } else {
                    reject(new Error('Invalid credentials or account not found'));
                }
            }, 1000); // Simulate network delay
        });
    }
    
    logout() {
        this.isLoggedIn = false;
        this.currentUser = null;
        localStorage.removeItem('userData');
        this.updateUI();
        
        // Redirect to home page
        window.location.href = 'index.html';
    }
    
    updateUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const memberOnlyContent = document.querySelectorAll('.member-only');
        
        if (authButtons) {
            if (this.isLoggedIn) {
                authButtons.innerHTML = `
                    <span class="user-greeting">Hello, ${this.currentUser.name}</span>
                    <a href="member-dashboard.html" class="login-btn">Dashboard</a>
                    <a href="#" id="logout-btn" class="login-btn">Logout</a>
                `;
                
                // Add logout event listener
                document.getElementById('logout-btn').addEventListener('click', (e) => {
                    e.preventDefault();
                    this.logout();
                });
            } else {
                authButtons.innerHTML = `
                    <a href="login.html" class="login-btn">Member Login</a>
                `;
            }
        }
        
        // Show/hide member-only content
        memberOnlyContent.forEach(element => {
            if (this.isLoggedIn) {
                element.style.display = 'block';
            } else {
                element.style.display = 'none';
            }
        });
    }
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.authSystem = new AuthSystem();
    
    // Handle login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMessage = document.getElementById('error-message');
            
            window.authSystem.login(email, password)
                .then(() => {
                    window.location.href = 'member-dashboard.html';
                })
                .catch(error => {
                    errorMessage.textContent = error.message;
                    errorMessage.style.display = 'block';
                });
        });
    }
});