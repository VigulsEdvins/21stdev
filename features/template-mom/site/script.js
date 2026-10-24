import './style.css'
import Lenis from 'lenis'
import {
  getGridConfig,
  subscribeToGridChanges,
  getCellHoverImages,
  getCellHoverPositions,
  getCellHoverSlotCount,
  computeMobileGridPlacement,
  getSiteSettings,
  subscribeToSiteSettings,
  formatUrl,
  syncRemoteGridConfig,
  syncRemoteSiteSettings,
} from './grid_manager.js'
import { initI18n, getCurrentLang, t } from './i18n.js'

/* ==========================================================================
   Margarita Vigule — Responsive Gallery & Direct Link Navigation
   ========================================================================== */

// Initialize Multilingual system (LV / EN / RU)
initI18n()

// Initialize Lenis Smooth Momentum Scrolling
const lenis = new Lenis({
  autoRaf: true,
  smoothWheel: true,
})

const defaultGrid = document.getElementById('default-grid')
const hoverStage = document.getElementById('project-hover-stage')
const centerTitle = document.getElementById('center-title')
const urlBadge = document.getElementById('hover-url-badge')

// Studio Information Overlay
const siteInfoDrawer = document.getElementById('site-info-drawer')
const drawerBackdrop = document.getElementById('drawer-backdrop')

let siteSettings = getSiteSettings()
let defaultTitle = siteSettings?.headlineText || 'Margarita Vigule'
if (centerTitle) centerTitle.textContent = defaultTitle

subscribeToSiteSettings((newSettings) => {
  siteSettings = newSettings
  defaultTitle = siteSettings?.headlineText || 'Margarita Vigule'
  if (!currentCellKey) {
    setCenterTitle(defaultTitle)
  }
})

let currentCellKey = null
let leaveTimeout = null
let titleTimeout = null
let staggerTimeouts = []
const preloadedCells = new Set()

function clearStaggerTimeouts() {
  staggerTimeouts.forEach((id) => clearTimeout(id))
  staggerTimeouts = []
}

// Detect mobile screen or touch-only device
function isMobileOrTouch() {
  return window.innerWidth <= 768 || window.matchMedia('(hover: none)').matches
}

// Smart on-demand image preloader (loads on hover rather than flooding on startup)
function preloadCellHoverImages(cell) {
  if (!cell || isMobileOrTouch()) return
  const cellKey = cell.id || cell.slug || cell.project
  if (preloadedCells.has(cellKey)) return
  preloadedCells.add(cellKey)

  const imgs = getCellHoverImages(cell)
  Object.values(imgs).forEach((src) => {
    if (src) {
      const im = new Image()
      im.src = src
      if (im.decode) im.decode().catch(() => {})
    }
  })
}

function setCenterTitle(text) {
  if (!centerTitle || centerTitle.textContent === text) return
  centerTitle.classList.add('changing')
  clearTimeout(titleTimeout)
  titleTimeout = setTimeout(() => {
    centerTitle.textContent = text
    centerTitle.classList.remove('changing')
  }, 80)
}

function renderHoverSlots(cell) {
  if (!hoverStage || isMobileOrTouch()) return

  clearStaggerTimeouts()

  const count = getCellHoverSlotCount(cell)
  const imgs = getCellHoverImages(cell)
  const positions = getCellHoverPositions(cell)

  let existingSlots = Array.from(hoverStage.querySelectorAll('.hover-slot-item'))

  while (existingSlots.length > count) {
    const el = existingSlots.pop()
    el.remove()
  }

  while (existingSlots.length < count) {
    const i = existingSlots.length + 1
    const slotDiv = document.createElement('div')
    slotDiv.className = 'hover-slot-item'
    slotDiv.id = `hover-slot-${i}`
    slotDiv.dataset.slot = `slot${i}`

    const img = document.createElement('img')
    img.id = `hover-img-${i}`
    img.alt = ''
    slotDiv.appendChild(img)

    hoverStage.appendChild(slotDiv)
    existingSlots.push(slotDiv)
  }

  for (let i = 1; i <= count; i++) {
    const slotEl = existingSlots[i - 1]
    const imgEl = slotEl.querySelector('img')
    const slotKey = `slot${i}`
    const pos = positions[slotKey]
    const imgSrc = imgs[slotKey]

    slotEl.classList.remove('is-visible')
    slotEl.style.setProperty('--slot-index', `${i - 1}`)

    if (imgEl && imgSrc) {
      imgEl.src = imgSrc
    }

    if (pos) {
      slotEl.style.left = `${pos.left}%`
      slotEl.style.top = `${pos.top}%`
      slotEl.style.width = `${pos.width}%`
      slotEl.style.aspectRatio = pos.aspect === 'auto' ? 'auto' : (pos.aspect || '16/10')
      slotEl.style.position = 'absolute'
      slotEl.style.overflow = 'hidden'
      slotEl.style.right = 'auto'
      slotEl.style.bottom = 'auto'
    }
  }

  void hoverStage.offsetWidth

  const STAGGER_DELAY_MS = 35
  for (let i = 1; i <= count; i++) {
    const slotEl = existingSlots[i - 1]
    const delay = (i - 1) * STAGGER_DELAY_MS
    const tId = setTimeout(() => {
      slotEl.classList.add('is-visible')
    }, delay)
    staggerTimeouts.push(tId)
  }
}

function activateProject(cell) {
  if (isMobileOrTouch()) return

  clearTimeout(leaveTimeout)
  preloadCellHoverImages(cell)

  const cellKey = cell.id || cell.slug || cell.project
  if (currentCellKey === cellKey) return
  currentCellKey = cellKey

  setCenterTitle(cell.project || defaultTitle)
  defaultGrid?.classList.add('dimmed')
  renderHoverSlots(cell)

  hoverStage?.classList.add('is-active')

  if (urlBadge) {
    const targetUrl = cell.link && cell.link.trim() ? formatUrl(cell.link.trim()) : null
    if (targetUrl) {
      urlBadge.textContent = targetUrl
      urlBadge.classList.add('is-visible')
      urlBadge.onclick = () => {
        window.open(targetUrl, '_blank', 'noopener,noreferrer')
      }
    } else {
      urlBadge.textContent = ''
      urlBadge.classList.remove('is-visible')
      urlBadge.onclick = null
    }
  }
}

function deactivateProject() {
  clearTimeout(leaveTimeout)
  leaveTimeout = setTimeout(() => {
    currentCellKey = null
    clearStaggerTimeouts()
    if (!isMobileOrTouch()) {
      setCenterTitle(defaultTitle)
    }
    defaultGrid?.classList.remove('dimmed')
    hoverStage?.classList.remove('is-active')
    if (hoverStage) {
      hoverStage.querySelectorAll('.hover-slot-item').forEach((el) => {
        el.classList.remove('is-visible')
      })
    }
    if (urlBadge) {
      urlBadge.classList.remove('is-visible')
    }
  }, 40)
}

/* --------------------------------------------------------------------------
   Studio Information Overlay
   -------------------------------------------------------------------------- */
function closeAllDrawers() {
  siteInfoDrawer?.classList.remove('is-open')
  drawerBackdrop?.classList.remove('is-open')
  document.body.style.overflow = ''
}

function openInfoDrawer(targetPane = 'info-about') {
  if (!siteInfoDrawer) return
  closeAllDrawers()

  siteInfoDrawer.querySelectorAll('.info-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pane === targetPane)
  })
  siteInfoDrawer.querySelectorAll('.info-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === `pane-${targetPane}`)
  })

  if (targetPane === 'info-work') {
    populateWorkIndex()
  }

  siteInfoDrawer.classList.add('is-open')
  drawerBackdrop?.classList.add('is-open')
  document.body.style.overflow = 'hidden'
}

function populateWorkIndex(filterQuery = '') {
  const listEl = document.getElementById('work-index-list')
  if (!listEl) return
  listEl.innerHTML = ''
  const cells = getGridConfig()
  const q = (filterQuery || '').toLowerCase().trim()
  const matching = cells.filter((c) => {
    if (!q) return true
    return (c.project && c.project.toLowerCase().includes(q)) ||
           (c.slug && c.slug.toLowerCase().includes(q))
  })

  if (matching.length === 0) {
    listEl.innerHTML = '<div style="padding: 16px 0; color: #888; font-size: 11px;">No projects found matching filter</div>'
    return
  }

  matching.forEach((c) => {
    const targetUrl = c.link && c.link.trim() ? formatUrl(c.link.trim()) : null
    const row = document.createElement('div')
    row.className = 'work-index-item'
    row.innerHTML = `
      <strong>${c.project || 'Project'}</strong>
      <span>${c.slug ? `/${c.slug}` : '—'}</span>
      ${targetUrl ? '<span class="btn-index-view">Visit ↗</span>' : ''}
    `
    if (targetUrl) {
      row.style.cursor = 'pointer'
      row.addEventListener('click', () => {
        window.open(targetUrl, '_blank', 'noopener,noreferrer')
      })
    } else {
      row.style.cursor = 'default'
    }
    listEl.appendChild(row)
  })
}

// Dynamically render cells from configuration with direct link navigation
function renderGrid(cells) {
  if (!defaultGrid) return
  defaultGrid.innerHTML = ''
  preloadedCells.clear()
  currentCellKey = null

  const placedMobile = computeMobileGridPlacement(cells)
  const mobileMap = new Map(placedMobile.map((c) => [c.id, c]))

  cells.forEach((cell, index) => {
    const cellEl = document.createElement('div')
    cellEl.className = 'media-cell'
    cellEl.id = cell.id || ''

    const pcCol = `${cell.col || 1} / span ${cell.colSpan || 1}`
    const pcRow = `${cell.row || 1} / span ${cell.rowSpan || 1}`
    cellEl.style.setProperty('--pc-col', pcCol)
    cellEl.style.setProperty('--pc-row', pcRow)
    cellEl.style.gridColumn = `var(--pc-col, ${pcCol})`
    cellEl.style.gridRow = `var(--pc-row, ${pcRow})`

    const mInfo = mobileMap.get(cell.id) || cell
    const mColSpan = mInfo.cssGridColumn || (cell.mobileColSpan === 2 ? '1 / -1' : 'auto / span 1')
    const mRowSpan = mInfo.cssGridRow || 'auto'
    const mOrder = mInfo.mobileOrder !== undefined ? mInfo.mobileOrder : index + 1
    const mAspect = cell.mobileAspect || (cell.mobileColSpan === 2 ? '16/9' : '16/11')
    cellEl.style.setProperty('--m-col', mColSpan)
    cellEl.style.setProperty('--m-row', mRowSpan)
    cellEl.style.setProperty('--m-order', `${mOrder}`)
    cellEl.style.setProperty('--m-aspect', mAspect)

    cellEl.setAttribute('data-project', cell.project || '')
    cellEl.setAttribute('data-slug', cell.slug || '')
    cellEl.setAttribute('data-mobile-order', `${mOrder}`)
    cellEl.setAttribute('data-cell-name', mInfo.cellName || `cell-${mOrder}`)

    // Compute target destination URL - ONLY if cell actually has a link
    const targetUrl = cell.link && cell.link.trim() ? formatUrl(cell.link.trim()) : null

    if (targetUrl) {
      cellEl.title = `${cell.project || 'Project'} — ${targetUrl} (Click to open link)`
      cellEl.style.cursor = 'pointer'
      cellEl.addEventListener('click', () => {
        window.open(targetUrl, '_blank', 'noopener,noreferrer')
      })
    } else {
      cellEl.title = cell.project || 'Project'
      cellEl.style.cursor = 'default'
    }

    const img = document.createElement('img')
    img.src = cell.image
    img.alt = cell.project || 'Project Image'
    img.loading = index < 8 ? 'eager' : 'lazy'
    img.onerror = () => {
      img.style.background = '#222'
    }

    cellEl.appendChild(img)

    cellEl.addEventListener('mouseenter', () => {
      if (isMobileOrTouch()) return
      activateProject(cell)
    })

    cellEl.addEventListener('mouseleave', () => {
      if (isMobileOrTouch()) return
      deactivateProject()
    })

    defaultGrid.appendChild(cellEl)
  })
}

// Initial render
const initialCells = getGridConfig()
renderGrid(initialCells)

subscribeToGridChanges((newConfig) => {
  renderGrid(newConfig)
})

// Concurrently sync latest cloud/published configuration in background
syncRemoteGridConfig()
syncRemoteSiteSettings()

const galleryStage = document.querySelector('.gallery-stage')
galleryStage?.addEventListener('mouseleave', () => {
  if (isMobileOrTouch()) return
  deactivateProject()
})

window.addEventListener('resize', () => {
  if (isMobileOrTouch()) {
    defaultGrid?.classList.remove('dimmed')
    hoverStage?.classList.remove('is-active')
    if (centerTitle) centerTitle.textContent = defaultTitle
  }
})

// Wire Navigation Links to Info Drawer
document.querySelectorAll('[data-drawer-pane]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const pane = btn.getAttribute('data-drawer-pane')
    openInfoDrawer(pane)
  })
})

// Wire Drawer Tab Buttons
siteInfoDrawer?.querySelectorAll('.info-nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const pane = btn.getAttribute('data-pane')
    openInfoDrawer(pane)
  })
})

// Wire Drawer Close Buttons & Backdrop
document.getElementById('btn-close-info-drawer')?.addEventListener('click', closeAllDrawers)
drawerBackdrop?.addEventListener('click', closeAllDrawers)

// Drawer quick search filter
document.getElementById('inp-drawer-search')?.addEventListener('input', (e) => {
  populateWorkIndex(e.target.value)
})

// Keyboard shortcuts for landing page: Escape closes info drawer
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllDrawers()
  }
})
