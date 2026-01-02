import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { WEEKS_DATA } from './data.js';

const html = htm.bind(React.createElement);

// --- Start Date Logic ---
const START_DATE = new Date('2025-12-30T00:00:00'); // Fixed Start Date as requested

// --- Icons (Wrapper for Vanilla Lucide) ---
// Vanilla Lucide 'window.lucide' contains objects, not Components.
// We must render <i> tags and let lucide.createIcons() animate them.
const Icon = ({ name, size = 24, color = 'currentColor', ...props }) =>
    html`<i data-lucide=${name} style=${{ width: size, height: size, color, ...props.style }} ...${props}></i>`;

const BookOpen = (p) => html`<${Icon} name="book-open" ...${p} />`;
const CalendarIcon = (p) => html`<${Icon} name="calendar" ...${p} />`;
const CheckCircle = (p) => html`<${Icon} name="check-circle" ...${p} />`;
const ChevronLeft = (p) => html`<${Icon} name="chevron-left" ...${p} />`;
const ChevronRight = (p) => html`<${Icon} name="chevron-right" ...${p} />`;
const Edit3 = (p) => html`<${Icon} name="edit-3" ...${p} />`;
const Sun = (p) => html`<${Icon} name="sun" ...${p} />`;
const Moon = (p) => html`<${Icon} name="moon" ...${p} />`;
const ArrowRight = (p) => html`<${Icon} name="arrow-right" ...${p} />`;
const ArrowLeft = (p) => html`<${Icon} name="arrow-left" ...${p} />`;
const LogOutIcon = (p) => html`<${Icon} name="log-out" ...${p} />`;

// --- Local Storage Helper ---
const getStorageKey = (key) => `artist_way_${key}`;

// --- Hooks ---

// 1. Local-Only State Hook (No Firebase)
function useSmartState(defaultValue, key) {
    // Initialize from LocalStorage
    const [value, setValue] = useState(() => {
        const stickyValue = window.localStorage.getItem(getStorageKey(key));
        return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    });

    const setSmartValue = (newValue) => {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        // Update State
        setValue(valueToStore);
        // Update LocalStorage
        window.localStorage.setItem(getStorageKey(key), JSON.stringify(valueToStore));
    };

    return [value, setSmartValue];
}

// 2. Mock Auth Hook (Always Logged In Locally)
function useAuth() {
    // We treat the user as always "logged in" to the local device
    const [user] = useState({
        uid: 'local-user',
        email: 'Local Journal',
        displayName: 'Writer'
    });
    return { user, loading: false, login: () => { }, logout: () => { } };
}

// --- Utils ---
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLocalYMD(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

function getDayInfo(dayIndex) { // 0-based index
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + dayIndex);
    const weekNum = Math.floor(dayIndex / 7) + 1;
    const dayNum = (dayIndex % 7) + 1;
    return { date, weekNum, dayNum, dateStr: getLocalYMD(date) };
}

// --- Components ---

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("React Error Boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return html`
                <div style=${{ padding: '40px', color: 'white', background: '#330000', height: '100vh' }}>
                    <h1>Something went wrong.</h1>
                    <pre style=${{ whiteSpace: 'pre-wrap', color: '#ffaaaa' }}>${this.state.error.toString()}</pre>
                </div>
            `;
        }
        return this.props.children;
    }
}

const NavBar = ({ onBack, title }) => html`
    <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style=${{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            ${onBack ? html`
                <div class="btn btn-sm btn-outline" onClick=${onBack} style=${{ marginRight: '12px' }}>
                    <${ArrowLeft} size=${18} /> Back
                </div>
            ` : html`
                <img src="./logo-v3.png" alt="Logo" style=${{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--accent-color)' }} />
            `}
            ${title && html`<h2 style=${{ margin: 0, fontSize: '1.5rem' }}>${title}</h2>`}
        </div>
        <!-- No Logout Button Needed in Local Mode -->
    </div>
`;

const LandingPage = ({ onStart }) => html`
    <div class="container animate-fade-in" style=${{ justifyContent: 'center' }}>
        <div class="landing-hero">
            <h1 style=${{ fontSize: '3.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #a0a0a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>The Artist's Way</h1>
            <p style=${{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>Your 12-week creative recovery journey.</p>
            
            <button class="btn btn-primary btn-lg" onClick=${onStart}>
                Open Journal <${ArrowRight} size=${24} />
            </button>
            <p style=${{ marginTop: '24px', fontSize: '0.9rem', color: '#666' }}>Local Mode • Offline Ready</p>
        </div>
    </div>
`;

const CalendarView = ({ onSelectDay, onBack }) => {
    // Generate all 12 weeks * 7 days
    const totalDays = 12 * 7;
    const days = [];

    // Calculate start offset (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = START_DATE.getDay();
    const spacers = Array(startDayOfWeek).fill(null);

    // Inefficient loop but okay for 84 items. 
    for (let i = 0; i < totalDays; i++) {
        const info = getDayInfo(i);
        const [done] = useSmartState(false, `mp_${info.dateStr}`);
        days.push({ ...info, done, index: i });
    }

    return html`
        <div class="container animate-fade-in">
            <${NavBar} onBack=${onBack} title="12-Week Journey" />
            <div class="calendar-grid">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => html`
                    <div style=${{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '8px' }}>${d}</div>
                `)}
                <!-- Spacers to align first day -->
                ${spacers.map(() => html`<div></div>`)}
                
                ${days.map(day => html`
                    <button 
                        class="day-cell ${day.done ? 'complete' : ''} ${day.dateStr === getLocalYMD(new Date()) ? 'today' : ''}" 
                        onClick=${() => onSelectDay(day.dateStr)}
                        title=${day.dateStr}
                    >
                        <span class="day-number">${day.dayNum}</span>
                        <span class="day-date">${formatDate(day.dateStr)}</span>
                    </button>
                `)}
            </div>
        </div>
    `;
};

const DailyEditor = ({ dateStr, onBack }) => {
    const [content, setContent] = useSmartState("", `journal_${dateStr}`);
    const [done, setDone] = useSmartState(false, `mp_${dateStr}`);

    // We also track word count for strictly UI purposes
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    const target = 750;
    const progress = Math.min(100, (wordCount / target) * 100);

    const handleSubmit = () => {
        if (wordCount >= target) {
            setDone(true);
            // Trigger confetti or feedback?
            alert("Great job! Morning Pages complete.");
            onBack();
        } else {
            alert(`Keep going! You need ${target - wordCount} more words.`);
        }
    };

    return html`
        <div class="editor-container animate-fade-in">
            <div class="editor-header">
                <div class="btn btn-sm btn-outline" onClick=${onBack}>
                    <${ArrowLeft} size={18} /> Back
                </div>
                <div style=${{ textAlign: 'center' }}>
                    <h2 style=${{ fontSize: '1.2rem', margin: 0 }}>${formatDate(dateStr)}</h2>
                    <span style=${{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Morning Pages</span>
                </div>
                <div style=${{ width: '40px' }}></div> <!-- Spacer -->
            </div>

            <div class="editor-content-wrapper">
                <textarea 
                    class="editor-textarea" 
                    placeholder="Clear your mind..." 
                    value=${content}
                    onChange=${(e) => setContent(e.target.value)}
                    autoFocus
                ></textarea>
            </div>

            <div class="word-count-bar">
                <div class="word-count-wrapper">
                    <div style=${{ flex: 1 }}>
                        <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style=${{ fontSize: '0.9rem', fontWeight: 600 }}>${wordCount} / ${target} words</span>
                            <span style=${{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>${Math.round(progress)}%</span>
                        </div>
                        <div style=${{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style=${{ width: `${progress}%`, height: '100%', background: progress >= 100 ? 'var(--success-color)' : 'var(--accent-color)', transition: 'width 0.3s ease' }}></div>
                        </div>
                    </div>
                    ${wordCount >= target && !done ? html`
                        <button class="btn btn-primary" onClick=${handleSubmit}>Mark Complete</button>
                    ` : null}
                     ${done ? html`
                        <div style=${{ color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                            <${CheckCircle} size=${20} /> Completed
                        </div>
                    ` : null}
                </div>
            </div>
        </div>
    `;
};

const WeekView = ({ weekId, onBack }) => {
    // Week Logic
    const weekData = WEEKS_DATA.find(w => w.id === parseInt(weekId)) || WEEKS_DATA[0];
    const { theme, description, tasks, quote, author } = weekData;

    // Task State (Array of bools)
    const [taskState, setTaskState] = useSmartState({}, `week_${weekId}_tasks`);

    const toggleTask = (idx) => {
        setTaskState(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return html`
        <div class="container animate-fade-in">
             <${NavBar} onBack=${onBack} title=${`Week ${weekData.id}: ${theme}`} />
             
             <div class="card" style=${{ marginBottom: '32px', textAlign: 'center' }}>
                <p class="hero-quote">"${quote}"</p>
                <p style=${{ color: 'var(--text-secondary)', marginTop: '-20px' }}>— ${author}</p>
             </div>

             <div class="dashboard-grid">
                <!-- Description -->
                <div>
                   <h3 style=${{ marginBottom: '16px' }}>Focus</h3>
                   <p style=${{ fontSize: '1.1rem', lineHeight: '1.8' }}>${description}</p>
                </div>

                <!-- Artist Date & Tasks -->
                <div class="card">
                     <h3 style=${{ marginBottom: '24px' }}>Creative Tasks</h3>
                     <div style=${{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        ${tasks.map((task, idx) => html`
                            <label class="task-item">
                                <div class="checkbox-wrapper">
                                    <input type="checkbox" checked=${!!taskState[idx]} onChange=${() => toggleTask(idx)} />
                                    <span class="custom-checkbox"></span>
                                </div>
                                <span class="task-text ${taskState[idx] ? 'strikethrough' : ''}">${task}</span>
                            </label>
                        `)}
                     </div>
                </div>
             </div>
        </div>
    `;
};

const Dashboard = ({ onNavigate }) => {
    const today = new Date();
    const todayStr = getLocalYMD(today);
    const diffTime = Math.abs(today - START_DATE);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNum = Math.min(12, Math.max(1, Math.ceil(diffDays / 7)));

    const [morningPagesDone] = useSmartState(false, `mp_${todayStr}`);
    const weekData = WEEKS_DATA.find(w => w.id === currentWeekNum);

    // Color logic: "complete" class usually handles background. 
    // We strictly control text color here to ensure readability.
    return html`
        <div class="container animate-fade-in">
            <${NavBar} title="Dashboard" />
            
            <div class="dashboard-header">
                <div>
                    <h1>Good Morning, Writer.</h1>
                    <p>Day ${diffDays} • Week ${currentWeekNum}: ${weekData.theme}</p>
                </div>
            </div>

            <div class="dashboard-grid">
                <!-- Left Column: Today's Focus -->
                <div class="dashboard-layout">
                    <div class="card card-clickable ${morningPagesDone ? 'complete' : ''}" onClick=${() => onNavigate('daily', todayStr)}>
                        <h3 style=${{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem', color: morningPagesDone ? '#fff' : 'var(--accent-color)', opacity: morningPagesDone ? 0.9 : 1 }}>
                            Today's Priority
                        </h3>
                        <h2 style=${{ fontSize: '2.5rem', margin: '16px 0', color: '#fff' }}>
                            Morning Pages
                        </h2>
                        <div style=${{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            ${morningPagesDone ? html`
                                <${CheckCircle} size=${24} color="#fff" />
                                <span style=${{ fontWeight: 600, color: '#fff' }}>Completed</span>
                            ` : html`
                                <${Edit3} size=${24} />
                                <span>Write 750 words</span>
                            `}
                        </div>
                    </div>

                    <div class="progress-card">
                        <span class="section-title">Weekly Progress</span>
                        <div class="progress-ring-container">
                             <!-- Placeholder for real chart -->
                             <div class="progress-ring-circle" style=${{ width: '100%', height: '100%', borderRadius: '50%', border: '8px solid var(--card-bg)', borderTopColor: 'var(--accent-color)' }}></div>
                             <div class="progress-text">
                                <span class="progress-number">3/7</span>
                                <span class="progress-label">Days</span>
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Week Overview -->
                <div class="dashboard-layout">
                    <div class="card">
                        <h3 style=${{ marginBottom: '16px' }}>Current Theme: <span style=${{ color: 'var(--accent-color)' }}>${weekData.theme}</span></h3>
                        <p style=${{ marginBottom: '24px' }}>${weekData.description.substring(0, 120)}...</p>
                        <button class="btn btn-outline" style=${{ width: '100%' }} onClick=${() => onNavigate('weekly', currentWeekNum)}>
                            View Week Tasks
                        </button>
                    </div>

                    <span class="section-title">Quick Actions</span>
                    <div class="quick-links-grid">
                        <div class="card card-clickable" onClick=${() => onNavigate('calendar')} style=${{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style=${{ color: 'var(--accent-color)' }}><${CalendarIcon} size=${40} /></div>
                            <div>
                                <h3>Full Calendar</h3>
                                <p>View 12-Week Schedule</p>
                            </div>
                        </div>
                        
                        <div class="card card-clickable" onClick=${() => onNavigate('weekly', currentWeekNum)} style=${{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style=${{ color: 'var(--accent-color)' }}><${BookOpen} size=${40} /></div>
                            <div>
                                <h3>Week ${currentWeekNum}</h3>
                                <p>${weekData.theme}</p>
                            </div>
                        </div>

                        <div class="card card-clickable" onClick=${() => onNavigate('review', currentWeekNum)} style=${{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', gridColumn: 'span 2' }}>
                            <div style=${{ color: 'var(--success-color)' }}><${Edit3} size=${40} /></div>
                            <div>
                                <h3>Weekly Review</h3>
                                <p>Reflect on your Week ${currentWeekNum} journey</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const WeeklyReview = ({ weekId, onBack }) => {
    const weekData = WEEKS_DATA.find(w => w.id === parseInt(weekId)) || WEEKS_DATA[0];
    const [summary, setSummary] = useSmartState("", `review_week_${weekData.id}`);

    // Get all 7 days of entries
    const entries = [];
    for (let i = 0; i < 7; i++) {
        const dayIdx = (weekData.id - 1) * 7 + i;
        const info = getDayInfo(dayIdx);
        // We peek directly into localStorage for speed/simplicity
        const content = window.localStorage.getItem(getStorageKey(`journal_${info.dateStr}`)) || "";
        if (content.trim()) {
            entries.push({ ...info, content });
        }
    }

    return html`
        <div class="container animate-fade-in">
             <${NavBar} onBack=${onBack} title=${`Review: Week ${weekData.id}`} />
            
             <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', height: 'calc(100vh - 140px)' }}>
                <!-- Left: Read Past Entries -->
                <div class="card" style=${{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '12px' }}>
                    <h3 style=${{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>Morning Pages (${entries.length}/7)</h3>
                    ${entries.length === 0 ? html`<p>No entries found for this week.</p>` : null}
                    ${entries.map(entry => html`
                        <div>
                            <div style=${{ fontSize: '0.9rem', color: 'var(--accent-color)', marginBottom: '8px' }}>
                                ${formatDate(entry.dateStr)}
                            </div>
                            <div style=${{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                ${entry.content}
                            </div>
                        </div>
                    `)}
                </div>

                <!-- Right: Write Summary -->
                <div class="card" style=${{ display: 'flex', flexDirection: 'column' }}>
                    <h3 style=${{ marginBottom: '16px' }}>Weekly Reflection</h3>
                    <p style=${{ marginBottom: '16px' }}>What key insights emerged this week? How did the Artist Date go?</p>
                    <textarea 
                        class="editor-textarea" 
                        style=${{ flex: 1, padding: '16px', fontSize: '1.1rem', background: 'rgba(0,0,0,0.2)' }}
                        placeholder="Summarize your week..."
                        value=${summary}
                        onChange=${(e) => setSummary(e.target.value)}
                    ></textarea>
                </div>
             </div>
        </div>
    `;
};

const App = () => {
    // Auth State (Local Mock)
    const { user, loading } = useAuth();

    // Routing
    const [route, setRoute] = useState({ view: 'landing', params: null });

    const navigate = (view, params = null) => {
        setRoute({ view, params });
        window.scrollTo(0, 0);
    };

    const handleStart = () => {
        navigate('dashboard');
    }

    useEffect(() => {
        if (window.lucide) window.lucide.createIcons();
    }, [route]);

    if (loading) {
        return html`<div style=${{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>`;
    }

    return html`
        <div>
            ${route.view === 'landing' && html`<${LandingPage} onStart=${handleStart} />`}
            ${route.view === 'dashboard' && html`<${Dashboard} onNavigate=${navigate} />`}
            ${route.view === 'calendar' && html`<${CalendarView} onSelectDay=${(date) => navigate('daily', date)} onBack=${() => navigate('dashboard')} />`}
            ${route.view === 'daily' && html`<${DailyEditor} dateStr=${route.params} onBack=${() => navigate('dashboard')} />`}
            ${route.view === 'weekly' && html`<${WeekView} weekId=${route.params} onBack=${() => navigate('dashboard')} />`}
            ${route.view === 'review' && html`<${WeeklyReview} weekId=${route.params} onBack=${() => navigate('dashboard')} />`}
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${ErrorBoundary}><${App} /></${ErrorBoundary}>`);
