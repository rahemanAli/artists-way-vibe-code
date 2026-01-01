/**
 * Secure Vault Application Logic
 */

class App {
    constructor() {
        this.STORAGE_KEY_DATA = 'secure_vault_data';
        this.STORAGE_KEY_VERIFIER = 'secure_vault_verifier';
        this.STORAGE_KEY_SALT = 'secure_vault_salt'; // Salt for the validator

        this.sessionPassword = null;
        this.secrets = [];

        this.cacheDOM();
        this.bindEvents();
        this.checkSetup();
    }

    cacheDOM() {
        this.dom = {
            views: {
                setup: document.getElementById('view-setup'),
                login: document.getElementById('view-login'),
                dashboard: document.getElementById('view-dashboard')
            },
            forms: {
                setup: document.getElementById('setup-form'),
                login: document.getElementById('login-form'),
                addSecret: document.getElementById('add-secret-form')
            },
            inputs: {
                setupPass: document.getElementById('setup-password'),
                setupPassConfirm: document.getElementById('setup-password-confirm'),
                loginPass: document.getElementById('login-password'),
                secretTitle: document.getElementById('secret-title'),
                secretContent: document.getElementById('secret-content'),
                search: document.getElementById('search-secrets')
            },
            status: {
                setup: document.getElementById('setup-status'),
                login: document.getElementById('login-status')
            },
            lists: {
                secrets: document.getElementById('secrets-list')
            },
            modals: {
                add: document.getElementById('modal-add')
            }
        };
    }

    bindEvents() {
        // Setup Submit
        this.dom.forms.setup.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSetup();
        });

        // Login Submit
        this.dom.forms.login.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // FAB - Add Secret
        document.querySelector('.fab').addEventListener('click', () => {
            this.showModal(this.dom.modals.add);
        });

        // Close Modals
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal(this.dom.modals.add);
            });
        });

        // Add Secret Submit
        this.dom.forms.addSecret.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddSecret();
        });

        // Search
        this.dom.inputs.search.addEventListener('input', (e) => {
            this.renderSecrets(e.target.value);
        });
    }

    showView(viewName) {
        Object.values(this.dom.views).forEach(el => el.classList.remove('active'));
        this.dom.views[viewName].classList.add('active');
    }

    checkSetup() {
        const verifier = localStorage.getItem(this.STORAGE_KEY_VERIFIER);
        if (verifier) {
            this.showView('login');
        } else {
            this.showView('setup');
        }
    }

    async handleSetup() {
        const pass = this.dom.inputs.setupPass.value;
        const confirm = this.dom.inputs.setupPassConfirm.value;

        if (!pass || pass.length < 4) {
            this.showMessage(this.dom.status.setup, 'Password too short (min 4 chars)', true);
            return;
        }

        if (pass !== confirm) {
            this.showMessage(this.dom.status.setup, 'Passwords do not match', true);
            return;
        }

        // Create Verifier
        // We generate a long random salt string
        const salt = CryptoVault.buf2hex(CryptoVault.generateSalt());
        const hash = await CryptoVault.hashPasswordVerifier(pass, salt);

        localStorage.setItem(this.STORAGE_KEY_SALT, salt);
        localStorage.setItem(this.STORAGE_KEY_VERIFIER, hash);

        // Initialize empty vault
        this.saveVault([]);

        this.showMessage(this.dom.status.setup, 'Vault initialized!', false);
        setTimeout(() => {
            this.dom.forms.setup.reset();
            this.checkSetup();
        }, 1000);
    }

    async handleLogin() {
        const pass = this.dom.inputs.loginPass.value;
        const storedSalt = localStorage.getItem(this.STORAGE_KEY_SALT);
        const storedHash = localStorage.getItem(this.STORAGE_KEY_VERIFIER);

        const computedHash = await CryptoVault.hashPasswordVerifier(pass, storedSalt);

        if (computedHash === storedHash) {
            this.sessionPassword = pass;
            this.showMessage(this.dom.status.login, 'Decrypting...', false);
            await this.loadVault();
            this.showView('dashboard');
            this.dom.forms.login.reset();
            this.dom.status.login.textContent = '';
        } else {
            this.showMessage(this.dom.status.login, 'Incorrect password', true);
        }
    }

    logout() {
        this.sessionPassword = null;
        this.secrets = [];
        this.checkSetup();
    }

    async loadVault() {
        const raw = localStorage.getItem(this.STORAGE_KEY_DATA);
        if (!raw) {
            this.secrets = [];
            return;
        }

        try {
            // raw is a JSON string of a single Encrypted Object
            const encryptedObj = JSON.parse(raw);
            const decryptedJson = await CryptoVault.decryptData(encryptedObj, this.sessionPassword);
            this.secrets = JSON.parse(decryptedJson);
            this.renderSecrets();
        } catch (e) {
            console.error("Failed to load vault", e);
            alert("Critical Error: Could not decrypt vault data. Did the data get corrupted?");
        }
    }

    async saveVault(data) {
        if (!data) data = this.secrets;

        // Encrypt the WHOLE array as one blob
        // In a clearer implementation we might encrypt items individually, but for "Ultra Secure"
        // encrypting the whole structure hides metadata (like number of items) too.

        // If we are just initializing (no session password yet), we can't encrypt properly
        // BUT handleSetup uses this function. For setup, we don't have a sessionPassword set, 
        // we might need to pass it or rely on logic.

        // Actually, for the Initial Setup, there's no data to save yet other than EMPTY.
        // And we don't have the password cached in 'sessionPassword' during setup?
        // Let's relax: initialized as empty list doesn't need encryption if it's just '[]'.
        // Wait, if we want it consistently encrypted, we need the password.

        // Refactor: handleSetup should just set verifier. The first SAVE happens when adding data.
        // OR we just initialize an empty encrypted blob.

        // If we call saveVault from handleAddSecret, we have session(Pass).

        if (this.sessionPassword) {
            const jsonStr = JSON.stringify(data);
            const encrypted = await CryptoVault.encryptData(jsonStr, this.sessionPassword);
            localStorage.setItem(this.STORAGE_KEY_DATA, JSON.stringify(encrypted));
        } else {
            // This case is only for initialization of EMPTY vault? 
            // In setup we just verified. We can assume empty locally until first save.
            localStorage.setItem(this.STORAGE_KEY_DATA, '');
        }
    }

    async handleAddSecret() {
        const title = this.dom.inputs.secretTitle.value;
        const content = this.dom.inputs.secretContent.value;

        if (!title || !content) return;

        const newSecret = {
            id: Date.now(), // simple ID
            title,
            content,
            created: new Date().toISOString()
        };

        this.secrets.unshift(newSecret);

        // Persist
        await this.saveVault(this.secrets);

        this.renderSecrets();
        this.hideModal(this.dom.modals.add);
        this.dom.forms.addSecret.reset();
    }

    renderSecrets(filter = '') {
        const list = this.dom.lists.secrets;
        list.innerHTML = '';

        const filtered = this.secrets.filter(s =>
            s.title.toLowerCase().includes(filter.toLowerCase()) ||
            s.content.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state">No secrets found in the vault.</div>';
            return;
        }

        filtered.forEach(secret => {
            const el = document.createElement('div');
            el.className = 'card';
            el.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${this.escapeHtml(secret.title)}</span>
                    <small style="color: var(--text-secondary)">${new Date(secret.created).toLocaleDateString()}</small>
                </div>
                <div class="card-content">
                    <div class="secret-value">${this.formatContent(secret.content)}</div>
                </div>
            `;
            list.appendChild(el);
        });
    }

    escapeHtml(str) {
        // Basic escaping to prevent XSS if we render HTML
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    formatContent(str) {
        return this.escapeHtml(str).replace(/\n/g, '<br>');
    }

    showMessage(el, msg, isError) {
        el.textContent = msg;
        el.className = 'status-message ' + (isError ? 'status-error' : 'status-success');
    }

    showModal(modal) {
        modal.classList.add('visible');
    }

    hideModal(modal) {
        modal.classList.remove('visible');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
