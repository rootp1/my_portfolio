import { useEffect, useRef, useState } from 'react'
import './portfolio.css'

const fallbackProjects = [
  { id: 'fallback-1', title: 'Project', image: '/projects/project-1.png', href: '' },
]

export default function Portfolio() {
  // Lower = slower wheel-to-horizontal scrolling
  const WHEEL_MULTIPLIER = 0.45
  const [projects, setProjects] = useState(fallbackProjects)
  const [meta, setMeta] = useState({ titleLines: ['Portfolio', 'Project Name'], links: [] })
  const [activeTitle, setActiveTitle] = useState('Project Name')
  const [hovering, setHovering] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollStart, setScrollStart] = useState(0)
  const [galleryEl, setGalleryEl] = useState(null)
  const [scrollbarEl, setScrollbarEl] = useState(null)
  const [contentWidth, setContentWidth] = useState(0)
  const rootRef = useRef(null)
  const mastheadRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    fetch('/projects/manifest.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('No manifest'))))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.projects) && data.projects.length) {
          const mapped =
            data.projects.map((p, i) => ({
              id: p.id || `p-${i}`,
              title: p.title || `Project ${i + 1}`,
              image: p.image,
              href: p.href || '',
            }))
          setProjects(mapped)
          setActiveTitle(mapped[0]?.title || 'Project Name')
          if (data.meta) {
            setMeta({
              titleLines: Array.isArray(data.meta.titleLines) ? data.meta.titleLines : ['Portfolio', 'Project Name'],
              links: Array.isArray(data.meta.links) ? data.meta.links : [],
            })
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Observe which project is most visible inside the gallery (disabled while hovering)
  useEffect(() => {
    if (!galleryEl || !projects?.length || hovering) return
    const items = Array.from(galleryEl.querySelectorAll('.gallery__item'))
    if (!items.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the intersecting entry with the largest intersection ratio
        let best = null
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!best || e.intersectionRatio > best.intersectionRatio) best = e
          }
        }
        if (best) {
          const title = best.target.getAttribute('data-title')
          if (title) setActiveTitle(title)
        }
      },
      { root: galleryEl, threshold: [0.25, 0.5, 0.75] }
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [galleryEl, projects, hovering])

  // Compute available gallery height so images never get clipped
  useEffect(() => {
    const updateHeights = () => {
      const root = rootRef.current
      const head = mastheadRef.current
      if (!root || !head) return
      // Account for paddings/gaps, use VisualViewport for accuracy on mobile/desktop panels
      const paddingReserve = 24
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight
      const avail = Math.max(160, vh - head.offsetHeight - paddingReserve)
      root.style.setProperty('--gallery-avail-h', `${avail}px`)
    }
    updateHeights()
    window.addEventListener('resize', updateHeights)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeights)
      window.visualViewport.addEventListener('scroll', updateHeights)
    }
    return () => {
      window.removeEventListener('resize', updateHeights)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeights)
        window.visualViewport.removeEventListener('scroll', updateHeights)
      }
    }
  }, [activeTitle])

  // Make mouse wheel scroll horizontally without Shift (bottom scrollbar via native listeners)
  useEffect(() => {
    if (!scrollbarEl) return
    // Normalize deltas across devices (pixels, lines, pages)
    const normalize = (e) => {
      const mode = e.deltaMode // 0=pixel, 1=line, 2=page
      const factor = mode === 1 ? 16 : mode === 2 ? window.innerHeight : 1
      return {
        x: e.deltaX * factor,
        y: e.deltaY * factor,
      }
    }
  const onWheel = (target) => (e) => {
      if (!target) return
      if (e.ctrlKey) return
      const { x, y } = normalize(e)
      if (Math.abs(y) > Math.abs(x)) {
    target.scrollLeft += y * WHEEL_MULTIPLIER
        e.preventDefault()
      }
    }
    // Legacy mouse wheel events (older browsers)
    const onLegacyWheel = (target) => (event) => {
      if (!target) return
      // @ts-ignore legacy props
      const hasWheelDelta = typeof event.wheelDelta === 'number'
      // @ts-ignore legacy props
      const hasDetail = typeof event.detail === 'number'
      // Don't hijack pinch-zoom
      if (event.ctrlKey) return
      let deltaY = 0
      if (hasWheelDelta) {
        // Chrome/Safari legacy: wheelDelta 120 per notch up, -120 down
        // Invert so positive is down like deltaY
        // @ts-ignore legacy props
        deltaY = -event.wheelDelta
      } else if (hasDetail) {
        // Firefox legacy: detail is typically 3 per notch; convert to ~pixels
        // @ts-ignore legacy props
        deltaY = event.detail * 40
      }
      if (deltaY !== 0) {
        target.scrollLeft += deltaY * WHEEL_MULTIPLIER
        event.preventDefault()
      }
    }
    const opts = { passive: false }
    const onWheelBar = scrollbarEl ? onWheel(scrollbarEl) : null
    const onLegacyWheelBar = scrollbarEl ? onLegacyWheel(scrollbarEl) : null
    if (scrollbarEl && onWheelBar) scrollbarEl.addEventListener('wheel', onWheelBar, opts)
    if (scrollbarEl && onLegacyWheelBar) {
      scrollbarEl.addEventListener('mousewheel', onLegacyWheelBar, opts)
      scrollbarEl.addEventListener('DOMMouseScroll', onLegacyWheelBar, opts)
    }
    return () => {
      if (scrollbarEl && onWheelBar) scrollbarEl.removeEventListener('wheel', onWheelBar)
      if (scrollbarEl && onLegacyWheelBar) {
        scrollbarEl.removeEventListener('mousewheel', onLegacyWheelBar)
        scrollbarEl.removeEventListener('DOMMouseScroll', onLegacyWheelBar)
      }
    }
  }, [scrollbarEl])

  // Sync bottom scrollbar with the hidden gallery scrollbar
  useEffect(() => {
    if (!galleryEl || !scrollbarEl) return
    // Ensure the scrollbar's inner width matches content width
    const updateWidths = () => setContentWidth(galleryEl.scrollWidth)
    updateWidths()
    let ro
    if (window.ResizeObserver) {
      ro = new ResizeObserver(updateWidths)
      ro.observe(galleryEl)
    } else {
      window.addEventListener('resize', updateWidths)
    }

    let syncing = false
    const onGalleryScroll = () => {
      if (syncing) return
      syncing = true
      scrollbarEl.scrollLeft = galleryEl.scrollLeft
      syncing = false
    }
    const onBarScroll = () => {
      if (syncing) return
      syncing = true
      galleryEl.scrollLeft = scrollbarEl.scrollLeft
      syncing = false
    }
    galleryEl.addEventListener('scroll', onGalleryScroll, { passive: true })
    scrollbarEl.addEventListener('scroll', onBarScroll, { passive: true })
    return () => {
      galleryEl.removeEventListener('scroll', onGalleryScroll)
      scrollbarEl.removeEventListener('scroll', onBarScroll)
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', updateWidths)
    }
  }, [galleryEl, scrollbarEl])

  return (
  <main className="portfolio portfolio--light" ref={rootRef}>
  <div className="hint" aria-hidden="true">Works with touchpad</div>
      <header className="portfolio__masthead" ref={mastheadRef}>
        <div className="masthead__left">
          <div className="masthead__line">{meta.titleLines?.[0] ?? 'Portfolio'}</div>
          <div className="masthead__line">{activeTitle || meta.titleLines?.[1] || 'Project Name'}</div>
        </div>
        <nav className="masthead__right" aria-label="Profile Links">
          {meta.links?.map((l, i) => (
            <a key={i} href={l.href || '#'} target={l.href ? '_blank' : undefined} rel={l.href ? 'noreferrer' : undefined}>
              {l.label}
            </a>
          ))}
        </nav>
      </header>

      <section
        className={"gallery gallery--hero"}
        aria-label="Project Gallery"
        ref={(el) => setGalleryEl(el)}
        onWheel={(e) => {
          if (!galleryEl) return
          if (e.ctrlKey) return
          // Normalize like the effect above
          const mode = e.deltaMode // 0=pixel, 1=line, 2=page
          const factor = mode === 1 ? 16 : mode === 2 ? window.innerHeight : 1
          const dx = e.deltaX * factor
          const dy = e.deltaY * factor
          if (Math.abs(dy) > Math.abs(dx)) {
            galleryEl.scrollLeft += dy * WHEEL_MULTIPLIER
            e.preventDefault()
          }
        }}
        onMouseDown={(e) => {
          if (!galleryEl) return
          setDragging(true)
          setStartX(e.pageX - galleryEl.offsetLeft)
          setScrollStart(galleryEl.scrollLeft)
        }}
        onMouseLeave={() => setDragging(false)}
        onMouseUp={() => setDragging(false)}
        onMouseMove={(e) => {
          if (!dragging || !galleryEl) return
          e.preventDefault()
          const x = e.pageX - galleryEl.offsetLeft
          const walk = (x - startX) * 1 // multiplier controls speed
          galleryEl.scrollLeft = scrollStart - walk
        }}
      >
        <ul className="gallery__track">
          {projects.map((p, idx) => (
            <li
              key={p.id}
              className="gallery__item"
              data-title={p.title}
              onMouseEnter={() => { setHovering(true); setActiveTitle(p.title) }}
              onMouseLeave={() => { setHovering(false) }}
              onFocus={() => { setHovering(true); setActiveTitle(p.title) }}
              onBlur={() => { setHovering(false) }}
            >
              <figure className="frame">
                <a href={p.href || '#'} target={p.href ? '_blank' : undefined} rel={p.href ? 'noreferrer' : undefined}>
                  <img src={p.image} alt={p.title} className="frame__image" loading="lazy" />
                </a>
                <figcaption className="frame__caption">{p.title}</figcaption>
              </figure>
              {idx < projects.length - 1 && <span className="dot" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      </section>
      <div className="gallery-scrollbar" aria-hidden="true" ref={setScrollbarEl}>
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
    </main>
  )
}
