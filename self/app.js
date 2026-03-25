const $ = s => document.querySelector(s)
const $$ = s => Array.from(document.querySelectorAll(s))

const views = {
  resume: $('#resume'),
  portfolio: $('#portfolio'),
  contact: $('#contact'),
  detail: $('#detail')
}

const titles = {
  resume: 'RESUME',
  portfolio: 'PROJECTS',
  contact: 'CONTACT',
  detail: 'PROJECTS'
}

function show(view){
  $$('.view').forEach(v=>v.classList.remove('active'))
  views[view].classList.add('active')
  $$('.tab').forEach(t=>t.classList.toggle('active', t.dataset.view===view))
  
  // Update header title
  const header = $('.top')
  if(header) {
    header.setAttribute('data-title', titles[view] || 'RESUME')
  }
}

$$('.tab').forEach(b=>{
  b.addEventListener('click',()=>{
    const v = b.dataset.view
    show(v)
  })
})

const portfolioMap = {
  'user-research': {title:'市场与用户研究'},
  'prompt-gen': {
    title:'自动化prompt生成',
    links: [
      {text: '产品使用展示视频', url: 'https://www.bilibili.com/video/BV1WdwRznEW8/?spm_id_from=333.1387.homepage.video_card.click&vd_source=d5b9eb7826030b0bff33bf09dd8c9fb7'}
    ]
  },
  'gender': {title:'性别研究'},
  'adhd': {
    title:'ADHD AI教练（FocusPal）',
    links: [
      {text: '技术说明文档', url: 'https://modelscope.cn/learn/5848#4ever-bi-168'},
      {text: '产品试用链接', url: 'https://focuspal-ten.vercel.app/dashboard'}
    ]
  },
  'echomap': {title:'防性骚扰地图（EchoMap）'},
  'aging': {title:'老龄化与公共卫生'},
  'comic': {title:'漫画项目'}
}

const SLIDES = {}

function renderSlides(slots=8, imgs){
  const slides = $('#slides')
  slides.innerHTML = ''
  if(Array.isArray(imgs) && imgs.length){
    imgs.forEach(src=>{
      const card = document.createElement('div')
      card.className = 'card'
      const img = document.createElement('img')
      img.src = src
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'cover'
      img.style.borderRadius = '14px'
      card.appendChild(img)
      slides.appendChild(card)
    })
  } else {
    for(let i=0;i<slots;i++){
      const card = document.createElement('div')
      card.className = 'card'
      card.style.background = `linear-gradient(135deg, rgba(255,255,255,.24), rgba(255,255,255,.08))`
      slides.appendChild(card)
    }
  }
}

const PDF_FILES = {
  'prompt-gen': 'self_project/prompt.pdf',
  'adhd': 'self_project/FocusPal .pdf',
  'user-research': 'self_project/AIPI IP.pdf',
  'echomap': 'self_project/Echo Map.pdf',
  'gender': 'self_project/gender content.pdf',
  'aging': 'self_project/aging content.pdf'
}

const MASTER_PDF_PATH = 'self_project/master.pdf';
const DANMEI_PDF_PATH = 'self_project/danmei.pdf';
const FEMALE_ORIENTED_PDF_PATH = 'self_project/female oriented.pdf';
const GAP_PDF_PATH = 'self_project/gap.pdf';
const RP_PDF_PATH = 'self_project/rp.pdf';

async function openPDFViewer(pdfPath) {
  const startTime = performance.now();
  let overlay = $('.fullscreen-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'fullscreen-overlay';
    document.body.appendChild(overlay);
  }

  // Reset overlay for PDF Reader Mode
  overlay.innerHTML = '<button class="fullscreen-close" aria-label="Exit Fullscreen">&times;</button>';
  overlay.classList.add('active', 'pdf-reader-mode');
  
  const closeBtn = overlay.querySelector('.fullscreen-close');
  const closeOverlay = () => {
    const exitTime = performance.now();
    // Log session duration
    console.log(`PDF Viewer Session Duration: ${(exitTime - startTime).toFixed(2)}ms`);
    
    overlay.classList.remove('active', 'pdf-reader-mode');
    overlay.innerHTML = ''; // Clear memory
    
    // Log exit performance
    const exitDuration = performance.now() - exitTime;
    console.log(`Exit Animation/Cleanup: ${exitDuration.toFixed(2)}ms`);
    
    // Report metrics if supported
    if (window.performance && window.performance.mark) {
      window.performance.mark('pdf_viewer_exit');
    }
  };
  
  closeBtn.addEventListener('click', closeOverlay);
  
  // Add ESC listener specific to this mode
  const escHandler = (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('pdf-reader-mode')) {
      closeOverlay();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Loading UI
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'pdf-loading';
  loadingDiv.textContent = 'Loading Document...';
  overlay.appendChild(loadingDiv);

  try {
    const loadingTask = pdfjsLib.getDocument(pdfPath);
    const pdf = await loadingTask.promise;
    
    // Remove loading
    if(loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
    
    const container = document.createElement('div');
    container.className = 'pdf-container';
    overlay.appendChild(container);

    // Render pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Calculate scale to fit width minus minimal padding (if any)
      // Use window.innerWidth to determine available space
      // Keep original aspect ratio and margins
      const viewport_raw = page.getViewport({ scale: 1.0 });
      const availableWidth = window.innerWidth;
      
      // Determine scale based on width, but don't force a specific max-width container
      // If the PDF is wider than screen, fit to screen. 
      // If narrower, we can use a higher scale for quality or 1.0 if desired.
      // Here we aim for "fit width" behavior similar to Acrobat
      let scale = availableWidth / viewport_raw.width;
      
      // Limit maximum scale to avoid pixelation or excessive scrolling on large screens if desired
      // But user request is "strictly respect original margins" which implies
      // we should just show the full page content scaled to fit the view.
      
      // Let's refine scale: if it's a very large screen, maybe don't explode the PDF.
      // However, "fit width" is standard.
      // To ensure high quality rendering on high DPI screens:
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Adjust scale for visual size
      // We'll use a slightly smaller scale to leave a tiny bit of breathing room if it's full width
      // Or exactly full width if requested. 
      // "Strictly according to original PDF margins" -> The PDF itself has margins. 
      // We should render the full crop box.
      
      const viewport = page.getViewport({ scale: scale });
      
      const canvas = document.createElement('canvas');
      canvas.className = 'pdf-page';
      
      // Set canvas dimensions for high DPI
      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      
      // Style dimensions
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      
      container.appendChild(canvas);
      
      // Render page
      await page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: page.getViewport({ scale: scale * pixelRatio })
      }).promise;
      
      if (pageNum === 1) {
        const firstPaintTime = performance.now() - startTime;
        console.log(`PDF First Paint: ${firstPaintTime.toFixed(2)}ms`);
        if (window.performance && window.performance.mark) {
            window.performance.mark('pdf_first_paint');
        }
      }
    }
    
    console.log(`PDF Full Load Success: ${pdf.numPages} pages`);

  } catch (error) {
    console.error('PDF Load Error:', error);
    if(loadingDiv.parentNode) loadingDiv.parentNode.removeChild(loadingDiv);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'pdf-error';
    errorDiv.innerHTML = `
      <h3>Unable to load document</h3>
      <p>${error.message}</p>
      <div class="pdf-actions">
        <button class="btn btn-primary" id="retry-pdf">Retry / 重试</button>
        <a href="${pdfPath}" download class="btn btn-outline">Download / 下载</a>
      </div>
    `;
    overlay.appendChild(errorDiv);
    
    const retryBtn = document.getElementById('retry-pdf');
    if(retryBtn) {
        retryBtn.addEventListener('click', () => {
            overlay.classList.remove('active', 'pdf-reader-mode');
            overlay.innerHTML = '';
            setTimeout(() => openPDFViewer(pdfPath), 100);
        });
    }
  }
}

// Deprecated: openMasterPDF is now replaced by generic openPDFViewer
async function openMasterPDF() {
  return openPDFViewer(MASTER_PDF_PATH);
}

async function renderPDF(url) {
  if (typeof pdfjsLib === 'undefined') {
    toast('PDF 组件加载失败，请检查网络');
    return;
  }
  const slides = $('#slides')
  slides.innerHTML = ''
  
  try {
    const loadingTask = pdfjsLib.getDocument(url);
    const pdf = await loadingTask.promise;
    console.log(`PDF Loaded: ${url}, Pages: ${pdf.numPages}`);
    
    const report = [];

    // Create fullscreen overlay
    let overlay = $('.fullscreen-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'fullscreen-overlay';
      overlay.innerHTML = '<div class="fullscreen-close">&times;</div>';
      document.body.appendChild(overlay);
    
      const closeOverlay = () => {
        overlay.classList.remove('active', 'pdf-reader-mode');
        overlay.innerHTML = '<div class="fullscreen-close">&times;</div>'; 
        // Re-bind close event after clearing innerHTML
        overlay.querySelector('.fullscreen-close').addEventListener('click', closeOverlay);
      };

      overlay.querySelector('.fullscreen-close').addEventListener('click', closeOverlay);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
          closeOverlay();
        }
      });
    }

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const startTime = performance.now();
      const page = await pdf.getPage(pageNum);
      
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.justifyContent = 'center';
      card.style.alignItems = 'center';
      card.style.padding = '0';
      card.style.overflow = 'hidden';
      card.style.background = '#fff'; 
      
      const canvas = document.createElement('canvas');
      card.appendChild(canvas);
      slides.appendChild(card);
      
      // Click to zoom
      canvas.addEventListener('click', () => {
        if (url === PDF_FILES['gender']) {
            if (pageNum === 1) {
                openMasterPDF();
                return;
            } else if (pageNum === 2) {
                openPDFViewer(DANMEI_PDF_PATH);
                return;
            } else if (pageNum === 3) {
                 openPDFViewer(FEMALE_ORIENTED_PDF_PATH);
                 return;
             }
         } else if (url === PDF_FILES['aging']) {
             if (pageNum === 1) {
                 openPDFViewer(GAP_PDF_PATH);
                 return;
             } else if (pageNum === 2) {
                 openPDFViewer(RP_PDF_PATH);
                 return;
             }
         }
         // Generic fullscreen logic for other pages
        const overlay = $('.fullscreen-overlay');
        
        // Reset overlay content for image mode
        overlay.classList.remove('pdf-reader-mode');
        overlay.innerHTML = '<div class="fullscreen-close">&times;</div>';
        
        const clonedCanvas = document.createElement('canvas');
        clonedCanvas.width = canvas.width;
        clonedCanvas.height = canvas.height;
        clonedCanvas.getContext('2d').drawImage(canvas, 0, 0);
        
        // Append elements
        const closeBtn = overlay.querySelector('.fullscreen-close');
        overlay.appendChild(clonedCanvas);
        
        overlay.classList.add('active');
        
        // Re-bind close event for the button (since we cleared innerHTML)
        const closeOverlay = () => {
          overlay.classList.remove('active');
          overlay.innerHTML = '<div class="fullscreen-close">&times;</div>';
          overlay.querySelector('.fullscreen-close').addEventListener('click', closeOverlay);
        };
        closeBtn.addEventListener('click', closeOverlay);
      });

      const scale = 2.0; // High quality scale
      const viewport = page.getViewport({ scale: scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
      canvas.style.display = 'block';

      const renderContext = {
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      };
      await page.render(renderContext).promise;
      
      const endTime = performance.now();
      const timeTaken = (endTime - startTime).toFixed(2);
      console.log(`Page ${pageNum} Rendered: ${viewport.width}x${viewport.height}, Scale: ${scale}, Time: ${timeTaken}ms`);
      
      report.push({
        Page: pageNum,
        Width: viewport.width,
        Height: viewport.height,
        Scale: scale,
        Time_ms: timeTaken
      });
    }
    console.table(report);
    toast(`PDF 加载完成，共 ${pdf.numPages} 页`);
  } catch (error) {
    console.error('Error rendering PDF:', error);
    toast('PDF 加载失败: ' + error.message);
  }
}

$$('.link').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const key = btn.dataset.detail
    const meta = portfolioMap[key] || {title:'详情'}
    $('#detail-title').textContent = meta.title
    
    // Render links
    const linksContainer = $('#detail-links')
    if(linksContainer) {
      linksContainer.innerHTML = ''
      if(meta.links && meta.links.length){
        meta.links.forEach(link => {
          const a = document.createElement('a')
          a.href = link.url
          a.textContent = link.text
          a.className = 'detail-link'
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          linksContainer.appendChild(a)
        })
      }
    }
    
    if (PDF_FILES[key]) {
      renderPDF(PDF_FILES[key]);
    } else {
      renderSlides(8, SLIDES[key]);
    }
    show('detail')
  })
})
function toast(msg){
  const t = $('#toast')
  if(!t) return
  t.textContent = msg
  t.classList.add('show')
  // 无障碍：触发 aria-live
  t.setAttribute('aria-live', 'polite')
  t.setAttribute('aria-atomic', 'true')
  setTimeout(()=>t.classList.remove('show'), 2000)
}

// Clipboard helper with secure + fallback
async function copyTextSafe(text){
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly','')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand && document.execCommand('copy')
    document.body.removeChild(ta)
    return !!ok
  }catch(e){
    console.warn('Copy failed', e)
    return false
  }
}

show('resume')

// Collapsible Text Toggle
$$('.read-more-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('aria-controls')
    const content = document.getElementById(targetId)
    
    if (content) {
      const isCollapsed = content.classList.contains('collapsed')
      
      if (isCollapsed) {
        content.classList.remove('collapsed')
        btn.setAttribute('aria-expanded', 'true')
        btn.querySelector('span').textContent = '收起'
        btn.querySelector('svg').style.transform = 'rotate(180deg)'
      } else {
        content.classList.add('collapsed')
        btn.setAttribute('aria-expanded', 'false')
        btn.querySelector('span').textContent = '阅读更多'
        btn.querySelector('svg').style.transform = 'rotate(0deg)'
      }
    }
})
})

// Resume Header Emphasis A/B Test (desktop & mobile)
;(function setupResumeABTest(){
  try{
    const isMobile = window.matchMedia('(max-width: 640px)').matches
    const VAR_KEY = 'ab_resume_emphasis_variant'
    const DATA_KEY = 'ab_resume_results'
    let variant = localStorage.getItem(VAR_KEY)
    if(!variant){
      variant = Math.random() < 0.5 ? 'a' : 'b'
      localStorage.setItem(VAR_KEY, variant)
    }
    document.body.classList.toggle('ab-variant-a', variant==='a')
    document.body.classList.toggle('ab-variant-b', variant==='b')

    const headers = $$('.resume-header')
    if(!headers.length) return

    const start = performance.now()
    let captured = false

    const record = (source)=>{
      if(captured) return
      captured = true
      const t = performance.now() - start
      const success = t <= 3000
      const payload = {
        t: Math.round(t),
        success,
        variant,
        device: isMobile ? 'mobile' : 'desktop',
        ts: Date.now(),
        source
      }
      const arr = JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
      arr.push(payload)
      localStorage.setItem(DATA_KEY, JSON.stringify(arr))
      console.log('[AB][Resume]', payload)
    }

    const timer = setTimeout(()=>record('timeout'), 3000)

    headers.forEach(h=>{
      h.addEventListener('mouseenter', ()=>record('mouseenter'), { once: true })
      h.addEventListener('focusin', ()=>record('focusin'), { once: true })
      h.addEventListener('touchstart', ()=>record('touchstart'), { once: true, passive: true })
    })

    window.__ABResumeReport = ()=>{
      const arr = JSON.parse(localStorage.getItem(DATA_KEY) || '[]')
      const agg = {}
      arr.forEach(r=>{
        const k = `${r.device}-${r.variant}`
        if(!agg[k]) agg[k] = { total:0, success:0, times:[] }
        agg[k].total++
        if(r.success) agg[k].success++
        agg[k].times.push(r.t)
      })
      Object.entries(agg).forEach(([k,v])=>{
        const rate = v.success / v.total * 100
        const sorted = v.times.slice().sort((a,b)=>a-b)
        const median = sorted.length ? sorted[Math.floor(sorted.length/2)] : 0
        console.log(`${k}: ${v.success}/${v.total} (${rate.toFixed(1)}%), median ${median}ms`)
      })
      return agg
    }
    window.__ABResumeReset = ()=> localStorage.removeItem(DATA_KEY)
  }catch(e){ console.warn('AB setup failed', e) }
})()

// Visual alignment verifier (no DOM changes)
window.__verifyHonorAlign = () => {
  const honor = document.querySelector('.resume-honor')
  const proj = document.querySelector('.resume-sub-project-title')
  if(!honor || !proj){ console.warn('target(s) not found'); return }
  const a = honor.getBoundingClientRect().left
  const b = proj.getBoundingClientRect().left
  const diff = Math.round((a - b) * 100) / 100
  console.log(`[verify] honor left=${a.toFixed(2)} | project left=${b.toFixed(2)} | diff=${diff}px`)
  return diff
}

// Contact page: copy-on-click for email and phone cards
;(function setupContactCopyCards(){
  try{
    const bind = (selector, value, successMsg)=>{
      const el = document.querySelector(selector)
      if(!el) return
      let locked = false
      const handler = async (e)=>{
        e.preventDefault()
        if(locked) return
        locked = true
        const toCopy = el.dataset.copy || value
        const ok = await copyTextSafe(toCopy)
        toast(ok ? successMsg : '复制失败，请手动复制或检查权限')
        setTimeout(()=> locked = false, 800)
      }
      el.addEventListener('click', handler, { capture: true })
      el.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter' || e.key === ' '){ handler(e) }
      })
    }
    bind('.email-card', 'zhangyue20211@outlook.com', '邮箱已复制')
    bind('.phone-card', '13994360028', '手机号已复制')
  }catch(e){ console.warn('contact copy setup failed', e) }
})()
