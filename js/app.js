// Bible Compagnon - Application principale
class BibleApp {
    constructor() {
        this.bible = null;
        this.currentBook = null;
        this.currentChapter = null;
        this.favorites = this.loadFavorites();
        this.currentView = 'read';

        this.init();
    }

    async init() {
        try {
            // Charger la Bible
            await this.loadBible();

            // Initialiser l'interface
            this.setupUI();
            this.setupEventListeners();

            // Charger la dernière lecture ou commencer par Jean 3
            const lastRead = this.loadLastRead();
            if (lastRead) {
                this.loadChapter(lastRead.bookId, lastRead.chapter);
            } else {
                this.loadChapter('JHN', 3);
            }

            // Cacher le loader
            document.getElementById('loadingView').classList.add('hidden');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            this.showError('Erreur lors du chargement de la Bible');
        }
    }

    async loadBible() {
        const response = await fetch('data/bible.json');
        this.bible = await response.json();
    }

    setupUI() {
        // Créer les boutons de livres
        const bookSelector = document.getElementById('bookSelector');
        this.bible.books.forEach(book => {
            const btn = document.createElement('button');
            btn.className = 'book-btn';
            btn.textContent = book.name;
            btn.dataset.bookId = book.id;
            btn.addEventListener('click', () => this.showChapterSelector(book.id));
            bookSelector.appendChild(btn);
        });
    }

    setupEventListeners() {
        // Navigation principale
        document.getElementById('navRead').addEventListener('click', () => this.switchView('read'));
        document.getElementById('navFavorites').addEventListener('click', () => this.switchView('favorites'));

        // Recherche
        document.getElementById('searchBtn').addEventListener('click', () => this.openSearch());
        document.getElementById('closeSearchBtn').addEventListener('click', () => this.closeSearch());
        document.getElementById('searchOverlay').addEventListener('click', () => this.closeSearch());
        document.getElementById('searchInput').addEventListener('input', (e) => this.search(e.target.value));

        // Thème
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleTheme());

        // Navigation chapitres
        document.getElementById('prevChapterBtn').addEventListener('click', () => this.navigateChapter(-1));
        document.getElementById('nextChapterBtn').addEventListener('click', () => this.navigateChapter(1));

        // Charger le thème sauvegardé
        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }

    switchView(view) {
        this.currentView = view;

        // Mettre à jour la navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        if (view === 'read') {
            document.getElementById('navRead').classList.add('active');
            document.getElementById('favoritesView').classList.add('hidden');
            if (this.currentBook && this.currentChapter) {
                document.getElementById('readingView').classList.remove('hidden');
            } else {
                document.getElementById('chapterSelectorView').classList.remove('hidden');
            }
        } else if (view === 'favorites') {
            document.getElementById('navFavorites').classList.add('active');
            document.getElementById('readingView').classList.add('hidden');
            document.getElementById('chapterSelectorView').classList.add('hidden');
            this.showFavorites();
        }
    }

    showChapterSelector(bookId) {
        const book = this.bible.books.find(b => b.id === bookId);
        if (!book) return;

        this.currentBook = book;

        // Mettre à jour l'interface
        document.getElementById('readingView').classList.add('hidden');
        document.getElementById('chapterSelectorView').classList.remove('hidden');
        document.getElementById('bookTitle').textContent = book.name;

        // Mettre à jour les boutons de livres
        document.querySelectorAll('.book-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bookId === bookId);
        });

        // Créer la grille de chapitres
        const chapterGrid = document.getElementById('chapterGrid');
        chapterGrid.innerHTML = '';

        book.chapters.forEach(chapter => {
            const btn = document.createElement('button');
            btn.className = 'chapter-btn';
            btn.textContent = chapter.number;
            btn.addEventListener('click', () => this.loadChapter(bookId, chapter.number));
            chapterGrid.appendChild(btn);
        });
    }

    loadChapter(bookId, chapterNumber) {
        const book = this.bible.books.find(b => b.id === bookId);
        if (!book) return;

        const chapter = book.chapters.find(c => c.number === chapterNumber);
        if (!chapter) return;

        this.currentBook = book;
        this.currentChapter = chapter;

        // Sauvegarder la dernière lecture
        this.saveLastRead(bookId, chapterNumber);

        // Mettre à jour l'en-tête
        document.getElementById('headerTitle').textContent = book.name;
        document.getElementById('chapterTitle').textContent = `${book.name} ${chapterNumber}`;

        // Afficher les versets
        const versesContainer = document.getElementById('versesContainer');
        versesContainer.innerHTML = '';

        chapter.verses.forEach(verse => {
            const verseEl = this.createVerseElement(book.id, chapterNumber, verse);
            versesContainer.appendChild(verseEl);
        });

        // Mettre à jour la navigation
        this.updateChapterNavigation();

        // Afficher la vue de lecture
        document.getElementById('chapterSelectorView').classList.add('hidden');
        document.getElementById('readingView').classList.remove('hidden');

        // Mettre à jour les boutons de livres
        document.querySelectorAll('.book-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bookId === bookId);
        });

        // Scroll vers le haut
        window.scrollTo(0, 0);
    }

    createVerseElement(bookId, chapterNumber, verse) {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse';
        verseDiv.dataset.verseId = `${bookId}-${chapterNumber}-${verse.number}`;

        // Vérifier si c'est un favori
        if (this.isFavorite(bookId, chapterNumber, verse.number)) {
            verseDiv.classList.add('highlighted');
        }

        verseDiv.innerHTML = `
            <span class="verse-number">${verse.number}</span>
            <span class="verse-text">${verse.text}</span>
            <button class="favorite-btn ${this.isFavorite(bookId, chapterNumber, verse.number) ? 'active' : ''}"
                    data-book="${bookId}"
                    data-chapter="${chapterNumber}"
                    data-verse="${verse.number}">
                <svg viewBox="0 0 24 24" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
        `;

        // Ajouter l'événement pour les favoris
        const favoriteBtn = verseDiv.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleFavorite(bookId, chapterNumber, verse.number, verse.text);
        });

        return verseDiv;
    }

    updateChapterNavigation() {
        const prevBtn = document.getElementById('prevChapterBtn');
        const nextBtn = document.getElementById('nextChapterBtn');

        // Vérifier si on peut aller au chapitre précédent
        const currentChapterIndex = this.currentBook.chapters.findIndex(
            c => c.number === this.currentChapter.number
        );

        prevBtn.disabled = currentChapterIndex === 0;
        nextBtn.disabled = currentChapterIndex === this.currentBook.chapters.length - 1;
    }

    navigateChapter(direction) {
        const currentChapterIndex = this.currentBook.chapters.findIndex(
            c => c.number === this.currentChapter.number
        );

        const newIndex = currentChapterIndex + direction;

        if (newIndex >= 0 && newIndex < this.currentBook.chapters.length) {
            const newChapter = this.currentBook.chapters[newIndex];
            this.loadChapter(this.currentBook.id, newChapter.number);
        }
    }

    toggleFavorite(bookId, chapterNumber, verseNumber, verseText) {
        const key = `${bookId}-${chapterNumber}-${verseNumber}`;

        if (this.favorites[key]) {
            delete this.favorites[key];
        } else {
            this.favorites[key] = {
                bookId,
                bookName: this.currentBook.name,
                chapter: chapterNumber,
                verse: verseNumber,
                text: verseText,
                timestamp: Date.now()
            };
        }

        this.saveFavorites();

        // Mettre à jour l'interface
        const verseEl = document.querySelector(`[data-verse-id="${key}"]`);
        if (verseEl) {
            verseEl.classList.toggle('highlighted');
            const btn = verseEl.querySelector('.favorite-btn');
            btn.classList.toggle('active');
        }

        // Si on est dans la vue favoris, rafraîchir
        if (this.currentView === 'favorites') {
            this.showFavorites();
        }
    }

    isFavorite(bookId, chapterNumber, verseNumber) {
        const key = `${bookId}-${chapterNumber}-${verseNumber}`;
        return !!this.favorites[key];
    }

    showFavorites() {
        const container = document.getElementById('favoritesContainer');
        document.getElementById('favoritesView').classList.remove('hidden');

        const favoritesList = Object.values(this.favorites).sort((a, b) => b.timestamp - a.timestamp);

        if (favoritesList.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px 20px;">Aucun favori pour le moment.<br>Appuyez sur ❤️ pour ajouter vos versets préférés.</p>';
            return;
        }

        container.innerHTML = '';
        favoritesList.forEach(fav => {
            const verseDiv = document.createElement('div');
            verseDiv.className = 'verse highlighted';
            verseDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <span style="font-weight: 700; color: var(--violet); cursor: pointer;"
                          onclick="app.loadChapter('${fav.bookId}', ${fav.chapter})">
                        ${fav.bookName} ${fav.chapter}:${fav.verse}
                    </span>
                    <button class="favorite-btn active"
                            onclick="app.toggleFavorite('${fav.bookId}', ${fav.chapter}, ${fav.verse}, \`${fav.text}\`)">
                        <svg viewBox="0 0 24 24" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                    </button>
                </div>
                <p class="verse-text">${fav.text}</p>
            `;
            container.appendChild(verseDiv);
        });
    }

    openSearch() {
        document.getElementById('searchOverlay').classList.add('active');
        document.getElementById('searchModal').classList.add('active');
        document.getElementById('searchInput').focus();
    }

    closeSearch() {
        document.getElementById('searchOverlay').classList.remove('active');
        document.getElementById('searchModal').classList.remove('active');
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').innerHTML = '';
    }

    search(query) {
        const resultsContainer = document.getElementById('searchResults');

        if (!query || query.length < 3) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Entrez au moins 3 caractères pour rechercher</p>';
            return;
        }

        const results = [];
        const searchTerm = query.toLowerCase();

        this.bible.books.forEach(book => {
            book.chapters.forEach(chapter => {
                chapter.verses.forEach(verse => {
                    if (verse.text.toLowerCase().includes(searchTerm)) {
                        results.push({
                            bookId: book.id,
                            bookName: book.name,
                            chapter: chapter.number,
                            verse: verse.number,
                            text: verse.text
                        });
                    }
                });
            });
        });

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Aucun résultat trouvé</p>';
            return;
        }

        resultsContainer.innerHTML = '';
        results.slice(0, 20).forEach(result => {
            const resultEl = document.createElement('div');
            resultEl.className = 'search-result';
            resultEl.innerHTML = `
                <div class="result-reference">${result.bookName} ${result.chapter}:${result.verse}</div>
                <div class="result-text">${this.highlightText(result.text, searchTerm)}</div>
            `;
            resultEl.addEventListener('click', () => {
                this.loadChapter(result.bookId, result.chapter);
                this.closeSearch();
                this.switchView('read');
            });
            resultsContainer.appendChild(resultEl);
        });

        if (results.length > 20) {
            const moreEl = document.createElement('p');
            moreEl.style.textAlign = 'center';
            moreEl.style.color = 'var(--text-secondary)';
            moreEl.style.padding = '20px';
            moreEl.textContent = `+ ${results.length - 20} autres résultats`;
            resultsContainer.appendChild(moreEl);
        }
    }

    highlightText(text, searchTerm) {
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<strong style="background: rgba(107, 93, 211, 0.2); padding: 2px 4px; border-radius: 4px;">$1</strong>');
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // LocalStorage helpers
    loadFavorites() {
        const saved = localStorage.getItem('favorites');
        return saved ? JSON.parse(saved) : {};
    }

    saveFavorites() {
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
    }

    loadLastRead() {
        const saved = localStorage.getItem('lastRead');
        return saved ? JSON.parse(saved) : null;
    }

    saveLastRead(bookId, chapter) {
        localStorage.setItem('lastRead', JSON.stringify({ bookId, chapter }));
    }

    showError(message) {
        alert(message);
    }
}

// Initialiser l'application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BibleApp();
});

// Service Worker pour PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker enregistré'))
            .catch(err => console.log('Erreur Service Worker:', err));
    });
}
