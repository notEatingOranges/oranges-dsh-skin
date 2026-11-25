/**
 * Browser half of the oranges-dsh-skin bundle.
 *
 * Two additive seats: a button at the sidebar foot (`sidebar.footer.action`) and one
 * frame-wide dialog (`shell.overlay`). The wallpaper is painted by a plugin-owned
 * stylesheet plus scoped surface-token overrides, so unloading the bundle removes
 * every trace of it.
 */
window.__ModuleLoader__.load({
  id: 'oranges-dsh-skin',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useRef, useState } = React

    const NS = 'oranges-dsh-skin'
    const STYLE_ID = 'oranges-dsh-skin.styles'
    const DB_NAME = 'oranges-dsh-skin'
    const PREFS_KEY = 'oranges-dsh-skin.prefs'
    const MAX_BYTES = 40 * 1024 * 1024
    const MAX_EDGE = 2560
    /** Surfaces the skin rewrites, in tiers that carry different budgets. */
    const SURFACE_TIERS = {
      /** Page background and the left column. */
      page: [
        '--dsw-alias-bg-base',
        '--dsw-specific-sidebar-fill',
      ],
      /** The composer holds text and a caret, so it keeps a firmer surface. */
      composer: [
        '--dsw-specific-input-major',
      ],
      /** Cards, panels, diff surfaces and plugin windows: a hint only. */
      card: [
        '--dsw-alias-bg-layer-1',
        '--dsw-alias-bg-layer-2',
        '--dsw-alias-bg-layer-3',
      ],
    }
    const ALL_SURFACE_TOKENS = [
      ...SURFACE_TIERS.page,
      ...SURFACE_TIERS.composer,
      ...SURFACE_TIERS.card,
    ]
    /**
     * Transparent mode caps: how much of a surface the slider may ever remove.
     * Cards and the composer are capped hard, because that is where text lives.
     */
    const TIER_CAPS = { page: 55, composer: 30, card: 12 }
    /**
     * Blend mode shares: how much of the wallpaper's own colour a surface takes.
     * Surfaces stay opaque, so nothing shows through and text keeps its contrast.
     */
    const TIER_BLEND = { page: 0.34, composer: 0.22, card: 0.17 }
    /** Cap on how much of a surface the transparency slider may remove. */
    const SURFACE_FLOOR = 0.85
    /**
     * Motion behind translucent surfaces is what makes text hard to read, so the
     * wallpaper blurs itself as the slider rises.
     */
    const AUTO_BLUR_PER_STEP = 5
    const DEFAULT_PREFS = {
      imageOpacity: 60,
      surfaceMode: 'blend',
      surfaceTransparency: 60,
      tintStrength: 4,
      blur: 0,
      dim: 0,
    }

    const CSS = [
      'html.odsk-on body::before{content:"";position:fixed;inset:-16px;z-index:-1;pointer-events:none;',
      'background-image:linear-gradient(rgba(0,0,0,var(--odsk-dim,0)),rgba(0,0,0,var(--odsk-dim,0))),var(--odsk-wallpaper,none);',
      'background-position:center;background-size:cover;background-repeat:no-repeat;',
      'opacity:var(--odsk-opacity,1);filter:blur(var(--odsk-blur,0px));}',
      '.odsk-tint{position:fixed;inset:0;z-index:1100;pointer-events:none;}',
      'html.odsk-on [role="dialog"]:not(.odsk-dialog), html.odsk-on [aria-modal="true"]:not(.odsk-backdrop){',
      'background-color:color-mix(in srgb,var(--odsk-base,#ffffff) 96%,transparent)!important;',
      'backdrop-filter:blur(20px);}',
      '.odsk-layer{position:relative;display:flex;align-items:center;width:100%;height:42px;margin:8px 0 0;}',
      '.odsk-footer{display:flex;align-items:center;width:100%;}',
      '.odsk-trigger{display:inline-flex;align-items:center;gap:8px;width:calc(100% + 4px);height:42px;margin:0 -2px;',
      'padding:0 10px 0 8px;border:none;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);',
      'font-family:inherit;font-size:14px;line-height:20px;cursor:pointer;overflow:hidden;}',
      '.odsk-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);}',
      '.odsk-trigger[data-active]{background:var(--dsw-alias-interactive-bg-hover);}',
      '.odsk-trigger-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.odsk-layer.odsk-rail{width:36px;height:36px;margin:0;}',
      '.odsk-rail .odsk-trigger{justify-content:center;gap:0;width:36px;height:36px;padding:0;border-radius:50%;corner-shape:round;}',
      '.odsk-backdrop{position:fixed;top:var(--dsh-frame-chrome-top,0px);right:0;bottom:0;left:0;z-index:1200;',      'display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,0.45);}',
      '.odsk-dialog{position:relative;display:flex;flex-direction:column;width:100%;max-width:560px;',
      'max-height:min(720px,calc(100vh - 96px));border-radius:16px;overflow:hidden;',
      'background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1));backdrop-filter:var(--dsw-menu-backdrop-filter,none);',
      'box-shadow:var(--dsw-elevation-prominent,0 12px 40px rgba(0,0,0,0.28));color:var(--dsw-alias-label-primary);}',
      '.odsk-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 12px;}',
      '.odsk-title{margin:0;font-size:15px;font-weight:500;line-height:22px;}',
      '.odsk-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;',
      'border:none;border-radius:999px;corner-shape:round;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer;}',
      '.odsk-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);}',
      '.odsk-body{display:flex;flex-direction:column;gap:16px;padding:0 20px 18px;overflow-y:auto;}',
      '.odsk-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;min-height:168px;',
      'padding:0;border:1px dashed var(--dsw-alias-border-l3,rgba(127,127,127,0.4));border-radius:12px;',
      'background:var(--dsw-alias-bg-layer-2,transparent);color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;overflow:hidden;}',
      '.odsk-drop[data-dragging]{border-color:var(--dsw-alias-state-business-primary,#4176e6);background:var(--dsw-alias-interactive-bg-hover);}',
      '.odsk-drop img{display:block;width:100%;height:168px;object-fit:cover;}',
      '.odsk-drop-hint{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);}',
      '.odsk-drop-sub{font-size:12px;line-height:18px;color:var(--dsw-alias-label-caption);}',
      '.odsk-field{display:grid;grid-template-columns:1fr auto;row-gap:6px;column-gap:12px;align-items:center;}',
      '.odsk-modes{display:flex;gap:6px;padding:2px;border:0.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,0.4));border-radius:9px;}',
      '.odsk-mode{flex:1;height:28px;border:none;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);',
      'font:inherit;font-size:12px;line-height:18px;cursor:pointer;}',
      '.odsk-mode[aria-pressed="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);}',
      '.odsk-mode-hint{margin-top:-8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-caption);}',
      '.odsk-field-label{font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary);}',
      '.odsk-field-value{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;}',
      '.odsk-field input{grid-column:1 / -1;width:100%;margin:0;accent-color:var(--dsw-alias-state-business-primary,#4176e6);}',
      '.odsk-error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);}',
      '.odsk-foot{display:flex;align-items:center;gap:8px;padding:12px 20px 16px;}',
      '.odsk-btn{height:32px;padding:0 14px;border:0.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,0.4));border-radius:8px;',
      'background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;}',
      '.odsk-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);}',
      '.odsk-btn:disabled{opacity:0.45;cursor:default;}',
      '.odsk-btn-primary{border-color:transparent;background:var(--dsw-alias-state-business-primary,#4176e6);',
      'color:var(--dsw-alias-label-on-color,#ffffff);}',
      '.odsk-spacer{flex:1;}',
      '.odsk-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}',
    ].join('\n')

    const EN = {
      open: 'Skin',
      'dialog.title': 'Appearance skin',
      'drop.empty': 'Drop an image here',
      'drop.replace': 'Drop or click to replace the image',
      'drop.sub': 'or click to choose a file, or paste from the clipboard',
      'field.wallpaper': 'Wallpaper opacity',
      'field.surface': 'Interface transparency',
      'field.blend': 'Skin strength',
      'field.mode': 'Surface treatment',
      'mode.blend': 'Blend',
      'mode.transparent': 'Show through',
      'mode.blendHint': 'Surfaces stay solid and take the wallpaper colour, so text and dialogs keep full contrast.',
      'mode.transparentHint': 'Surfaces turn see-through; the wallpaper blurs as the slider rises so text stays readable.',
      'field.tint': 'Overall tint',
      'field.blur': 'Wallpaper blur',
      'field.dim': 'Wallpaper dimming',
      'value.percent': '{value}%',
      'action.apply': 'Apply',
      'action.cancel': 'Cancel',
      'action.reset': 'Reset',
      'action.close': 'Close',
      'error.notImage': 'Only image files can be used as a skin.',
      'error.tooLarge': 'That image is larger than 40 MB.',
      'error.decode': 'That image could not be read.',
      'error.store': 'This browser refused to store the image.',
      'a11y.preview': 'Skin preview',
    }
    const ZH = {
      open: '皮肤',
      'dialog.title': '外观皮肤',
      'drop.empty': '把图片拖到这里',
      'drop.replace': '拖动或点击更换图片',
      'drop.sub': '也可以点击选择文件，或直接粘贴剪贴板里的图片',
      'field.wallpaper': '壁纸不透明度',
      'field.surface': '界面透明度',
      'field.blend': '皮肤强度',
      'field.mode': '表面处理',
      'mode.blend': '融合',
      'mode.transparent': '透出',
      'mode.blendHint': '表面保持实心，只吃进壁纸的颜色；弹窗和文字的对比度不受影响。',
      'mode.transparentHint': '表面变半透明；滑块越高，壁纸自动越模糊，保证文字可读。',
      'field.tint': '整体色调强度',
      'field.blur': '壁纸模糊',
      'field.dim': '壁纸压暗',
      'value.percent': '{value}%',
      'action.apply': '应用',
      'action.cancel': '取消',
      'action.reset': '重置',
      'action.close': '关闭',
      'error.notImage': '只能使用图片文件作为皮肤。',
      'error.tooLarge': '图片超过 40 MB。',
      'error.decode': '无法读取这张图片。',
      'error.store': '此浏览器拒绝保存图片。',
      'a11y.preview': '皮肤预览',
    }

    // ---------------------------------------------------------------- state

    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        getSnapshot: () => state,
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        set(next) {
          const value = typeof next === 'function' ? next(state) : next
          if (value === state) return
          state = value
          for (const listener of [...listeners]) listener()
        },
      }
    }

    const emptyApplied = () => ({ url: null, blob: null, tint: null, ...DEFAULT_PREFS })

    const store = createStore({ open: false, applied: emptyApplied(), preview: null })

    // ------------------------------------------------------------- painting

    function createPainter() {
      const root = document.documentElement
      const body = document.body
      const bases = new Map()
      const overridden = new Map()
      let disposed = false

      function capture() {
        const computed = getComputedStyle(body)
        const rootComputed = getComputedStyle(root)
        for (const token of ALL_SURFACE_TOKENS) {
          let raw = computed.getPropertyValue(token).trim()
          if (raw === '') raw = rootComputed.getPropertyValue(token).trim()
          if (raw !== '') bases.set(token, raw)
          else if (token === '--dsw-alias-bg-base' && computed.backgroundColor !== '') {
            bases.set(token, computed.backgroundColor)
          }
        }
      }

      function releaseSurfaces() {
        for (const [token, saved] of overridden) {
          if (saved.value === '') body.style.removeProperty(token)
          else body.style.setProperty(token, saved.value, saved.priority)
        }
        overridden.clear()
      }

      function applyToken(token, value) {
        if (!overridden.has(token)) {
          overridden.set(token, {
            value: body.style.getPropertyValue(token),
            priority: body.style.getPropertyPriority(token),
          })
        }
        body.style.setProperty(token, value, 'important')
      }

      function paintSurfaces(view) {
        const strength = view.surfaceTransparency
        if (strength <= 0) { releaseSurfaces(); return }
        const tint = view.tint
        for (const [tier, tokens] of Object.entries(SURFACE_TIERS)) {
          if (view.surfaceMode === 'blend' && tint !== null && tint !== undefined) {
            // Opaque surface that has taken on the wallpaper's colour: nothing bleeds through.
            const share = Math.round(strength * TIER_BLEND[tier])
            if (share <= 0) continue
            const colour = `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`
            for (const token of tokens) {
              const base = bases.get(token)
              if (base === undefined) continue
              applyToken(token, `color-mix(in srgb, ${colour} ${share}%, ${base})`)
            }
            continue
          }
          const capped = Math.min(strength, TIER_CAPS[tier])
          const mix = Math.round(100 - capped * SURFACE_FLOOR)
          for (const token of tokens) {
            const base = bases.get(token)
            if (base === undefined) continue
            applyToken(token, `color-mix(in srgb, ${base} ${mix}%, transparent)`)
          }
        }
      }

      function clearAll() {
        releaseSurfaces()
        root.classList.remove('odsk-on')
        for (const name of ['--odsk-wallpaper', '--odsk-opacity', '--odsk-blur', '--odsk-dim', '--odsk-base']) {
          root.style.removeProperty(name)
        }
      }

      function paint() {
        if (disposed) return
        const { applied, preview } = store.getSnapshot()
        const view = preview ?? applied
        if (view.url === null || view.url === undefined) { clearAll(); return }
        capture()
        root.style.setProperty('--odsk-wallpaper', `url("${view.url}")`)
        root.style.setProperty('--odsk-opacity', String(view.imageOpacity / 100))
        // Transparency without blur lets the wallpaper's detail fight the interface text.
        const autoBlur = view.surfaceMode === 'transparent'
          ? Math.round(view.surfaceTransparency / AUTO_BLUR_PER_STEP)
          : 0
        root.style.setProperty('--odsk-blur', `${Math.max(view.blur, autoBlur)}px`)
        root.style.setProperty('--odsk-dim', String(view.dim / 100))
        const baseColour = bases.get('--dsw-alias-bg-base')
        if (baseColour !== undefined) root.style.setProperty('--odsk-base', baseColour)
        root.classList.add('odsk-on')
        paintSurfaces(view)
      }

      function dispose() {
        disposed = true
        clearAll()
      }

      return { paint, dispose }
    }

    // -------------------------------------------------------------- storage

    function openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => { request.result.createObjectStore('kv') }
        request.onsuccess = () => { resolve(request.result) }
        request.onerror = () => { reject(request.error) }
      })
    }

    async function readWallpaper() {
      const database = await openDatabase()
      try {
        return await new Promise((resolve, reject) => {
          const request = database.transaction('kv', 'readonly').objectStore('kv').get('wallpaper')
          request.onsuccess = () => { resolve(request.result ?? null) }
          request.onerror = () => { reject(request.error) }
        })
      } finally {
        database.close()
      }
    }

    async function writeWallpaper(blob) {
      const database = await openDatabase()
      try {
        await new Promise((resolve, reject) => {
          const transaction = database.transaction('kv', 'readwrite')
          transaction.objectStore('kv').put(blob, 'wallpaper')
          transaction.oncomplete = () => { resolve() }
          transaction.onerror = () => { reject(transaction.error) }
          transaction.onabort = () => { reject(transaction.error) }
        })
      } finally {
        database.close()
      }
    }

    async function deleteWallpaper() {
      const database = await openDatabase()
      try {
        await new Promise((resolve, reject) => {
          const transaction = database.transaction('kv', 'readwrite')
          transaction.objectStore('kv').delete('wallpaper')
          transaction.oncomplete = () => { resolve() }
          transaction.onerror = () => { reject(transaction.error) }
        })
      } finally {
        database.close()
      }
    }

    function readPrefs() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? 'null')
        if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_PREFS }
        const clamp = (value, min, max) => (typeof value === 'number' && Number.isFinite(value)
          ? Math.min(max, Math.max(min, value))
          : null)
        return {
          imageOpacity: clamp(parsed.imageOpacity, 0, 100) ?? DEFAULT_PREFS.imageOpacity,
          surfaceMode: parsed.surfaceMode === 'transparent' ? 'transparent' : 'blend',
          surfaceTransparency: clamp(parsed.surfaceTransparency, 0, 100) ?? DEFAULT_PREFS.surfaceTransparency,
          tintStrength: clamp(parsed.tintStrength, 0, 12) ?? DEFAULT_PREFS.tintStrength,
          blur: clamp(parsed.blur, 0, 40) ?? DEFAULT_PREFS.blur,
          dim: clamp(parsed.dim, 0, 80) ?? DEFAULT_PREFS.dim,
        }
      } catch {
        return { ...DEFAULT_PREFS }
      }
    }

    function writePrefs(prefs) {
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify({
          imageOpacity: prefs.imageOpacity,
          surfaceMode: prefs.surfaceMode,
          surfaceTransparency: prefs.surfaceTransparency,
          tintStrength: prefs.tintStrength,
          blur: prefs.blur,
          dim: prefs.dim,
        }))
      } catch {
        // A browser that refuses localStorage keeps the skin for this page only.
      }
    }

    function clearPrefs() {
      try { window.localStorage.removeItem(PREFS_KEY) } catch { /* nothing to clear */ }
    }

    // -------------------------------------------------------------- imaging

    async function shrink(file) {
      if (typeof createImageBitmap !== 'function') return file
      const bitmap = await createImageBitmap(file)
      try {
        const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (context === null) return file
        context.drawImage(bitmap, 0, 0, width, height)
        const encoded = await new Promise((resolve) => {
          canvas.toBlob((value) => { resolve(value) }, 'image/webp', 0.9)
        })
        return encoded ?? file
      } finally {
        if (typeof bitmap.close === 'function') bitmap.close()
      }
    }

    /** Average the image down to one colour, so the tint layer follows the wallpaper. */
    async function sampleTint(blob) {
      if (typeof createImageBitmap !== 'function') return null
      try {
        const bitmap = await createImageBitmap(blob)
        try {
          const size = 8
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const context = canvas.getContext('2d')
          if (context === null) return null
          context.drawImage(bitmap, 0, 0, size, size)
          const { data } = context.getImageData(0, 0, size, size)
          let r = 0
          let g = 0
          let b = 0
          let count = 0
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 8) continue
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count += 1
          }
          if (count === 0) return null
          return [Math.round(r / count), Math.round(g / count), Math.round(b / count)]
        } finally {
          if (typeof bitmap.close === 'function') bitmap.close()
        }
      } catch {
        return null
      }
    }

    // ----------------------------------------------------------------- view

    function TriggerIcon({ size }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 18 18', fill: 'none', 'aria-hidden': true,
      },
      h('rect', {
        x: 2.1, y: 3.1, width: 13.8, height: 11.8, rx: 2.8,
        stroke: 'currentColor', strokeWidth: 1.5,
      }),
      h('path', {
        d: 'M3 12.2l3.4-3.2 2.8 2.5 2.2-2 3.6 3.3',
        stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
      }),
      h('circle', { cx: 11.5, cy: 6.8, r: 1.2, fill: 'currentColor' }))
    }

    function CloseIcon() {
      return h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M4 4l8 8M12 4l-8 8',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round',
        }))
    }

    /** Sidebar-foot trigger: a nav row when wide, a round icon button in the 56px rail. */
    function SkinTrigger({ wide, useSkin, open, t }) {
      const active = useSkin((state) => state.applied.url !== null)
      return h('div', { className: wide ? 'odsk-layer' : 'odsk-layer odsk-rail' },
        h('div', { className: 'odsk-footer' },
          h('button', {
            type: 'button',
            className: 'odsk-trigger',
            'data-active': active ? '' : undefined,
            'aria-haspopup': 'dialog',
            'aria-label': t('open'),
            title: wide ? undefined : t('open'),
            onClick: () => { open() },
          },
          h(TriggerIcon, { size: wide ? 16 : 18 }),
          wide === true ? h('span', { className: 'odsk-trigger-label' }, t('open')) : null)))
    }

    /** Frame-wide dialog seat: nothing while closed, one form per open request. */
    function SkinDialog(props) {
      const open = props.useSkin((state) => state.open)
      if (!open) return null
      return h(SkinForm, props)
    }

    /**
     * Frame-wide tint: one thin veil over everything the interface does not make
     * translucent, so panels that paint their own solid colour still belong to the skin.
     */
    function SkinTint({ useSkin }) {
      const view = useSkin((state) => state.preview ?? state.applied)
      if (view.url === null || view.tint === null || view.tint === undefined) return null
      if (view.tintStrength <= 0) return null
      const [r, g, b] = view.tint
      return h('div', {
        className: 'odsk-tint',
        'aria-hidden': true,
        style: { background: `rgb(${r}, ${g}, ${b})`, opacity: view.tintStrength / 100 },
      })
    }

    function Slider({ label, value, min, max, step, onChange, t }) {
      return h('div', { className: 'odsk-field' },
        h('span', { className: 'odsk-field-label' }, label),
        h('span', { className: 'odsk-field-value' }, t('value.percent', { value })),
        h('input', {
          type: 'range', min, max, step, value,
          'aria-label': label,
          onChange: (event) => { onChange(Number(event.target.value)) },
        }))
    }

    function SkinForm({ useSkin, t, preview, apply, close, reset }) {
      const applied = useSkin((state) => state.applied)
      const [draft, setDraft] = useState(() => ({
        url: applied.url,
        blob: null,
        tint: applied.tint,
        imageOpacity: applied.imageOpacity,
        surfaceMode: applied.surfaceMode,
        surfaceTransparency: applied.surfaceTransparency,
        tintStrength: applied.tintStrength,
        blur: applied.blur,
        dim: applied.dim,
      }))
      const [error, setError] = useState(null)
      const [dragging, setDragging] = useState(false)
      const panelRef = useRef(null)
      const inputRef = useRef(null)
      const committedUrl = useRef(applied.url)
      const draftRef = useRef(draft)
      draftRef.current = draft

      const patch = (next) => { setDraft((current) => ({ ...current, ...next })) }

      // Live preview: every draft change repaints without persisting.
      useEffect(() => { preview(draft) }, [draft, preview])
      useEffect(() => () => { preview(null) }, [preview])

      const accept = async (file) => {
        if (!file) return
        if (!file.type.startsWith('image/')) { setError(t('error.notImage')); return }
        if (file.size > MAX_BYTES) { setError(t('error.tooLarge')); return }
        try {
          const blob = await shrink(file)
          const tint = await sampleTint(blob)
          const url = URL.createObjectURL(blob)
          const stale = draftRef.current.url
          if (stale !== null && stale !== committedUrl.current) URL.revokeObjectURL(stale)
          setError(null)
          patch({ url, blob, tint })
        } catch {
          setError(t('error.decode'))
        }
      }
      const acceptRef = useRef(accept)
      acceptRef.current = accept

      // Escape, Tab containment, and focus hand-off for the dialog.
      useEffect(() => {
        const panel = panelRef.current
        const previous = document.activeElement
        const focusable = () => {
          if (panel === null) return []
          return [...panel.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')]
            .filter((node) => !node.disabled && node.offsetParent !== null)
        }
        const first = focusable()[0]
        if (first !== undefined) first.focus()
        const onKeyDown = (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            close()
            return
          }
          if (event.key !== 'Tab') return
          const list = focusable()
          if (list.length === 0) return
          const index = list.indexOf(document.activeElement)
          if (event.shiftKey && index <= 0) {
            event.preventDefault()
            list[list.length - 1].focus()
          } else if (!event.shiftKey && index === list.length - 1) {
            event.preventDefault()
            list[0].focus()
          }
        }
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('keydown', onKeyDown, true)
          if (previous !== null && typeof previous.focus === 'function') {
            try { previous.focus() } catch { /* the trigger may already be gone */ }
          }
        }
      }, [close])

      // Pasting an image is a shortcut for the same drop.
      useEffect(() => {
        const onPaste = (event) => {
          const files = event.clipboardData?.files ?? []
          if (files.length === 0) return
          event.preventDefault()
          void acceptRef.current(files[0])
        }
        document.addEventListener('paste', onPaste)
        return () => { document.removeEventListener('paste', onPaste) }
      }, [])

      // Own every file drag while the dialog is open. The shipped composer overlay
      // (`.mask`, z-index 1000) activates on the first file `dragenter` that reaches
      // the document and then covers this dialog, so capture these events on the
      // window before the document sees them and hand the drop to this dialog alone.
      useEffect(() => {
        let depth = 0
        const hasFiles = (event) => {
          const types = event.dataTransfer?.types
          if (types === undefined || types === null) return false
          return Array.prototype.indexOf.call(types, 'Files') !== -1
        }
        const insideDialog = (target) => target instanceof Element && target.closest('[data-odsk-dialog]') !== null
        const reset = () => { depth = 0; setDragging(false) }
        const onEnter = (event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          event.stopPropagation()
          if (!insideDialog(event.target)) return
          depth += 1
          setDragging(true)
        }
        const onOver = (event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          event.stopPropagation()
          if (event.dataTransfer !== null) {
            event.dataTransfer.dropEffect = insideDialog(event.target) ? 'copy' : 'none'
          }
        }
        const onLeave = (event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          event.stopPropagation()
          if (!insideDialog(event.target)) return
          depth = Math.max(0, depth - 1)
          if (depth === 0) setDragging(false)
        }
        const onDrop = (event) => {
          if (!hasFiles(event)) return
          event.preventDefault()
          event.stopPropagation()
          const inside = insideDialog(event.target)
          reset()
          if (!inside) return
          void acceptRef.current(event.dataTransfer?.files?.[0])
        }
        const onDragEnd = () => { reset() }
        window.addEventListener('dragenter', onEnter, true)
        window.addEventListener('dragover', onOver, true)
        window.addEventListener('dragleave', onLeave, true)
        window.addEventListener('drop', onDrop, true)
        window.addEventListener('dragend', onDragEnd)
        return () => {
          window.removeEventListener('dragenter', onEnter, true)
          window.removeEventListener('dragover', onOver, true)
          window.removeEventListener('dragleave', onLeave, true)
          window.removeEventListener('drop', onDrop, true)
          window.removeEventListener('dragend', onDragEnd)
        }
      }, [])

      return h('div', {
        className: 'odsk-backdrop',
        onMouseDown: (event) => { if (event.target === event.currentTarget) close() },
      },
      h('div', {
        className: 'odsk-dialog',
        ref: panelRef,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'odsk-dialog-title',
        'data-odsk-dialog': '',
      },
      h('header', { className: 'odsk-head' },
        h('h2', { className: 'odsk-title', id: 'odsk-dialog-title' }, t('dialog.title')),
        h('button', {
          type: 'button', className: 'odsk-icon-btn', 'aria-label': t('action.close'), onClick: close,
        }, h(CloseIcon))),
      h('div', { className: 'odsk-body' },
        h('button', {
          type: 'button',
          className: 'odsk-drop',
          'data-dragging': dragging ? '' : undefined,
          'aria-label': draft.url === null ? t('drop.empty') : t('drop.replace'),
          onClick: () => { inputRef.current?.click() },
        },
        draft.url === null
          ? h(React.Fragment, null,
            h('span', { className: 'odsk-drop-hint' }, t('drop.empty')),
            h('span', { className: 'odsk-drop-sub' }, t('drop.sub')))
          : h('img', { src: draft.url, alt: t('a11y.preview') })),
        h('input', {
          ref: inputRef,
          type: 'file',
          accept: 'image/*',
          className: 'odsk-sr',
          tabIndex: -1,
          'aria-hidden': true,
          onChange: (event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            void accept(file)
          },
        }),
        h(Slider, {
          label: t('field.wallpaper'), value: draft.imageOpacity, min: 0, max: 100, step: 1, t,
          onChange: (value) => { patch({ imageOpacity: value }) },
        }),
        h('div', { className: 'odsk-modes', role: 'group', 'aria-label': t('field.mode') },
          h('button', {
            type: 'button',
            className: 'odsk-mode',
            'aria-pressed': draft.surfaceMode === 'blend' ? 'true' : 'false',
            onClick: () => { patch({ surfaceMode: 'blend' }) },
          }, t('mode.blend')),
          h('button', {
            type: 'button',
            className: 'odsk-mode',
            'aria-pressed': draft.surfaceMode === 'transparent' ? 'true' : 'false',
            onClick: () => { patch({ surfaceMode: 'transparent' }) },
          }, t('mode.transparent'))),
        h('span', { className: 'odsk-mode-hint' },
          t(draft.surfaceMode === 'blend' ? 'mode.blendHint' : 'mode.transparentHint')),
        h(Slider, {
          label: t(draft.surfaceMode === 'blend' ? 'field.blend' : 'field.surface'),
          value: draft.surfaceTransparency, min: 0, max: 100, step: 1, t,
          onChange: (value) => { patch({ surfaceTransparency: value }) },
        }),
        h(Slider, {
          label: t('field.tint'), value: draft.tintStrength, min: 0, max: 12, step: 1, t,
          onChange: (value) => { patch({ tintStrength: value }) },
        }),
        h(Slider, {
          label: t('field.blur'), value: draft.blur, min: 0, max: 40, step: 1, t,
          onChange: (value) => { patch({ blur: value }) },
        }),
        h(Slider, {
          label: t('field.dim'), value: draft.dim, min: 0, max: 80, step: 1, t,
          onChange: (value) => { patch({ dim: value }) },
        }),
        error === null ? null : h('p', { className: 'odsk-error', role: 'alert' }, error)),
      h('footer', { className: 'odsk-foot' },
        h('button', { type: 'button', className: 'odsk-btn', onClick: () => { void reset() } }, t('action.reset')),
        h('span', { className: 'odsk-spacer' }),
        h('button', { type: 'button', className: 'odsk-btn', onClick: close }, t('action.cancel')),
        h('button', {
          type: 'button',
          className: 'odsk-btn odsk-btn-primary',
          disabled: draft.url === null,
          onClick: () => { apply(draft).catch(() => { setError(t('error.store')) }) },
        }, t('action.apply')))))
    }

    // ----------------------------------------------------------------- apply

    /** Required services: the slot registry and the dictionary service. */
    const inject = ['slots', 'locale']

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'oranges-dsh-skin: dictionaries')

      ctx.effect(() => {
        document.getElementById(STYLE_ID)?.remove()
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.textContent = CSS
        document.head.appendChild(style)
        return () => { style.remove() }
      }, 'oranges-dsh-skin: stylesheet')

      const painter = createPainter()

      ctx.effect(() => {
        const off = store.subscribe(() => { painter.paint() })
        painter.paint()
        return () => {
          off()
          painter.dispose()
        }
      }, 'oranges-dsh-skin: paint')

      // The palette owner rewrites its inline tokens on a light/dark switch; re-read them.
      ctx.effect(() => {
        const observer = new MutationObserver(() => { painter.paint() })
        observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'data-ds-dark-theme'] })
        return () => { observer.disconnect() }
      }, 'oranges-dsh-skin: palette watch')

      // Restore the saved wallpaper before the first interaction.
      ctx.effect(() => {
        let cancelled = false
        void (async () => {
          try {
            const blob = await readWallpaper()
            if (cancelled || blob === null) return
            const prefs = readPrefs()
            const tint = await sampleTint(blob)
            if (cancelled) return
            store.set((state) => ({
              ...state,
              applied: { url: URL.createObjectURL(blob), blob, tint, ...prefs },
            }))
          } catch {
            // A browser without IndexedDB simply starts without a wallpaper.
          }
        })()
        return () => {
          cancelled = true
          const { applied, preview } = store.getSnapshot()
          for (const url of [applied.url, preview?.url]) {
            if (typeof url === 'string') URL.revokeObjectURL(url)
          }
          store.set({ open: false, applied: emptyApplied(), preview: null })
        }
      }, 'oranges-dsh-skin: restore')

      const face = {
        hooks: { skin: { getSnapshot: store.getSnapshot, subscribe: store.subscribe } },
        open: () => { store.set((state) => ({ ...state, open: true })) },
        close: () => { store.set((state) => ({ ...state, open: false, preview: null })) },
        preview: (draft) => { store.set((state) => ({ ...state, preview: draft })) },
        apply: async (draft) => {
          const previousBlob = store.getSnapshot().applied.blob
          const previousTint = store.getSnapshot().applied.tint
          if (draft.url === null) {
            await deleteWallpaper()
            clearPrefs()
          } else {
            if (draft.blob !== null) await writeWallpaper(draft.blob)
            writePrefs(draft)
          }
          const previousUrl = store.getSnapshot().applied.url
          if (previousUrl !== null && previousUrl !== draft.url) URL.revokeObjectURL(previousUrl)
          store.set({
            open: false,
            preview: null,
            applied: {
              url: draft.url,
              blob: draft.blob ?? previousBlob,
              tint: draft.tint ?? previousTint,
              imageOpacity: draft.imageOpacity,
              surfaceTransparency: draft.surfaceTransparency,
              tintStrength: draft.tintStrength,
              blur: draft.blur,
              dim: draft.dim,
            },
          })
        },
        reset: async () => {
          const { applied, preview } = store.getSnapshot()
          for (const url of [applied.url, preview?.url]) {
            if (typeof url === 'string') URL.revokeObjectURL(url)
          }
          clearPrefs()
          try { await deleteWallpaper() } catch { /* nothing stored */ }
          store.set({ open: false, preview: null, applied: emptyApplied() })
        },
      }

      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'oranges-dsh-skin',
        order: 50,
        locale: NS,
        inject: () => face,
      }, SkinTrigger))

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'oranges-dsh-skin.dialog',
        order: 200,
        locale: NS,
        inject: () => face,
      }, SkinDialog))

      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay',
        id: 'oranges-dsh-skin.tint',
        order: 150,
        inject: () => face,
      }, SkinTint))
    }

    return { inject, apply }
  },
})
