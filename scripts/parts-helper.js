// scripts/parts-helper.js

import { parsePartsList } from './utils.js';

/**
 * @typedef {Object} PartGroup
 * @property {number} length - 部材の長さ (mm)
 * @property {number} count - 部材の本数
 */

/**
 * 部材リストの文字列（カンマ/改行区切り）をパースし、長さごとのグループ（出現順維持）に集約する
 * @param {string} text
 * @returns {PartGroup[]}
 */
export function parseTextToPartGroups(text) {
  const parts = parsePartsList(text);
  if (!parts || parts.length === 0) return [];

  const groupsMap = new Map();
  for (const len of parts) {
    if (len <= 0 || isNaN(len)) continue;
    // 丸め誤差を考慮してキーをフォーマット（例: 320, 450.5）
    const key = Number(len.toFixed(2));
    if (groupsMap.has(key)) {
      groupsMap.set(key, groupsMap.get(key) + 1);
    } else {
      groupsMap.set(key, 1);
    }
  }

  const result = [];
  for (const [length, count] of groupsMap.entries()) {
    result.push({ length, count });
  }
  return result;
}

/**
 * 部材グループの配列をカンマ区切りの文字列に変換する
 * @param {PartGroup[]} groups
 * @returns {string}
 */
export function partGroupsToText(groups) {
  const parts = [];
  for (const group of groups) {
    for (let i = 0; i < group.count; i++) {
      parts.push(group.length);
    }
  }
  return parts.join(', ');
}

/**
 * 部材グループに新しい部材を追加または本数を加算する
 * @param {PartGroup[]} groups
 * @param {number} length
 * @param {number} count
 * @returns {PartGroup[]}
 */
export function addPartToGroups(groups, length, count = 1) {
  const roundedLen = Number(length.toFixed(2));
  const newGroups = groups.map(g => ({ ...g }));
  const existing = newGroups.find(g => g.length === roundedLen);
  if (existing) {
    existing.count += count;
  } else {
    newGroups.push({ length: roundedLen, count });
  }
  return newGroups;
}

/**
 * 部材グループの特定長さの本数を変更（delta: +1 or -1）
 * @param {PartGroup[]} groups
 * @param {number} length
 * @param {number} delta
 * @returns {PartGroup[]}
 */
export function updatePartCountInGroups(groups, length, delta) {
  const roundedLen = Number(length.toFixed(2));
  return groups
    .map(g => {
      if (g.length === roundedLen) {
        return { ...g, count: g.count + delta };
      }
      return { ...g };
    })
    .filter(g => g.count > 0);
}

/**
 * 部材グループから特定の長さを全削除する
 * @param {PartGroup[]} groups
 * @param {number} length
 * @returns {PartGroup[]}
 */
export function removePartFromGroups(groups, length) {
  const roundedLen = Number(length.toFixed(2));
  return groups.filter(g => g.length !== roundedLen);
}

/**
 * 部材入力サポートUIを初期化し、textareaと双方向同期する
 * @param {HTMLTextAreaElement} textarea
 * @param {HTMLElement} container
 */
export function initPartsHelper(textarea, container) {
  if (!textarea || !container) return;

  // UI要素の構築
  container.innerHTML = `
    <div class="parts-helper-card">
      <div class="helper-quick-add">
        <div class="quick-add-inputs">
          <div class="field-item">
            <label for="quickPartLength">長さ</label>
            <div class="unit-input-wrapper">
              <input type="number" id="quickPartLength" placeholder="例: 450" min="1" step="any">
              <span class="unit-suffix">mm</span>
            </div>
          </div>
          <div class="field-item">
            <label for="quickPartCount">本数</label>
            <div class="stepper-wrapper">
              <button type="button" id="quickCountMinus" class="btn-step" title="1本減らす">-</button>
              <input type="number" id="quickPartCount" value="1" min="1" max="999" step="1">
              <button type="button" id="quickCountPlus" class="btn-step" title="1本増やす">+</button>
            </div>
          </div>
          <button type="button" id="quickAddBtn" class="btn-quick-add">
            <span>＋</span> リストに追加
          </button>
        </div>

        <div class="helper-presets">
          <span class="presets-label">定番寸法:</span>
          <button type="button" class="preset-btn" data-len="300">300mm</button>
          <button type="button" class="preset-btn" data-len="450">450mm</button>
          <button type="button" class="preset-btn" data-len="600">600mm</button>
          <button type="button" class="preset-btn" data-len="900">900mm</button>
          <button type="button" class="preset-btn" data-len="1000">1000mm</button>
          <button type="button" class="preset-btn" data-len="1200">1200mm</button>
        </div>
      </div>

      <div class="helper-chips-section">
        <div class="helper-chips-header">
          <div class="chips-title">
            <span role="img" aria-label="list">📋</span> 登録中の部材
            <span id="helperStatsBadge" class="helper-stats-badge">0本 (0 mm)</span>
          </div>
          <button type="button" id="helperClearAllBtn" class="btn-clear-all" title="すべての部材をクリア">
            全クリア
          </button>
        </div>
        <div id="helperChipsList" class="helper-chips-list">
          <span class="chips-empty-msg">部材がまだ登録されていません。上のフォームから追加してください。</span>
        </div>
      </div>

      <div class="helper-footer-toggle">
        <button type="button" id="toggleRawTextareaBtn" class="btn-toggle-raw" aria-expanded="false">
          <span class="toggle-icon">▼</span> カンマ区切りテキストを直接編集
        </button>
      </div>
    </div>
  `;

  // 要素取得
  const quickLengthInput = container.querySelector('#quickPartLength');
  const quickCountInput = container.querySelector('#quickPartCount');
  const quickCountMinus = container.querySelector('#quickCountMinus');
  const quickCountPlus = container.querySelector('#quickCountPlus');
  const quickAddBtn = container.querySelector('#quickAddBtn');
  const helperChipsList = container.querySelector('#helperChipsList');
  const helperStatsBadge = container.querySelector('#helperStatsBadge');
  const helperClearAllBtn = container.querySelector('#helperClearAllBtn');
  const presetBtns = container.querySelectorAll('.preset-btn');
  const toggleRawTextareaBtn = container.querySelector('#toggleRawTextareaBtn');

  // textareaの初期表示制御（最初は折りたたむか、あるいは開いたまま選べる）
  // 親の input-group を探し、textareaをサポートUIと調和させる
  const inputGroup = textarea.closest('.input-group');
  if (inputGroup) {
    textarea.classList.add('parts-raw-textarea');
    // デフォルトで折りたたみ状態にする（トグルで開閉可能）
    textarea.style.display = 'none';
  }

  toggleRawTextareaBtn.addEventListener('click', () => {
    const isHidden = textarea.style.display === 'none';
    textarea.style.display = isHidden ? 'block' : 'none';
    toggleRawTextareaBtn.setAttribute('aria-expanded', String(isHidden));
    const icon = toggleRawTextareaBtn.querySelector('.toggle-icon');
    if (icon) {
      icon.textContent = isHidden ? '▲' : '▼';
    }
  });

  // チップ描画処理
  function renderChips() {
    const groups = parseTextToPartGroups(textarea.value);
    
    // 統計の計算
    let totalCount = 0;
    let totalLength = 0;
    for (const g of groups) {
      totalCount += g.count;
      totalLength += g.length * g.count;
    }

    if (totalCount === 0) {
      helperStatsBadge.textContent = '0本 (0 mm)';
      helperChipsList.innerHTML = '<span class="chips-empty-msg">部材がまだ登録されていません。上のフォームから追加してください。</span>';
      return;
    }

    helperStatsBadge.textContent = `計 ${totalCount}本 (${totalLength.toLocaleString()} mm)`;
    helperChipsList.innerHTML = '';

    for (const group of groups) {
      const chip = document.createElement('div');
      chip.className = 'part-chip';
      chip.dataset.length = group.length;

      chip.innerHTML = `
        <span class="chip-length"><strong>${group.length}</strong> mm</span>
        <span class="chip-multiply">×</span>
        <div class="chip-stepper">
          <button type="button" class="btn-chip-step btn-chip-minus" title="1本減らす" aria-label="1本減らす">-</button>
          <span class="chip-count">${group.count}</span>
          <button type="button" class="btn-chip-step btn-chip-plus" title="1本増やす" aria-label="1本増やす">+</button>
        </div>
        <button type="button" class="btn-chip-remove" title="この部材を削除" aria-label="削除">×</button>
      `;

      // チップ内のイベント
      chip.querySelector('.btn-chip-plus').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentGroups = parseTextToPartGroups(textarea.value);
        const updated = updatePartCountInGroups(currentGroups, group.length, 1);
        updateTextarea(partGroupsToText(updated));
      });

      chip.querySelector('.btn-chip-minus').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentGroups = parseTextToPartGroups(textarea.value);
        const updated = updatePartCountInGroups(currentGroups, group.length, -1);
        updateTextarea(partGroupsToText(updated));
      });

      chip.querySelector('.btn-chip-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        const currentGroups = parseTextToPartGroups(textarea.value);
        const updated = removePartFromGroups(currentGroups, group.length);
        updateTextarea(partGroupsToText(updated));
      });

      helperChipsList.appendChild(chip);
    }
  }

  // textarea更新処理
  function updateTextarea(newText) {
    textarea.value = newText;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    renderChips();
  }

  // クイック追加アクション
  function handleQuickAdd() {
    const len = parseFloat(quickLengthInput.value);
    const count = parseInt(quickCountInput.value, 10) || 1;

    if (isNaN(len) || len <= 0) {
      quickLengthInput.focus();
      quickLengthInput.classList.add('input-error-shake');
      setTimeout(() => quickLengthInput.classList.remove('input-error-shake'), 400);
      return;
    }

    if (count <= 0) return;

    const currentGroups = parseTextToPartGroups(textarea.value);
    const updated = addPartToGroups(currentGroups, len, count);
    updateTextarea(partGroupsToText(updated));

    // 追加後は長さをクリアし、本数を1に戻す（連続入力しやすいようフォーカス）
    quickLengthInput.value = '';
    quickCountInput.value = '1';
    quickLengthInput.focus();
  }

  // イベントリスナー設定
  quickAddBtn.addEventListener('click', handleQuickAdd);

  quickLengthInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  });

  quickCountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  });

  // クイック本数ステッパー
  quickCountMinus.addEventListener('click', () => {
    const val = parseInt(quickCountInput.value, 10) || 1;
    if (val > 1) {
      quickCountInput.value = String(val - 1);
    }
  });

  quickCountPlus.addEventListener('click', () => {
    const val = parseInt(quickCountInput.value, 10) || 1;
    quickCountInput.value = String(val + 1);
  });

  // 定番寸法プリセットボタン
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const len = btn.dataset.len;
      quickLengthInput.value = len;
      quickLengthInput.focus();
    });
  });

  // 全クリア
  helperClearAllBtn.addEventListener('click', () => {
    if (textarea.value.trim() === '') return;
    if (confirm('登録中の部材をすべてクリアしますか？')) {
      updateTextarea('');
    }
  });

  // textareaの手動変更をチップに反映
  textarea.addEventListener('input', () => {
    renderChips();
  });

  // 初回描画
  renderChips();

  return {
    render: renderChips
  };
}
