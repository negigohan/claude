const LLAMA_SERVER = 'http://127.0.0.1:8080/v1/chat/completions';

const HAND_NAMES = { G: 'グー', C: 'チョキ', P: 'パー' };
const HAND_EMOJI = { G: '✊', C: '✋', P: '🖐' };

// Game state
let state = 'idle'; // idle | waiting_llm | choosing | result
let llmHand = null; // cached LLM response
let history = [];   // [{llm: 'G', player: 'C', result: 'win'}, ...]

// Screen elements
const screens = {
  start: document.getElementById('start-screen'),
  thinking: document.getElementById('thinking-screen'),
  choice: document.getElementById('choice-screen'),
  result: document.getElementById('result-screen'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// LLM communication
async function queryLLM(prompt) {
  console.log('[→ LLM prompt]', prompt);
  const response = await fetch(LLAMA_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 20,
    }),
  });

  const data = await response.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  // Parse: extract G, C, or P from response
  const match = text.match(/[GCP]/);
  const hand = match ? match[0] : 'G'; // fallback to G if unparseable
  console.log('[← LLM response]', text, '→ parsed:', hand);
  return hand;
}

function buildPrompt() {
  if (history.length === 0) {
    return `じゃんけんを行う。グー(=G), チョキ(=C), パー(=P)のいずれかを完全にランダムに選び、G,C,Pの文字1つだけ出力せよ。
じゃんけんのルール: グーはチョキに勝ち、チョキはパーに勝ち、パーはグーに勝つ
パターンを作らず、偏りなくランダムに選べ`;
  }
  const historyJson = history.map(h => ({
    llm: HAND_NAMES[h.llm],
    player: HAND_NAMES[h.player],
    result: h.result === 'win' ? 'WIN' : h.result === 'lose' ? 'LOSE' : 'DRAW',
  }));
  return `じゃんけんを行う。過去の結果:${JSON.stringify(historyJson)}
resultはあなたの視点(WIN=あなたの勝ち, LOSE=あなたの負け, DRAW=引き分け)である。
過去にWINになった手を多用し、LOSEになった手は避け、DRAWになった手は適度に使い、G,C,Pから選び1つだけ出力せよ`;
}

// Determine winner: returns 'win', 'lose', or 'draw' (from LLM's perspective)
function determineResult(llm, player) {
  if (llm === player) return 'draw';
  if ((llm === 'G' && player === 'P') ||
      (llm === 'C' && player === 'G') ||
      (llm === 'P' && player === 'C')) {
    return 'lose';
  }
  return 'win';
}

function resultText(result) {
  // result is from LLM's perspective, display from player's perspective
  if (result === 'win') return '💪 LLMの勝ち！';
  if (result === 'lose') return '🎉 勝ち！';
  return '🤝 引き分け！';
}

// Game flow
async function startGame() {
  state = 'waiting_llm';
  showScreen('thinking');

  // Query LLM and cache the response
  llmHand = await queryLLM(buildPrompt());

  state = 'choosing';
  showScreen('choice');
}

function onPlayerChoose(hand) {
  if (state !== 'choosing') return;

  const result = determineResult(llmHand, hand);
  history.push({ llm: llmHand, player: hand, result });

  // Update result display
  document.getElementById('llm-hand').textContent =
    HAND_EMOJI[llmHand] + ' ' + HAND_NAMES[llmHand];
  document.getElementById('player-hand').textContent =
    HAND_EMOJI[hand] + ' ' + HAND_NAMES[hand];

  const resultEl = document.getElementById('result-text');
  resultEl.textContent = resultText(result);
  resultEl.className = 'result-text ' + result;

  // Update history display
  updateHistoryDisplay();

  state = 'result';
  showScreen('result');

  // Pre-fetch next LLM response in background
  queryLLM(buildPrompt()).then(hand => {
    llmHand = hand;
    state = 'choosing'; // ready for next round
  });
}

function updateHistoryDisplay() {
  const container = document.getElementById('history');
  if (history.length === 0) {
    container.innerHTML = '';
    return;
  }
  const items = history.map((h, i) => {
    const rText = resultText(h.result).replace(/[🎉💪🤝]/g, '').trim();
    return `<li>Round ${i + 1}: LLM=${HAND_NAMES[h.llm]} vs あなた=${HAND_NAMES[h.player]} → ${rText}</li>`;
  }).join('');
  container.innerHTML = `<h3>対戦履歴</h3><ul class="history-list">${items}</ul>`;
}

function retryGame() {
  if (state === 'choosing' && llmHand) {
    // LLM already responded, skip to choice screen
    state = 'choosing';
    showScreen('choice');
    return;
  }

  // Need fresh LLM response
  state = 'waiting_llm';
  showScreen('thinking');

  queryLLM(buildPrompt()).then(hand => {
    llmHand = hand;
    state = 'choosing';
    showScreen('choice');
  });
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('retry-btn').addEventListener('click', retryGame);

document.querySelectorAll('.hand-buttons button').forEach(btn => {
  btn.addEventListener('click', () => onPlayerChoose(btn.dataset.hand));
});
