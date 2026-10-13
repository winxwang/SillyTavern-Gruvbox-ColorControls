const MODULE_NAME = 'gruvbox_color_controls';
const DEFAULTS = Object.freeze({
  mainText: '#d4be98', userText: '#d4be98', botText: '#d4be98', speechText: '#f2e5bc',
  userColor: '#69a54b', userAlpha: 24, botColor: '#69a54b', botAlpha: 24,
  pageColor: '#000000', pageAlpha: 0, chatColor: '#000000', chatAlpha: 0,
  chatButtonBgColor: '#282828', chatButtonBgAlpha: 88, chatButtonTextColor: '#d4be98', chatButtonHoverColor: '#69a54b', chatButtonBorderColor: '#665c54',
  backgroundEnabled: false, backgroundAutoSwitch: false, backgroundInterval: 5, backgroundIndex: 0, backgroundImages: [],
});
const PALETTE = [
  ['Gruvbox 米白', '#D4BE98'], ['奶油白', '#F2E5BC'], ['纯白', '#FFFFFF'], ['浅灰', '#C6C6C6'],
  ['草绿', '#69A54B'], ['浅草绿', '#A9D18E'], ['薄荷绿', '#8ECFA3'], ['深绿', '#315C3A'],
  ['青色', '#65C3C8'], ['天蓝', '#75BDEB'], ['蓝色', '#4F86C6'], ['深蓝', '#263B5B'],
  ['淡紫', '#C7A6E8'], ['紫色', '#9B72CF'], ['粉色', '#E6A1B4'], ['玫红', '#D16D8A'],
  ['橙色', '#E39B54'], ['金黄', '#E5C07B'], ['砖红', '#CC6666'], ['深红', '#7A3030'],
  ['深灰', '#3C3836'], ['石墨黑', '#282828'], ['黑色', '#000000'], ['透明底色用黑', '#000000'],
];

function normalizeHex(value) {
  let s = String(value ?? '').trim();
  if (!s.startsWith('#')) s = `#${s}`;
  if (/^#[0-9a-f]{3}$/i.test(s)) s = '#' + [...s.slice(1)].map(c => c + c).join('');
  return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null;
}
function hexToRgb(hex) {
  const clean = (normalizeHex(hex) || '#000000').slice(1);
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Number(v) || 0)).toString(16).padStart(2, '0')).join('');
}
function rgba(color, alpha) {
  const { r, g, b } = hexToRgb(color);
  const a = Math.min(100, Math.max(0, Number(alpha) || 0)) / 100;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}
function getSettings() {
  const ctx = SillyTavern.getContext();
  if (!ctx.extensionSettings[MODULE_NAME]) ctx.extensionSettings[MODULE_NAME] = { ...DEFAULTS, backgroundImages: [] };
  const settings = ctx.extensionSettings[MODULE_NAME];
  if (!Array.isArray(settings.backgroundImages) || settings.backgroundImages === DEFAULTS.backgroundImages) settings.backgroundImages = [];
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (settings[key] === undefined) settings[key] = value;
    if (key.toLowerCase().includes('color') || ['mainText', 'userText', 'botText', 'speechText'].includes(key)) {
      settings[key] = normalizeHex(settings[key]) || value;
    }
  }
  return settings;
}
function applySettings(settings = getSettings()) {
  const root = document.documentElement;
  root.style.setProperty('--gm-main-text', settings.mainText);
  root.style.setProperty('--gm-user-text', settings.userText);
  root.style.setProperty('--gm-bot-text', settings.botText);
  root.style.setProperty('--gm-speech-text', settings.speechText);
  root.style.setProperty('--gm-user-bg', rgba(settings.userColor, settings.userAlpha));
  root.style.setProperty('--gm-bot-bg', rgba(settings.botColor, settings.botAlpha));
  root.style.setProperty('--gm-page-bg', rgba(settings.pageColor, settings.pageAlpha));
  root.style.setProperty('--gm-chat-bg', rgba(settings.chatColor, settings.chatAlpha));
  root.style.setProperty('--gmcc-chat-button-bg', rgba(settings.chatButtonBgColor, settings.chatButtonBgAlpha));
  root.style.setProperty('--gmcc-chat-button-text', settings.chatButtonTextColor);
  root.style.setProperty('--gmcc-chat-button-hover', settings.chatButtonHoverColor);
  root.style.setProperty('--gmcc-chat-button-border', settings.chatButtonBorderColor);
  const preview = document.querySelector('#gm-color-controls .gmcc-live-button-preview');
  if (preview) {
    preview.style.setProperty('--gmcc-preview-bg', rgba(settings.chatButtonBgColor, settings.chatButtonBgAlpha));
    preview.style.setProperty('--gmcc-preview-text', settings.chatButtonTextColor);
    preview.style.setProperty('--gmcc-preview-hover', settings.chatButtonHoverColor);
    preview.style.setProperty('--gmcc-preview-border', settings.chatButtonBorderColor);
  }
  document.querySelectorAll('#gm-color-controls .gmcc-live-button-preview').forEach(button => {
    button.style.setProperty('--gmcc-preview-bg', rgba(settings.chatButtonBgColor, settings.chatButtonBgAlpha));
    button.style.setProperty('--gmcc-preview-text', settings.chatButtonTextColor);
    button.style.setProperty('--gmcc-preview-hover', settings.chatButtonHoverColor);
    button.style.setProperty('--gmcc-preview-border', settings.chatButtonBorderColor);
  });
}
function setColor(settings, key, color) {
  const normalized = normalizeHex(color);
  if (!normalized) return false;
  settings[key] = normalized;
  return true;
}
function updateColorControls($root, key, color) {
  const rgb = hexToRgb(color);
  $root.find(`[data-key="${key}"]`).val(color);
  $root.find(`[data-hex-for="${key}"]`).val(color.toUpperCase()).removeClass('gmcc-invalid');
  $root.find(`[data-rgb-for="${key}"] [data-channel="r"]`).val(rgb.r);
  $root.find(`[data-rgb-for="${key}"] [data-channel="g"]`).val(rgb.g);
  $root.find(`[data-rgb-for="${key}"] [data-channel="b"]`).val(rgb.b);
  $root.find(`[data-color-control="${key}"]`).css('--gmcc-current-color', color);
}
function renderPalette($root, key, containerSelector) {
  const $container = $root.find(containerSelector);
  if (!$container.length) return;
  $container.empty();
  for (const [name, color] of PALETTE) {
    const $button = $('<button type="button" class="gmcc-swatch"></button>')
      .attr('title', `${name} ${color}`).attr('aria-label', `${name} ${color}`)
      .attr('data-apply-color', color).attr('data-target-key', key).css('background-color', color);
    $container.append($button);
  }
}
function syncControls($root, settings) {
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[key] === 'string' && key.toLowerCase().includes('color') || ['mainText', 'userText', 'botText', 'speechText'].includes(key)) {
      updateColorControls($root, key, settings[key]);
      renderPalette($root, key, `[data-swatches-for="${key}"]`);
    }
  }
  for (const key of ['userAlpha', 'botAlpha', 'pageAlpha', 'chatAlpha', 'chatButtonBgAlpha']) {
    $root.find(`[data-key="${key}"]`).val(settings[key]);
    $root.find(`[data-output="${key}"]`).text(`${settings[key]}%`);
  }
  renderPalette($root, null, '#gmcc-global-palette');
}
// 给常见引号中的人物对白添加独立颜色，不改写原始消息文本。
function colorQuotedSpeech() {
  const chat = document.querySelector('#chat');
  if (!chat) return;
  const quotePattern = /“[^”\n]+”|「[^」\n]+」|『[^』\n]+』|‘[^’\n]+’/g;
  const walker = document.createTreeWalker(chat, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest('.gmcc-spoken-dialogue, script, style, textarea, pre, code, button, a')) return NodeFilter.FILTER_REJECT;
      if (!parent.closest('#chat .mes_text')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const value = node.nodeValue;
    quotePattern.lastIndex = 0;
    if (!quotePattern.test(value)) continue;
    quotePattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let last = 0;
    for (const match of value.matchAll(quotePattern)) {
      if (match.index > last) fragment.append(document.createTextNode(value.slice(last, match.index)));
      const span = document.createElement('span');
      span.className = 'gmcc-spoken-dialogue';
      span.textContent = match[0];
      fragment.append(span);
      last = match.index + match[0].length;
    }
    if (last < value.length) fragment.append(document.createTextNode(value.slice(last)));
    node.replaceWith(fragment);
  }
}
function observeChatForDialogue() {
  const chat = document.querySelector('#chat');
  if (!chat || chat.dataset.gmccDialogueObserver === '1') return;
  chat.dataset.gmccDialogueObserver = '1';
  colorQuotedSpeech();
  const observer = new MutationObserver(() => colorQuotedSpeech());
  observer.observe(chat, { childList: true, subtree: true });
}
const BACKGROUND_STYLE_PROPS = ['backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundAttachment'];
let backgroundOriginalStyles = new WeakMap();
let backgroundTimer = null;
function backgroundTarget() {
  return document.querySelector('#bg1') || document.body;
}
function rememberBackgroundStyle(target) {
  if (!target || backgroundOriginalStyles.has(target)) return;
  const snapshot = {};
  for (const prop of BACKGROUND_STYLE_PROPS) snapshot[prop] = target.style[prop];
  backgroundOriginalStyles.set(target, snapshot);
}
function restoreBackgroundStyle(target) {
  if (!target) return;
  const snapshot = backgroundOriginalStyles.get(target);
  if (!snapshot) return;
  for (const prop of BACKGROUND_STYLE_PROPS) target.style[prop] = snapshot[prop] || '';
}
function applyBackgroundImage(settings) {
  const target = backgroundTarget();
  if (!target) return;
  rememberBackgroundStyle(target);
  if (!settings.backgroundEnabled || !settings.backgroundImages.length) {
    restoreBackgroundStyle(target);
    return;
  }
  const maxIndex = settings.backgroundImages.length - 1;
  settings.backgroundIndex = Math.max(0, Math.min(maxIndex, Number(settings.backgroundIndex) || 0));
  const item = settings.backgroundImages[settings.backgroundIndex];
  if (!item?.dataUrl) return;
  target.style.backgroundImage = `url("${item.dataUrl}")`;
  target.style.backgroundSize = 'cover';
  target.style.backgroundPosition = 'center center';
  target.style.backgroundRepeat = 'no-repeat';
  target.style.backgroundAttachment = 'fixed';
}
function stopBackgroundTimer() {
  if (backgroundTimer !== null) window.clearInterval(backgroundTimer);
  backgroundTimer = null;
}
function configureBackgroundTimer(settings, $root, ctx) {
  stopBackgroundTimer();
  if (!settings.backgroundEnabled || !settings.backgroundAutoSwitch || settings.backgroundImages.length < 2) return;
  const minutes = Math.max(1, Math.min(1440, Number(settings.backgroundInterval) || 5));
  backgroundTimer = window.setInterval(() => {
    settings.backgroundIndex = (settings.backgroundIndex + 1) % settings.backgroundImages.length;
    applyBackgroundImage(settings);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  }, minutes * 60 * 1000);
}
function updateBackgroundStatus($root, settings) {
  const total = settings.backgroundImages.length;
  const current = total ? Math.min(total, Math.max(1, settings.backgroundIndex + 1)) : 0;
  $root.find('#gmcc-bg-status').text(total ? `已添加 ${total} 张图片；当前第 ${current} 张：${settings.backgroundImages[settings.backgroundIndex]?.name || '背景图片'}` : '尚未选择背景图片');
  $root.find('#gmcc-bg-auto').prop('checked', !!settings.backgroundAutoSwitch).prop('disabled', !settings.backgroundEnabled || total < 2);
  $root.find('#gmcc-bg-interval').val(settings.backgroundInterval || 5).prop('disabled', !settings.backgroundEnabled || !settings.backgroundAutoSwitch);
  $root.find('#gmcc-bg-feature-toggle').text(settings.backgroundEnabled ? '关闭背景图片功能' : '开启背景图片功能').toggleClass('gmcc-bg-enabled', !!settings.backgroundEnabled);
  $root.find('#gmcc-bg-prev, #gmcc-bg-next').prop('disabled', !total);
  $root.find('#gmcc-bg-clear').prop('disabled', !total);
  const $list = $root.find('#gmcc-bg-list').empty();
  settings.backgroundImages.forEach((item, index) => {
    const $item = $('<div class="gmcc-bg-thumb"></div>');
    const $img = $('<img alt="背景预览">').attr('src', item.dataUrl).attr('title', item.name || `背景 ${index + 1}`);
    const $name = $('<button type="button" class="menu_button gmcc-bg-select"></button>').text(`${index + 1}. ${item.name || '背景图片'}`).attr('data-bg-index', index).toggleClass('gmcc-bg-current', index === settings.backgroundIndex);
    const $remove = $('<button type="button" class="menu_button gmcc-bg-remove" aria-label="移除图片">移除</button>').attr('data-bg-remove', index);
    $item.append($img, $name, $remove);
    $list.append($item);
  });
}
function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error(`${file.name} 不是图片文件`));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`读取失败：${file.name}`));
    reader.onload = () => {
      const source = new Image();
      source.onerror = () => reject(new Error(`无法解析图片：${file.name}`));
      source.onload = () => {
        const maxSide = 1920;
        const scale = Math.min(1, maxSide / Math.max(source.naturalWidth, source.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
        const context = canvas.getContext('2d');
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        // JPEG 压缩显著降低扩展设置体积；透明图片会在此转换为白底 JPEG。
        resolve({ name: file.name, dataUrl: canvas.toDataURL('image/jpeg', 0.82) });
      };
      source.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function init() {
  if (!window.SillyTavern?.getContext || !window.jQuery) return;
  const ctx = SillyTavern.getContext();
  const settings = getSettings();
  applySettings(settings);
  observeChatForDialogue();
  let markup;
  try {
    markup = await ctx.renderExtensionTemplateAsync('third-party/SillyTavern-Gruvbox-ColorControls', 'settings');
    if (!document.querySelector('#gm-color-controls')) $('#extensions_settings2').append(markup);
  } catch (err) {
    console.error('[GruvboxColorControls] Could not render settings panel:', err);
    return;
  }
  const $root = $('#gm-color-controls');
  syncControls($root, settings);
  if (!Array.isArray(settings.backgroundImages)) settings.backgroundImages = [];
  if (settings.backgroundInterval === undefined) settings.backgroundInterval = 5;
  applyBackgroundImage(settings);
  updateBackgroundStatus($root, settings);
  configureBackgroundTimer(settings, $root, ctx);
  let activeColorKey = 'speechText';
  $root.off('.gmcc');

  $root.on('focusin.gmcc click.gmcc', '[data-key], [data-hex-for], [data-rgb-key]', function () {
    activeColorKey = this.dataset.key || this.dataset.hexFor || this.dataset.rgbKey || activeColorKey;
  });
  $root.on('input.gmcc change.gmcc', 'input[data-key]', function () {
    const key = this.dataset.key;
    if (this.type === 'color') {
      setColor(settings, key, this.value);
      updateColorControls($root, key, settings[key]);
    } else if (this.type === 'range') {
      settings[key] = Math.max(0, Math.min(100, Number(this.value) || 0));
      $root.find(`[data-output="${key}"]`).text(`${settings[key]}%`);
    }
    applySettings(settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('input.gmcc', 'input[data-hex-for]', function () {
    const key = this.dataset.hexFor;
    const normalized = normalizeHex(this.value);
    if (!normalized) { $(this).addClass('gmcc-invalid'); return; }
    setColor(settings, key, normalized);
    updateColorControls($root, key, normalized);
    activeColorKey = key;
    applySettings(settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('blur.gmcc change.gmcc', 'input[data-hex-for]', function () {
    const key = this.dataset.hexFor;
    if (!normalizeHex(this.value)) updateColorControls($root, key, settings[key]);
  });
  $root.on('input.gmcc change.gmcc', 'input[data-rgb-key]', function () {
    const key = this.dataset.rgbKey;
    const $group = $root.find(`[data-rgb-for="${key}"]`);
    const channelValues = {};
    $group.find('[data-rgb-key]').each(function () {
      const v = Number(this.value);
      channelValues[this.dataset.channel] = Math.max(0, Math.min(255, Number.isFinite(v) ? v : 0));
    });
    const color = rgbToHex(channelValues.r, channelValues.g, channelValues.b);
    setColor(settings, key, color);
    updateColorControls($root, key, color);
    activeColorKey = key;
    applySettings(settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('click.gmcc', '[data-apply-color]', function () {
    const key = this.dataset.targetKey || activeColorKey;
    const color = this.dataset.applyColor;
    if (!setColor(settings, key, color)) return;
    activeColorKey = key;
    updateColorControls($root, key, settings[key]);
    applySettings(settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('click.gmcc', '[data-copy-key]', async function () {
    const key = this.dataset.copyKey;
    try {
      await navigator.clipboard.writeText(settings[key].toUpperCase());
      if (window.toastr) toastr.success(`已复制 ${settings[key].toUpperCase()}`);
    } catch (err) {
      const $input = $root.find(`[data-hex-for="${key}"]`).trigger('focus').trigger('select');
      if (window.toastr) toastr.info('浏览器未允许自动复制，请手动复制已选中的色值');
    }
  });
  $root.on('click.gmcc', '#gmcc-reset', function () {
    Object.assign(settings, { ...DEFAULTS, backgroundImages: [] });
    syncControls($root, settings);
    applySettings(settings);
    applyBackgroundImage(settings);
    configureBackgroundTimer(settings, $root, ctx);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
    if (window.toastr) toastr.success('已恢复 Gruvbox 调色默认值');
  });
  $root.on('click.gmcc', '#gmcc-bg-feature-toggle', function () {
    settings.backgroundEnabled = !settings.backgroundEnabled;
    applyBackgroundImage(settings);
    configureBackgroundTimer(settings, $root, ctx);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('change.gmcc', '#gmcc-bg-files', async function () {
    const files = Array.from(this.files || []);
    if (!files.length) return;
    const $input = $(this);
    $root.find('#gmcc-bg-import-status').text(`正在处理 ${files.length} 张图片…`);
    const imported = [];
    for (const file of files) {
      try { imported.push(await imageFileToDataUrl(file)); }
      catch (err) { console.warn('[GruvboxColorControls] Background image import failed:', err); }
    }
    if (imported.length) {
      settings.backgroundImages.push(...imported);
      if (settings.backgroundImages.length > 30) settings.backgroundImages = settings.backgroundImages.slice(-30);
      settings.backgroundIndex = settings.backgroundImages.length - imported.length;
      // 导入图片后自动开启背景功能，用户也可随时通过开关关闭。
      settings.backgroundEnabled = true;
      applyBackgroundImage(settings);
      configureBackgroundTimer(settings, $root, ctx);
      updateBackgroundStatus($root, settings);
      ctx.saveSettingsDebounced();
      $root.find('#gmcc-bg-import-status').text(`成功添加 ${imported.length} 张图片。图片已压缩后保存到扩展设置。`);
    } else {
      $root.find('#gmcc-bg-import-status').text('没有成功导入图片，请选择 JPG、PNG、WEBP 等图片文件。');
    }
    $input.val('');
  });
  $root.on('change.gmcc', '#gmcc-bg-auto', function () {
    settings.backgroundAutoSwitch = this.checked;
    configureBackgroundTimer(settings, $root, ctx);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('change.gmcc', '#gmcc-bg-interval', function () {
    settings.backgroundInterval = Math.max(1, Math.min(1440, Number(this.value) || 5));
    configureBackgroundTimer(settings, $root, ctx);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('click.gmcc', '#gmcc-bg-prev, #gmcc-bg-next', function () {
    const total = settings.backgroundImages.length;
    if (!total) return;
    settings.backgroundIndex = this.id === 'gmcc-bg-prev'
      ? (settings.backgroundIndex - 1 + total) % total
      : (settings.backgroundIndex + 1) % total;
    applyBackgroundImage(settings);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('click.gmcc', '.gmcc-bg-select', function () {
    settings.backgroundIndex = Number(this.dataset.bgIndex) || 0;
    applyBackgroundImage(settings);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('click.gmcc', '.gmcc-bg-remove', function () {
    const index = Number(this.dataset.bgRemove);
    if (!Number.isInteger(index) || index < 0 || index >= settings.backgroundImages.length) return;
    settings.backgroundImages.splice(index, 1);
    if (settings.backgroundIndex >= settings.backgroundImages.length) settings.backgroundIndex = Math.max(0, settings.backgroundImages.length - 1);
    applyBackgroundImage(settings);
    configureBackgroundTimer(settings, $root, ctx);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  $root.on('click.gmcc', '#gmcc-bg-clear', function () {
    settings.backgroundImages = [];
    settings.backgroundIndex = 0;
    settings.backgroundAutoSwitch = false;
    applyBackgroundImage(settings);
    configureBackgroundTimer(settings, $root, ctx);
    updateBackgroundStatus($root, settings);
    ctx.saveSettingsDebounced();
  });
  observeChatForDialogue();
  console.log('[GruvboxColorControls] Precision color panel with background rotation ready');
}
if (window.jQuery) jQuery(init);
