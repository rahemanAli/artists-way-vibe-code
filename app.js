import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import { WEEKS_DATA, START_DATE } from './data.js';
import { auth, db, googleProvider } from './firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';

const html = htm.bind(React.createElement);

// --- Icons ---
const CheckIcon = () => html`<i data-lucide="check" style=${{ width: 20, height: 20 }}></i>`;
const ChevronLeft = () => html`<i data-lucide="chevron-left"></i>`;
const ArrowLeft = () => html`<i data-lucide="arrow-left"></i>`;
const CalendarIcon = () => html`<i data-lucide="calendar"></i>`;
const BookOpen = () => html`<i data-lucide="book-open"></i>`;
const Edit3 = () => html`<i data-lucide="edit-3"></i>`;
const CalendarPlus = () => html`<i data-lucide="calendar-plus"></i>`;
const ArrowRight = () => html`<i data-lucide="arrow-right"></i>`;
const LogOutIcon = () => html`<i data-lucide="log-out"></i>`;
const UserIcon = () => html`<i data-lucide="user"></i>`;

// --- Utils ---
const getStorageKey = (key) => `artist_way_${key}`;

// Hook for Auth
function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed: " + error.message);
        }
    };

    const logout = () => signOut(auth);

    return { user, loading, login, logout };
}

// Global Sync Hook - Downloads ALL data on login to populate LocalStorage for Dashboard
function useGlobalSync(user) {
    const [synced, setSynced] = useState(false);

    useEffect(() => {
        if (!user) return;

        console.log("Starting global sync...");
        const q = query(collection(db, 'users', user.uid, 'data'));

        getDocs(q).then((snapshot) => {
            snapshot.forEach((doc) => {
                const key = doc.id;
                const val = JSON.stringify(doc.data().value);
                window.localStorage.setItem(getStorageKey(key), val);
            });
            console.log("Global sync complete.");
            setSynced(true);
            // Force a storage event to update other tabs/hooks if needed? 
            // Or just rely on the component re-rendering from setSynced(true)
        }).catch(err => console.error("Global sync failed:", err));

    }, [user]);

    return synced;
}

// Hook for Data Sync
function useSmartState(defaultValue, key, user) {
    // 1. Initialize from LocalStorage
    const [value, setValue] = useState(() => {
        const stickyValue = window.localStorage.getItem(getStorageKey(key));
        return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    });

    // Keep a ref to the current value to avoid stale closures in onSnapshot
    const valueRef = useRef(value);

    // Update ref whenever value changes
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    // 2. Sync from Firestore
    useEffect(() => {
        if (!user) return;

        const docRef = doc(db, 'users', user.uid, 'data', key);
        const unsubscribe = onSnapshot(docRef, (snap) => {
            // Ignore updates that are just our own local writes echoing back
            if (snap.metadata.hasPendingWrites) return;

            if (snap.exists()) {
                const remoteValue = snap.data().value;
                // Only update if truly different from what we currently have
                // This prevents overwriting our unsaved local work with old server data
                if (JSON.stringify(remoteValue) !== JSON.stringify(valueRef.current)) {
                    console.log(`Remote update for ${key}`, remoteValue);
                    setValue(remoteValue);
                    window.localStorage.setItem(getStorageKey(key), JSON.stringify(remoteValue));
                }
            }
        }, (err) => console.error("Sync error", err));

        return () => unsubscribe();
    }, [user, key]);

    // 3. Setter wrapper
    const setSmartValue = (newValue) => {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;

        setValue(valueToStore);
        window.localStorage.setItem(getStorageKey(key), JSON.stringify(valueToStore));

        if (user) {
            window.dispatchEvent(new CustomEvent('sync-status', { detail: 'saving' }));
            setDoc(doc(db, 'users', user.uid, 'data', key), { value: valueToStore }, { merge: true })
                .then(() => {
                    window.dispatchEvent(new CustomEvent('sync-status', { detail: 'saved' }));
                    setTimeout(() => window.dispatchEvent(new CustomEvent('sync-status', { detail: 'idle' })), 2000);
                })
                .catch(e => {
                    console.error("Save failed", e);
                    window.dispatchEvent(new CustomEvent('sync-status', { detail: 'error' }));
                    alert("Sync Error: " + e.message);
                });
        }
    };

    return [value, setSmartValue];
}

function getWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayInfo(dayIndex) { // 0-based index
    const date = new Date(START_DATE);
    date.setDate(date.getDate() + dayIndex);
    const weekNum = Math.floor(dayIndex / 7) + 1;
    const dayNum = (dayIndex % 7) + 1;
    return { date, weekNum, dayNum, dateStr: date.toISOString().split('T')[0] };
}

function generateGoogleCalendarUrl(title, details, date) {
    const d = new Date(date);
    d.setHours(10, 0, 0, 0);
    const start = d.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15) + "Z";
    d.setHours(12, 0, 0, 0);
    const end = d.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15) + "Z";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${start}/${end}`;
}

// --- Components ---

const ProgressRing = ({ radius, stroke, progress }) => {
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return html`
        <div class="progress-ring-container">
            <svg height=${radius * 2} width=${radius * 2}>
                <circle stroke="#333" stroke-width=${stroke} fill="transparent" r=${normalizedRadius} cx=${radius} cy=${radius} />
                <circle class="progress-ring-circle" stroke="var(--accent-color)" stroke-width=${stroke} stroke-dasharray=${circumference + ' ' + circumference} style=${{ strokeDashoffset }} stroke-linecap="round" fill="transparent" r=${normalizedRadius} cx=${radius} cy=${radius} />
            </svg>
            <div class="progress-text">
                <span class="progress-number">${Math.round(progress)}%</span>
                <span class="progress-label">Complete</span>
            </div>
        </div>
    `;
};

const NavBar = ({ onBack, title, user, onLogout, syncStatus }) => html`
    <div style=${{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style=${{ display: 'flex', alignItems: 'center' }}>
            ${onBack ? html`
                <div class="btn btn-sm btn-outline" onClick=${onBack} style=${{ marginRight: '24px' }}>
                    <${ArrowLeft} size=${18} /> Back
                </div>
            ` : null}
            ${title && html`<h2 style=${{ margin: 0 }}>${title}</h2>`}
        </div>
        <div style=${{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            ${user && html`
                <div style=${{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ${syncStatus === 'saving' && html`<span class="animate-pulse">Saving...</span>`}
                    ${syncStatus === 'saved' && html`<span style=${{ color: 'var(--success-color)' }}>Synced</span>`}
                    ${syncStatus === 'error' && html`<span style=${{ color: '#ff4444' }}>Sync Error</span>`}
                </div>
                <div class="btn btn-sm btn-ghost" onClick=${onLogout} title="Sign Out">
                    <${LogOutIcon} size=${20} />
                </div>
            `}
        </div>
    </div>
`;

const LandingPage = ({ onStart, onLogin, user }) => html`
    <div class="container animate-fade-in" style=${{ justifyContent: 'center' }}>
        <div class="landing-hero">
            <h1 style=${{ fontSize: '4rem', marginBottom: '1.5rem', background: 'linear-gradient(to right, #fff, #9d7fe6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                The Artist's Way
            </h1>
            <p style=${{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
                A 12-week spiritual path to higher creativity.
            </p>

            <div class="hero-quote">
                "In order to retrieve your creativity, you need to find it. I ask you to do this by an apparently pointless process I call the morning pages."
            </div>

            <div style=${{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', textAlign: 'left', maxWidth: '800px', margin: '0 auto 60px' }}>
                <div class="card" style=${{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                     <div style=${{ color: 'var(--accent-color)' }}><${Edit3} size=${32} /></div>
                     <div>
                        <h3 style=${{ marginBottom: '8px' }}>Morning Pages</h3>
                        <p>Three pages of longhand, stream of consciousness writing, done first thing in the morning.</p>
                     </div>
                </div>
                <div class="card" style=${{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                     <div style=${{ color: 'var(--accent-color)' }}><${CalendarPlus} size=${32} /></div>
                     <div>
                        <h3 style=${{ marginBottom: '8px' }}>Artist Date</h3>
                        <p>A block of time, perhaps two hours weekly, especially set aside and committed to nurturing your creative consciousness.</p>
                     </div>
                </div>
            </div>

            <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                ${!user ? html`
                     <button class="btn btn-primary btn-lg" onClick=${onLogin} style=${{ background: '#4285F4', borderColor: '#4285F4', display: 'flex', gap: '12px' }}>
                        <${UserIcon} size=${24} /> Sign in with Google to Sync
                    </button>
                    <div style=${{ opacity: 0.6, fontSize: '0.9rem' }}> or </div>
                    <button class="btn btn-outline" onClick=${onStart}>
                        Continue Offline
                    </button>
                ` : html`
                    <button class="btn btn-primary btn-lg" onClick=${onStart}>
                        Go to Dashboard <${ArrowRight} size=${24} />
                    </button>
                    <div style=${{ color: 'var(--success-color)' }}>Logged in as ${user.displayName || user.email}</div>
                `}
            </div>
        </div>
    </div>
`;

const DailyEditor = ({ dateStr, onBack, user }) => {
    const [content, setContent] = useSmartState("", `journal_${dateStr}`, user);
    const [done, setDone] = useSmartState(false, `mp_${dateStr}`, user);
    const [showSuccess, setShowSuccess] = useState(false);

    // Word count logic
    const wordCount = getWordCount(content);
    const targetWords = 750;
    const progress = Math.min(100, (wordCount / targetWords) * 100);
    const canSubmit = wordCount >= targetWords;

    const handleSubmit = () => {
        if (canSubmit) {
            setDone(true);
            setShowSuccess(true);
            setTimeout(() => {
                onBack();
            }, 2000);
        }
    };

    if (showSuccess) {
        return html`
            <div class="animate-fade-in" style=${{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: '#121212', zIndex: 100
            }}>
                <div style=${{
                width: 80, height: 80, borderRadius: '50%', background: 'var(--success-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px',
                animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
                    <${CheckIcon} size=${48} color="#000" />
                </div>
                <h2 style=${{ fontSize: '2rem', marginBottom: '8px' }}>Great Job!</h2>
                <p style=${{ color: 'var(--text-secondary)' }}>Day Complete</p>
                <style>
                    @keyframes popIn {
                        0% { transform: scale(0); }
                        100% { transform: scale(1); }
                    }
                </style>
            </div>
        `;
    }

    return html`
        <div class="animate-fade-in editor-container">
            <div class="editor-header">
                <div class="btn btn-sm btn-outline" onClick=${onBack}>
                    <${ArrowLeft} size=${16} /> Back
                </div>
                <div style=${{ fontSize: '1.1rem', fontWeight: 'bold' }}>${formatDate(dateStr)}</div>
                <div style=${{ width: 80 }}></div> <!-- Spacer -->
            </div>
            
            <div class="editor-content-wrapper">
                <textarea 
                    class="editor-textarea" 
                    placeholder="Clear your mind. Just write..." 
                    value=${content}
                    onChange=${(e) => setContent(e.target.value)}
                    autoFocus
                ></textarea>
            </div>
            
            <div class="word-count-bar">
                <div class="word-count-wrapper">
                    <div style=${{ flex: 1 }}>
                        <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span class="word-count-text">${wordCount} / ${targetWords} words</span>
                            ${done && html`<span style=${{ color: 'var(--success-color)' }}><${CheckIcon} size=${14}/> Submitted</span>`}
                        </div>
                        <div class="word-count-progress">
                            <div class="word-count-fill" style=${{ width: `${progress}%`, background: canSubmit ? 'var(--success-color)' : 'var(--accent-color)' }}></div>
                        </div>
                    </div>
                    
                    <button 
                        class="btn btn-primary ${!canSubmit ? 'btn-disabled' : ''}" 
                        style=${{ padding: '12px 24px' }}
                        onClick=${handleSubmit}
                        disabled=${!canSubmit}
                    >
                        ${done ? 'Update' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    `;
};

const CalendarView = ({ onSelectDay, onBack, user, syncStatus }) => {
    const weeks = useMemo(() => {
        const result = [];
        for (let w = 0; w < 12; w++) {
            const days = [];
            for (let d = 0; d < 7; d++) {
                days.push(getDayInfo(w * 7 + d));
            }
            result.push({ id: w + 1, days });
        }
        return result;
    }, []);

    const todayStr = new Date().toISOString().split('T')[0];

    // Note: For Calendar View, we are reading individual days. 
    // This is inefficient with the current hook structure (84 hooks?).
    // A better approach for the future is to sync the whole progress map.
    // For now, we will rely on LocalStorage for the overview to keep it fast, 
    // assuming the individual "DailyEditor" opens will sync the specific days.
    // OR we could fetch 'all progress' on mount.
    // Limitation alert: Calendar might not show completion from phone immediately until you view the day.
    // But since `useSmartState` writes to localStorage, if we visited the day it's there.
    // For sync: Ideally we need a `useAllProgress` hook.
    // Let's stick to localStorage for rendering the grid for speed, assuming user mostly works on "today".

    return html`
        <div class="container animate-fade-in">
            <${NavBar} onBack=${onBack} title="12-Week Journey" user=${user} syncStatus=${syncStatus} />
            
            <div style=${{ display: 'grid', gap: '32px' }}>
                ${weeks.map(week => html`
                    <div key=${week.id}>
                        <div style=${{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                            <span style=${{ fontWeight: '600', color: '#fff', fontSize: '1.2rem' }}>Week ${week.id}</span>
                            <span style=${{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>${formatDate(week.days[0].date)} - ${formatDate(week.days[6].date)}</span>
                        </div>
                        <div class="calendar-grid">
                            ${week.days.map(day => {
        const isToday = day.dateStr === todayStr;
        const isDone = window.localStorage.getItem(getStorageKey(`mp_${day.dateStr}`)) === 'true';
        const dateNum = day.date.getDate();
        const monthShort = day.date.toLocaleString('default', { month: 'short' });

        return html`
                                    <div 
                                        class="day-cell ${isToday ? 'today' : ''} ${isDone ? 'complete' : ''}" 
                                        onClick=${() => onSelectDay(day.dateStr)}
                                    >
                                        <span class="day-number">${day.dayNum}</span>
                                        <span class="day-date">${monthShort} ${dateNum}</span>
                                    </div>
                                `;
    })}
                        </div>
                    </div>
                `)}
            </div>
        </div>
    `;
};

const Dashboard = ({ onNavigate, user, onLogout, syncStatus }) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const diffTime = Math.abs(today - START_DATE);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const currentWeekNum = Math.min(12, Math.max(1, Math.ceil(diffDays / 7)));

    let completedCount = 0;
    for (let i = 0; i < 84; i++) {
        const { dateStr } = getDayInfo(i);
        if (window.localStorage.getItem(getStorageKey(`mp_${dateStr}`)) === 'true') {
            completedCount++;
        }
    }
    const progressPercent = (completedCount / 84) * 100;

    const weekData = WEEKS_DATA.find(w => w.id === currentWeekNum) || WEEKS_DATA[0];
    const [morningPagesDone] = useSmartState(false, `mp_${todayStr}`, user);

    return html`
        <div class="container animate-fade-in dashboard-layout">
            <header class="dashboard-header">
                <div>
                    <h1>The Artist's Way</h1>
                    <p>Welcome back, ${user ? (user.displayName || 'Creator') : 'Creator'}.</p>
                </div>
                <div>
                    ${user && html`
                        <div class="btn btn-sm btn-ghost" onClick=${onLogout}>Sign Out</div>
                    `}
                </div>
            </header>

            <div class="dashboard-grid">
                <!-- Left Column -->
                <div class="dashboard-left">
                     <div class="card progress-card">
                        <span class="section-title">Your Progress</span>
                        <${ProgressRing} radius=${80} stroke=${12} progress=${progressPercent} />
                        <div style=${{ marginTop: '16px' }}>
                             <h3>Day ${diffDays}</h3>
                             <p>You are in Week ${currentWeekNum}</p>
                        </div>
                     </div>
                </div>

                <!-- Right Column -->
                <div class="dashboard-right">
                    <span class="section-title">Today's Focus</span>
                    
                    <div class="card card-clickable action-card" onClick=${() => onNavigate('daily', todayStr)} style=${{
            border: morningPagesDone ? '1px solid var(--success-color)' : '1px solid var(--accent-color)',
            background: morningPagesDone ? 'var(--success-bg)' : 'rgba(157, 127, 230, 0.1)',
            display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '32px'
        }}>
                        <div style=${{
            background: morningPagesDone ? 'var(--success-color)' : 'var(--accent-color)',
            minWidth: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: morningPagesDone ? '#000' : '#fff'
        }}>
                            <${morningPagesDone ? CheckIcon : Edit3} size=${32} />
                        </div>
                        <div>
                            <h2 style=${{ marginBottom: 8, fontSize: '1.8rem' }}>${morningPagesDone ? "Completed" : "Morning Pages"}</h2>
                            <p style=${{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                ${morningPagesDone ? "Well done. You've cleared your mind for the day." : "Write your 3 morning pages to unlock this day."}
                            </p>
                        </div>
                        <div style=${{ marginLeft: 'auto' }}>
                             <${ChevronLeft} size=${24} style=${{ transform: 'rotate(180deg)' }} />
                        </div>
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
                    </div>
                </div>
            </div>
        </div>
    `;
};

const WeekView = ({ weekId, onBack, user, syncStatus }) => {
    const weekData = WEEKS_DATA.find(w => w.id === parseInt(weekId)) || WEEKS_DATA[0];
    const [tasksState, setTasksState] = useSmartState({}, `tasks_week_${weekData.id}`, user);

    const info = getDayInfo((weekData.id - 1) * 7);
    const reminderUrl = generateGoogleCalendarUrl(
        `Artist Date (Week ${weekData.id})`,
        `Time for your artist date! Theme: ${weekData.theme}. ${weekData.description}`,
        info.date.toISOString()
    );

    const toggleTask = (index) => setTasksState(prev => ({ ...prev, [index]: !prev[index] }));

    return html`
        <div class="container animate-fade-in">
             <${NavBar} onBack=${onBack} title=${`Week ${weekData.id}: ${weekData.theme}`} user=${user} syncStatus=${syncStatus} />
            
             <div class="card">
                <blockquote style=${{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', fontSize: '1.4rem', fontFamily: 'Georgia, serif', fontStyle: 'italic', color: '#fff' }}>
                    "${weekData.description}"
                </blockquote>

                <div style=${{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                     <div>
                        <h3 style=${{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <${CalendarPlus} size=${24} /> Artist Date Reminder
                        </h3>
                        <p>Don't forget to schedule your weekly solo artist date.</p>
                     </div>
                     <a href=${reminderUrl} target="_blank" class="btn btn-outline">
                        Add to Google Calendar
                     </a>
                </div>

                <h3 style=${{ marginBottom: '24px', fontSize: '1.5rem' }}>Weekly Tasks</h3>
                <div style=${{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    ${weekData.tasks.map((task, idx) => html`
                        <div class="task-item" key=${idx} onClick=${() => toggleTask(idx)} style=${{ cursor: 'pointer' }}>
                             <div class="checkbox-wrapper" style=${{ marginTop: '2px' }}>
                                <input type="checkbox" checked=${!!tasksState[idx]} readOnly />
                                <div class="custom-checkbox"></div>
                            </div>
                            <div class="task-text ${tasksState[idx] ? 'strikethrough' : ''}" style=${{ color: tasksState[idx] ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                ${task}
                            </div>
                        </div>
                    `)}
                </div>
            </div>
        </div>
    `;
};

const App = () => {
    // Auth State
    const { user, loading, login, logout } = useAuth();
    // Trigger global download on login
    useGlobalSync(user);

    // Global Sync Status Listener
    const [syncStatus, setSyncStatus] = useState('idle');
    useEffect(() => {
        const handler = (e) => setSyncStatus(e.detail);
        window.addEventListener('sync-status', handler);
        return () => window.removeEventListener('sync-status', handler);
    }, []);

    // Routing
    const [route, setRoute] = useState({ view: 'landing', params: null });

    // Always show landing page on refresh/new visit unless logged in logic
    // Actually, let's keep the existing flow: Landing -> Dashboard
    // But if logged in, we land on dashboard?
    // Let's keep it manual start for now to show the nice landing page.

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
            ${route.view === 'landing' && html`<${LandingPage} onStart=${handleStart} onLogin=${login} user=${user} />`}
            ${route.view === 'dashboard' && html`<${Dashboard} onNavigate=${navigate} user=${user} onLogout=${logout} syncStatus=${syncStatus} />`}
            ${route.view === 'calendar' && html`<${CalendarView} onSelectDay=${(date) => navigate('daily', date)} onBack=${() => navigate('dashboard')} user=${user} syncStatus=${syncStatus} />`}
            ${route.view === 'daily' && html`<${DailyEditor} dateStr=${route.params} onBack=${() => navigate('dashboard')} user=${user} syncStatus=${syncStatus} />`}
            ${route.view === 'weekly' && html`<${WeekView} weekId=${route.params} onBack=${() => navigate('dashboard')} user=${user} syncStatus=${syncStatus} />`}
            
            <div style=${{
            position: 'fixed', bottom: 4, left: 0, right: 0,
            textAlign: 'center', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', pointerEvents: 'none'
        }}>
                v1.2 | Today: ${new Date().toISOString().split('T')[0]} | ${user ? user.email : 'Offline'}
            </div>
        </div>
    `;
};

const root = createRoot(document.getElementById('root'));
root.render(html`<${App} />`);
