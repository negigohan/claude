// ドラッグ中のオフセット
let dragOffsetX = 0;
let dragOffsetY = 0;

// カードの定義
const SUITS = {
    h: { name: 'hearts', symbol: '♥', color: 'red' },
    d: { name: 'diamonds', symbol: '♦', color: 'red' },
    c: { name: 'clubs', symbol: '♣', color: 'black' },
    s: { name: 'spades', symbol: '♠', color: 'black' }
};

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
        this.id = `${suit}-${rank}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    get value() {
        if (this.rank === 'A') return 1;
        if (this.rank === 'J') return 11;
        if (this.rank === 'Q') return 12;
        if (this.rank === 'K') return 13;
        return parseInt(this.rank);
    }

    get color() {
        return SUITS[this.suit].color;
    }

    get symbol() {
        return SUITS[this.suit].symbol;
    }

    canStackOn(other) {
        return this.color !== other.color && this.value === other.value - 1;
    }

    toString() {
        return `${SUITS[this.suit].symbol}${this.rank}`;
    }
}

class SolitaireGame {
    constructor() {
        this.deck = [];
        this.stock = [];
        this.waste = [];
        this.foundations = { h: [], d: [], c: [], s: [] };
        this.tableau = [[], [], [], [], [], [], []];
        this.wins = 0;
        this.losses = 0;
        this.selectedCards = [];
        this.dragStartPos = null;
        this.draggedCards = [];
        this.draggedFrom = null;

        this.initElements();
        this.loadStats();
        this.newGame();
        this.setupEventListeners();
    }

    initElements() {
        this.stockEl = document.getElementById('stock');
        this.wasteEl = document.getElementById('waste');
        this.foundationsEl = {
            h: document.getElementById('foundation-h'),
            d: document.getElementById('foundation-d'),
            c: document.getElementById('foundation-c'),
            s: document.getElementById('foundation-s')
        };
        this.tableauEls = [
            document.getElementById('tableau-0'),
            document.getElementById('tableau-1'),
            document.getElementById('tableau-2'),
            document.getElementById('tableau-3'),
            document.getElementById('tableau-4'),
            document.getElementById('tableau-5'),
            document.getElementById('tableau-6')
        ];
        this.newGameBtn = document.getElementById('new-game-btn');
        this.winsEl = document.getElementById('wins');
        this.lossesEl = document.getElementById('losses');
        this.overlay = document.getElementById('message-overlay');
        this.messageTitle = document.getElementById('message-title');
        this.messageText = document.getElementById('message-text');
        this.messageClose = document.getElementById('message-close');
    }

    setupEventListeners() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.stockEl.addEventListener('click', () => this.drawCard());
        this.messageClose.addEventListener('click', () => this.closeMessage());

        // ドラッグアンドドロップ関連イベント
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    newGame() {
        this.createDeck();
        this.shuffleDeck();
        this.stock = [];
        this.waste = [];
        this.foundations = { h: [], d: [], c: [], s: [] };
        this.tableau = [[], [], [], [], [], [], []];
        this.selectedCards = [];
        this.dealCards();
        this.restoreStock();
        this.render();
    }

    createDeck() {
        this.deck = [];
        for (const suit in SUITS) {
            for (const rank of RANKS) {
                this.deck.push(new Card(suit, rank));
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        // テーブauにカードを配る
        // 各列iにi+1枚のカードを配り、最後の1枚だけ表向きにする
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = this.deck.pop();
                if (j === i) card.faceUp = true; // 最後のカードは表向き
                this.tableau[i].push(card);
            }
        }
    }

    restoreStock() {
        // 残りカードをスタックに
        this.stock = [...this.deck];
        this.deck = [];
    }

    drawCard() {
        if (this.stock.length === 0) {
            // スタックが空ならワーストを戻す
            this.stock = this.waste.reverse().map(c => {
                c.faceUp = false;
                return c;
            });
            this.waste = [];
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
        this.render();
    }

    handleMouseDown(e) {
        const cardEl = e.target.closest('.card');
        if (!cardEl) {
            console.log('No card element found');
            return;
        }

        // dragging中のカードは処理しない
        if (cardEl.classList.contains('dragging')) {
            console.log('Card is already dragging');
            return;
        }

        e.preventDefault();

        const cardId = cardEl.dataset.id;
        const fromType = cardEl.dataset.fromType;
        const fromIndexStr = cardEl.dataset.fromIndex;
        const fromIndex = fromIndexStr !== undefined && fromIndexStr !== '' ? parseInt(fromIndexStr) : null;
        console.log('MouseDown debug:', { fromIndexStr, fromIndex, isNaN: isNaN(fromIndex) });

        console.log('MouseDown:', { cardId, fromType, fromIndex, cardClass: cardEl.className });

        // 非表示のカードは選択不可
        if (!cardEl.classList.contains('face-up')) {
            console.log('Card is not face up');
            return;
        }

        // 選択されたカードのセットを取得
        if (fromType === 'waste' || fromType === 'tableau') {
            if (isNaN(fromIndex)) {
                console.log('ERROR: fromIndex is NaN');
                return;
            }
            this.draggedFrom = { type: fromType, index: fromIndex };
            this.draggedCards = this.getDraggableCards(fromType, fromIndex, cardId);

            // カードの元の位置を取得
            const rect = cardEl.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;

            this.dragStartPos = { x: e.clientX, y: e.clientY };

            // mousedownされたカードに直接draggingクラスを追加
            cardEl.classList.add('dragging');
            console.log('Added dragging class to card');

            this.selectedCards = this.draggedCards.map(c => c.id);
            console.log('Selected cards:', this.selectedCards.length, 'cards');
            this.render();
        }
    }

    getDraggableCards(type, index, cardId) {
        console.log('getDraggableCards:', { type, index, cardId });
        console.log('  this.tableau:', this.tableau.length, 'columns');

        if (type === 'waste') {
            const cardIndex = this.waste.findIndex(c => c.id === cardId);
            const result = cardIndex !== -1 ? [this.waste[cardIndex]] : [];
            console.log('  waste result:', result.length, 'cards');
            return result;
        }

        if (type === 'tableau') {
            if (index === null || index === undefined) {
                console.log('  ERROR: index is null/undefined!');
                return [];
            }
            const column = this.tableau[index];
            console.log('  column index:', index, 'cards:', column.length);
            const cardIndex = column.findIndex(c => c.id === cardId);
            console.log('  cardIndex:', cardIndex);
            if (cardIndex === -1) return [];

            // そのカードより上のすべてのカード
            const result = column.slice(cardIndex);
            console.log('  result:', result.length, 'cards');
            return result;
        }

        return [];
    }

    handleMouseMove(e) {
        if (this.draggedCards.length === 0) return;

        // マウスの移動量を計算
        const dx = e.clientX - this.dragStartPos.x;
        const dy = e.clientY - this.dragStartPos.y;

        const cardEls = document.querySelectorAll('.card.dragging');
        console.log('MouseMove:', { dx, dy, cardElsLength: cardEls.length });
        console.log('  draggedCards:', this.draggedCards.map(c => c.id));

        // 全てのdraggingカードにtransformを適用
        cardEls.forEach((el, i) => {
            // カードの元のtop位置を取得
            const originalTop = parseFloat(el.style.top) || 0;
            const offset = i * 25; // カードの重なり

            // absolute positioningなので、dragStartPosからの相対位置を計算
            // + dragOffsetX, dragOffsetY でマウスダウンした位置からの相対位置に
            el.style.transform = `translate(${dragOffsetX + dx}px, ${dragOffsetY + dy + offset}px)`;
            el.style.zIndex = 1000 + i;
        });

        this.dragStartPos = { x: e.clientX, y: e.clientY };
    }

    handleMouseUp(e) {
        if (this.draggedCards.length === 0) return;

        // カードの位置を元に戻す
        document.querySelectorAll('.card.dragging').forEach(el => {
            el.style.transform = '';
            el.classList.remove('dragging');
        });

        // ドロップ先を判定 - マウス位置から要素を取得
        const elementsBelow = document.elementsFromPoint(e.clientX, e.clientY);
        console.log('elementsFromPoint:', elementsBelow.map(el => el.className));
        const targetEl = elementsBelow.find(el => el.classList.contains('foundation') || el.classList.contains('tableau-column'));
        console.log('targetEl:', targetEl ? targetEl.className : 'null');
        if (!targetEl) {
            this.draggedCards = [];
            this.selectedCards = [];
            this.render();
            return;
        }

        const targetType = targetEl.classList.contains('foundation') ? 'foundation' : 'tableau';
        let targetIndex;

        console.log('targetType:', targetType);
        if (targetType === 'foundation') {
            targetIndex = targetEl.dataset.suit;
        } else {
            targetIndex = parseInt(targetEl.dataset.col);
            console.log('targetIndex from dataset.col:', targetEl.dataset.col, '->', targetIndex);
        }

        this.tryMoveCards(this.draggedCards, targetType, targetIndex);

        this.draggedCards = [];
        this.selectedCards = [];
        this.render();
    }

    tryMoveCards(cards, targetType, targetIndex) {
        console.log('tryMoveCards:', { targetType, targetIndex, cardsLength: cards.length });
        const firstCard = cards[0]; // 束の一番下のカード（最も値が大きい）
        console.log('  firstCard:', firstCard.rank, firstCard.suit);

        if (targetType === 'tableau') {
            const column = this.tableau[targetIndex];
            const targetCard = column.length > 0 ? column[column.length - 1] : null;
            console.log('  targetColumn:', column.length, 'cards, targetCard:', targetCard ? targetCard.rank : 'null');

            // 移動可能かチェック
            if (targetCard === null) {
                // 空の列ならKだけ移動可能
                if (firstCard.rank === 'K') {
                    console.log('  Moving to empty column (K)');
                    this.moveToTableau(cards, targetIndex);
                } else {
                    console.log('  Cannot move: not a King');
                }
            } else if (firstCard.canStackOn(targetCard)) {
                console.log('  Moving: canStackOn is true');
                this.moveToTableau(cards, targetIndex);
            } else {
                console.log('  Cannot move: canStackOn is false');
            }
        } else if (targetType === 'foundation') {
            const column = this.foundations[targetIndex];
            const targetCard = column.length > 0 ? column[column.length - 1] : null;
            console.log('  foundation column:', column.length, 'cards, targetCard:', targetCard ? targetCard.rank : 'null');

            // 移動可能かチェック
            if (targetCard === null) {
                // 空のファンデーションならAだけ移動可能
                if (firstCard.rank === 'A') {
                    this.moveToFoundation(cards[0], targetIndex);
                }
            } else if (firstCard.suit === targetCard.suit && firstCard.value === targetCard.value + 1) {
                this.moveToFoundation(cards[0], targetIndex);
            }
        }
    }

    moveToTableau(cards, colIndex) {
        console.log('moveToTableau:', { cardsLength: cards.length, colIndex });
        // 元の位置からカードを削除
        if (this.draggedFrom.type === 'waste') {
            const cardId = cards[0].id;
            this.waste = this.waste.filter(c => c.id !== cardId);
        } else if (this.draggedFrom.type === 'tableau') {
            const column = this.tableau[this.draggedFrom.index];
            const cardId = cards[0].id;
            const cardIndex = column.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
                this.tableau[this.draggedFrom.index] = column.slice(0, cardIndex);
                // 元の列の最後のカードを表向きに
                if (this.tableau[this.draggedFrom.index].length > 0) {
                    this.tableau[this.draggedFrom.index][this.tableau[this.draggedFrom.index].length - 1].faceUp = true;
                }
            }
        }

        // 新しい列に追加
        this.tableau[colIndex] = [...this.tableau[colIndex], ...cards];
    }

    moveToFoundation(card, suit) {
        console.log('moveToFoundation:', { card: card.rank + card.suit, suit });
        // 元の位置からカードを削除
        if (this.draggedFrom.type === 'waste') {
            this.waste = this.waste.filter(c => c.id !== card.id);
        } else if (this.draggedFrom.type === 'tableau') {
            const column = this.tableau[this.draggedFrom.index];
            const cardIndex = column.findIndex(c => c.id === card.id);
            if (cardIndex !== -1) {
                this.tableau[this.draggedFrom.index] = column.slice(0, cardIndex);
                // 元の列の最後のカードを表向きに
                if (this.tableau[this.draggedFrom.index].length > 0) {
                    this.tableau[this.draggedFrom.index][this.tableau[this.draggedFrom.index].length - 1].faceUp = true;
                }
            }
        }

        // ファンデーションに追加
        this.foundations[suit].push(card);

        // 勝利チェック
        this.checkWin();
    }

    checkWin() {
        const total = Object.values(this.foundations).reduce((sum, foundation) => sum + foundation.length, 0);
        if (total === 52) {
            this.wins++;
            this.saveStats();
            this.showWinMessage();
        }
    }

    showWinMessage() {
        this.messageTitle.textContent = 'おめでとうございます！';
        this.messageText.textContent = `勝利数: ${this.wins}\nゲームに勝利しました！`;
        this.overlay.classList.add('active');
    }

    closeMessage() {
        this.overlay.classList.remove('active');
    }

    render() {
        // スタックを描画
        this.stockEl.innerHTML = '';
        const stockCard = document.createElement('div');
        stockCard.className = 'card-back';
        this.stockEl.appendChild(stockCard);
        this.stockEl.insertAdjacentHTML('beforebegin', '<span class="count" id="stock-count"></span>');
        document.getElementById('stock-count').textContent = this.stock.length;

        // ワーストを描画
        this.wasteEl.innerHTML = '';
        this.waste.forEach((card, i) => {
            const cardEl = this.createCardElement(card);
            cardEl.dataset.fromType = 'waste';
            cardEl.dataset.fromIndex = i;
            cardEl.style.top = '0px';
            this.wasteEl.appendChild(cardEl);
        });

        // ファンデーションを描画
        for (const suit in this.foundations) {
            const foundation = this.foundations[suit];
            const el = this.foundationsEl[suit];
            el.innerHTML = `<div class="suit-symbol">${SUITS[suit].symbol}</div>`;
            if (foundation.length > 0) {
                const card = foundation[foundation.length - 1];
                const cardEl = this.createCardElement(card);
                cardEl.style.position = 'absolute';
                cardEl.style.top = '0';
                cardEl.style.left = '0';
                el.appendChild(cardEl);
            }
        }

        // テーブauを描画
        this.tableau.forEach((column, colIndex) => {
            const el = this.tableauEls[colIndex];
            el.innerHTML = '';
            column.forEach((card, cardIndex) => {
                const cardEl = this.createCardElement(card);
                cardEl.dataset.fromType = 'tableau';
                cardEl.dataset.fromIndex = colIndex;
                cardEl.style.top = `${cardIndex * 25}px`;
                el.appendChild(cardEl);
            });
        });

        // 勝敗統計を更新
        this.winsEl.textContent = this.wins;
        this.lossesEl.textContent = this.losses;
    }

    createCardElement(card) {
        const el = document.createElement('div');
        let className = `card ${card.faceUp ? 'face-up' : ''} ${card.color === 'red' ? 'red' : 'black'}`;
        // ドラッグ中のスタイル適用
        if (this.selectedCards.includes(card.id)) {
            className += ' dragging';
        }
        el.className = className;
        el.dataset.id = card.id;

        if (card.faceUp) {
            el.innerHTML = `
                <div class="rank">${card.rank}</div>
                <div class="suit-top">${card.symbol}</div>
                <div class="center-suit">${card.symbol}</div>
            `;
        } else {
            el.className += ' card-back';
        }

        return el;
    }

    saveStats() {
        localStorage.setItem('solitaire-stats', JSON.stringify({ wins: this.wins, losses: this.losses }));
    }

    loadStats() {
        const stats = JSON.parse(localStorage.getItem('solitaire-stats')) || { wins: 0, losses: 0 };
        this.wins = stats.wins;
        this.losses = stats.losses;
    }
}

// ゲームの初期化
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new SolitaireGame();
});

// ファンデーションのクリックイベント（ワーストからカードを戻す）
document.querySelectorAll('.foundation').forEach(f => {
    f.addEventListener('click', (e) => {
        if (e.target !== e.currentTarget) return;
        if (game.waste.length > 0) {
            game.waste = [];
            game.stock = game.stock.concat(game.waste.reverse().map(c => { c.faceUp = false; return c; }));
            game.render();
        }
    });
});
