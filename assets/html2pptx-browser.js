(function(global){
  'use strict';

  const PX_PER_IN = 96;
  const PT_PER_PX = 0.75;
  const SLIDE_W = 1280;
  const SLIDE_H = 720;
  const DEFAULT_CAPTURE_TIMEOUT_MS = 30000;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (n,min,max) => Math.max(min, Math.min(max, n));
  const inch = px => px / PX_PER_IN;
  const pt = px => px * PT_PER_PX;
  const cleanText = s => String(s || '').replace(/[ \t\r\f]+/g, ' ').replace(/\n\s+/g, '\n').replace(/\s+\n/g, '\n').trim();
  function withTimeout(promise, ms, label){
    let timer;
    return Promise.race([
      Promise.resolve(promise).finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + ' (timeout ' + Math.round(ms / 1000) + 's)')), ms);
      })
    ]);
  }

  function parseColor(str, win){
    if(!str || str === 'transparent' || str === 'none') return null;
    let m = String(str).match(/rgba?\(([^)]+)\)/i);
    if(m){
      const p = m[1].split(',').map(x => parseFloat(x));
      return {r:p[0], g:p[1], b:p[2], a:p[3] == null ? 1 : p[3]};
    }
    m = String(str).match(/#([0-9a-f]{3,8})/i);
    if(m){
      let x = m[1];
      if(x.length === 3) x = x.split('').map(c => c + c).join('');
      return {r:parseInt(x.slice(0,2),16), g:parseInt(x.slice(2,4),16), b:parseInt(x.slice(4,6),16), a:1};
    }
    if(win && win.document){
      const probe = win.document.createElement('span');
      probe.style.color = str;
      win.document.body.appendChild(probe);
      const resolved = win.getComputedStyle(probe).color;
      probe.remove();
      if(resolved && resolved !== str) return parseColor(resolved, null);
    }
    return null;
  }
  function hex(c){
    if(!c) return null;
    const f = n => ('0' + Math.round(clamp(n,0,255)).toString(16)).slice(-2);
    return (f(c.r) + f(c.g) + f(c.b)).toUpperCase();
  }
  function firstGradientColor(bg, win){
    const m = String(bg || '').match(/rgba?\([^)]+\)|#[0-9a-f]{3,8}/i);
    return m ? hex(parseColor(m[0], win)) : null;
  }
  function cssPx(v){
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  function fontFace(ff){
    ff = String(ff || '').toLowerCase();
    if(ff.includes('poppins')) return 'Poppins';
    if(ff.includes('orbitron')) return 'Orbitron';
    if(ff.includes('rajdhani')) return 'Rajdhani';
    if(ff.includes('fraunces')) return 'Fraunces';
    if(ff.includes('playfair')) return 'Playfair Display';
    if(ff.includes('carlito') || ff.includes('calibri')) return 'Carlito';
    if(ff.includes('mono') || ff.includes('plex')) return 'Consolas';
    if(ff.includes('inter')) return 'Inter';
    return 'Arial';
  }
  function directText(el){
    let text = '';
    el.childNodes.forEach(n => {
      if(n.nodeType === 3) text += n.textContent;
      else if(n.nodeName === 'BR') text += '\n';
    });
    return cleanText(text);
  }
  function elementText(el){
    const tag = (el.tagName || '').toLowerCase();
    let text = directText(el);
    let full = false;
    if((tag === 'li' || tag === 'a') && !text){
      text = cleanText(el.innerText || el.textContent || '');
      full = !!text;
    }
    return { text, full };
  }
  function rotationOf(cs){
    const tr = cs.transform || cs.webkitTransform || 'none';
    if(!tr || tr === 'none') return 0;
    let m = tr.match(/matrix\(([^)]+)\)/);
    if(m){
      const p = m[1].split(',').map(parseFloat);
      if(p.length >= 2) return Math.round(Math.atan2(p[1], p[0]) * 180 / Math.PI);
    }
    m = tr.match(/matrix3d\(([^)]+)\)/);
    if(m){
      const p = m[1].split(',').map(parseFloat);
      if(p.length >= 2) return Math.round(Math.atan2(p[1], p[0]) * 180 / Math.PI);
    }
    const r = tr.match(/rotate\((-?[\d.]+)deg\)/i);
    return r ? Math.round(parseFloat(r[1])) : 0;
  }
  function radiusOf(cs){
    return Math.max(
      cssPx(cs.borderTopLeftRadius),
      cssPx(cs.borderTopRightRadius),
      cssPx(cs.borderBottomRightRadius),
      cssPx(cs.borderBottomLeftRadius)
    );
  }
  function box(base, rect){
    return {
      x: Math.round(rect.left - base.left),
      y: Math.round(rect.top - base.top),
      w: Math.max(1, Math.round(rect.width)),
      h: Math.max(1, Math.round(rect.height))
    };
  }
  function validBox(o){
    return !(o.x > SLIDE_W - 1 || o.y > SLIDE_H - 1 || o.x + o.w < 1 || o.y + o.h < 1);
  }
  function alignOf(cs){
    if(cs.textAlign === 'center') return 'center';
    if(cs.textAlign === 'right' || cs.textAlign === 'end') return 'right';
    if(cs.textAlign === 'justify') return 'justify';
    return 'left';
  }
  function valignOf(cs){
    if(cs.alignItems === 'center' || cs.verticalAlign === 'middle') return 'mid';
    if(cs.alignItems === 'flex-end' || cs.verticalAlign === 'bottom') return 'bottom';
    return 'top';
  }
  function hasTextChild(el){
    return Array.from(el.children).some(c => cleanText(c.innerText || c.textContent || ''));
  }
  function isHidden(cs){
    return cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') === 0;
  }
  function isDecorativeOnly(el){
    const tag = (el.tagName || '').toLowerCase();
    return ['script','style','link','meta','head','iframe','video','audio'].includes(tag);
  }

  async function screenshot(win, el, b, images, opts){
    opts = opts || {};
    const hidden = [];
    let ownTextStyle = null;
    if(opts.hideChildren){
      Array.from(el.children).forEach(c => {
        hidden.push([c, c.style.visibility]);
        c.style.visibility = 'hidden';
      });
      if(directText(el)){
        ownTextStyle = [el.style.color, el.style.webkitTextFillColor, el.style.textShadow];
        el.style.setProperty('color','transparent','important');
        el.style.setProperty('-webkit-text-fill-color','transparent','important');
        el.style.setProperty('text-shadow','none','important');
      }
    }
    try{
      if(typeof win.html2canvas !== 'function') throw new Error('html2canvas is not available in export frame');
      const canvas = await withTimeout(win.html2canvas(el, {
        backgroundColor: null,
        scale: opts.scale || 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: Math.max(1, Math.round(b.w)),
        height: Math.max(1, Math.round(b.h)),
        windowWidth: SLIDE_W,
        windowHeight: SLIDE_H
      }), opts.captureTimeoutMs || DEFAULT_CAPTURE_TIMEOUT_MS, 'html2canvas capture too slow');
      const id = images.length;
      images.push(canvas.toDataURL(opts.jpeg ? 'image/jpeg' : 'image/png', 0.95));
      return id;
    } finally {
      if(ownTextStyle){
        el.style.color = ownTextStyle[0];
        el.style.webkitTextFillColor = ownTextStyle[1];
        el.style.textShadow = ownTextStyle[2];
      }
      hidden.forEach(([node, value]) => { node.style.visibility = value; });
    }
  }

  function textItem(win, el, cs, b){
    const tx = elementText(el);
    if(!tx.text) return null;
    let color;
    const clip = cs.webkitBackgroundClip || cs.backgroundClip || '';
    const fill = parseColor(cs.webkitTextFillColor || cs.color, win);
    if(/text/i.test(clip) || (fill && fill.a === 0)){
      color = firstGradientColor(cs.backgroundImage, win) || hex(parseColor(cs.color, win)) || '333333';
    } else {
      color = hex(parseColor(cs.color, win)) || '333333';
    }
    const tag = (el.tagName || '').toLowerCase();
    const item = {
      t:'text',
      ...b,
      s: tx.text,
      fz: Math.max(6, Math.round(parseFloat(cs.fontSize) || 18)),
      b: parseInt(cs.fontWeight || '400', 10) >= 600 || ['strong','b'].includes(tag),
      it: cs.fontStyle === 'italic' || tag === 'em' || tag === 'i',
      col: color,
      al: alignOf(cs),
      va: valignOf(cs),
      ff: fontFace(cs.fontFamily),
      rot: rotationOf(cs) || undefined,
      bullet: tag === 'li',
      href: tag === 'a' ? el.getAttribute('href') : null,
      strike: /line-through/.test(cs.textDecorationLine || cs.textDecoration || '')
    };
    return { item, full: tx.full };
  }

  function rectItem(win, el, cs, b, pptx){
    const bg = parseColor(cs.backgroundColor, win);
    const borderWidths = ['Top','Right','Bottom','Left'].map(s => cssPx(cs['border' + s + 'Width']));
    const borderColors = ['Top','Right','Bottom','Left'].map(s => parseColor(cs['border' + s + 'Color'], win));
    const maxBorder = Math.max.apply(null, borderWidths);
    const borderColor = borderColors.find(c => c && c.a > 0.05);
    if(!(bg && bg.a > 0.03) && !(maxBorder > 0.4 && borderColor)) return null;
    const r = radiusOf(cs);
    const shape = r > Math.min(b.w,b.h) * 0.42 && Math.abs(b.w - b.h) < 4 ? 'ellipse' : (r > 2 ? 'roundRect' : 'rect');
    const item = { t:'shape', shape, ...b };
    if(bg && bg.a > 0.03){
      item.fill = hex(bg);
      if(bg.a < 0.97) item.alpha = Math.round((1 - bg.a) * 100);
    }
    if(maxBorder > 0.4 && borderColor){
      item.line = hex(borderColor);
      item.lw = Math.max(0.5, maxBorder * 0.75);
    }
    const rot = rotationOf(cs);
    if(rot) item.rot = rot;
    return item;
  }

  function lineItem(win, el, cs, b){
    const bg = parseColor(cs.borderTopColor, win) || parseColor(cs.backgroundColor, win) || parseColor(cs.color, win);
    return { t:'line', x:b.x, y:b.y + Math.round(b.h / 2), w:b.w, h:0, col:hex(bg) || '999999', lw:Math.max(0.5, cssPx(cs.borderTopWidth) * 0.75 || Math.max(1, b.h) * 0.75) };
  }

  function tableItem(win, table, cs, b){
    const rows = Array.from(table.querySelectorAll('tr'));
    if(!rows.length) return null;
    const firstCells = Array.from(rows[0].children);
    const colW = firstCells.map(cell => inch(cell.getBoundingClientRect().width || (b.w / Math.max(1, firstCells.length))));
    const data = rows.map(row => Array.from(row.children).map(cell => {
      const ccs = win.getComputedStyle(cell);
      const bg = parseColor(ccs.backgroundColor, win);
      const fg = parseColor(ccs.color, win);
      const border = parseColor(ccs.borderTopColor, win);
      const bw = cssPx(ccs.borderTopWidth);
      const options = {
        fontFace: fontFace(ccs.fontFamily),
        fontSize: pt(parseFloat(ccs.fontSize) || 14),
        bold: parseInt(ccs.fontWeight || '400', 10) >= 600 || cell.tagName.toLowerCase() === 'th',
        color: hex(fg) || '333333',
        align: alignOf(ccs),
        valign: 'mid',
        margin: [4,6,4,6]
      };
      if(bg && bg.a > 0.03) options.fill = { color: hex(bg), transparency: bg.a < 0.97 ? Math.round((1-bg.a)*100) : 0 };
      if(border && border.a > 0.05 && bw > 0.3) options.border = { type:'solid', color:hex(border), pt:Math.max(0.25, bw * 0.75) };
      return { text: cleanText(cell.innerText || cell.textContent || ''), options };
    }));
    return { t:'table', ...b, rows:data, colW };
  }

  async function extract(root, options){
    const win = root.ownerDocument.defaultView;
    const base = root.getBoundingClientRect();
    const rootStyle = win.getComputedStyle(root);
    const bg = parseColor(rootStyle.backgroundColor, win);
    const data = { bg: bg && bg.a > 0 ? hex(bg) : 'FFFFFF', els: [], images: [], warnings: [] };
    let order = 0;

    async function emit(el){
      if(isDecorativeOnly(el)) return;
      const cs = win.getComputedStyle(el);
      if(isHidden(cs)) return;
      const rect = el.getBoundingClientRect();
      const b = box(base, rect);
      if(!validBox(b) || b.w <= 0 || b.h <= 0) return;
      const tag = (el.tagName || '').toLowerCase();

      const add = item => {
        if(!item) return;
        item._order = order++;
        const z = parseInt(cs.zIndex, 10);
        item._z = Number.isFinite(z) ? z : 0;
        data.els.push(item);
      };
      const walk = async () => {
        for(const child of Array.from(el.children)) await emit(child);
      };

      if(tag === 'table'){
        add(tableItem(win, el, cs, b));
        return;
      }
      if(tag === 'hr'){
        add(lineItem(win, el, cs, b));
        return;
      }
      if(['img','svg','canvas','iconify-icon'].includes(tag)){
        try{
          const id = await screenshot(win, el, b, data.images, { jpeg: tag === 'img' });
          const item = { t:'img', img:id, ...b };
          const rot = rotationOf(cs);
          if(rot) item.rot = rot;
          add(item);
        }catch(e){
          data.warnings.push('image capture failed: ' + (e && e.message || e));
        }
        return;
      }

      const bgImg = cs.backgroundImage || 'none';
      const hasVisualImage = /url\(/i.test(bgImg);
      const hasGradient = /gradient/i.test(bgImg);
      const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
      const filter = cs.filter || '';
      if(hasVisualImage || hasGradient || hasShadow || /blur\(/i.test(filter)){
        try{
          const id = await screenshot(win, el, b, data.images, { jpeg: hasVisualImage, hideChildren: true });
          const item = { t:'img', img:id, ...b };
          const rot = rotationOf(cs);
          if(rot) item.rot = rot;
          add(item);
        }catch(e){
          data.warnings.push('visual layer capture failed: ' + (e && e.message || e));
          add(rectItem(win, el, cs, b));
        }
        const text = textItem(win, el, cs, b);
        if(text) add(text.item);
        if(!text || !text.full) await walk();
        return;
      }

      add(rectItem(win, el, cs, b));
      const text = textItem(win, el, cs, b);
      if(text) add(text.item);
      if(!text || !text.full) await walk();
    }

    if((rootStyle.backgroundImage || 'none') !== 'none'){
      try{
        const id = await screenshot(win, root, {x:0,y:0,w:SLIDE_W,h:SLIDE_H}, data.images, { hideChildren: true });
        data.els.push({ t:'img', img:id, x:0, y:0, w:SLIDE_W, h:SLIDE_H, _z:-1, _order:order++ });
      }catch(e){
        data.warnings.push('slide background capture failed: ' + (e && e.message || e));
      }
    }
    for(const child of Array.from(root.children)) await emit(child);
    data.els.sort((a,b) => (a._z - b._z) || (a._order - b._order));
    return data;
  }

  function pptxShape(pptx, kind){
    if(kind === 'ellipse') return pptx.ShapeType.ellipse;
    if(kind === 'roundRect') return pptx.ShapeType.roundRect || pptx.ShapeType.rect;
    return pptx.ShapeType.rect;
  }
  function paint(pptx, slide, data){
    slide.background = { color:data.bg || 'FFFFFF' };
    for(const e of data.els || []){
      try{
        const box = { x:inch(e.x), y:inch(e.y), w:Math.max(0.01, inch(e.w)), h:Math.max(0.01, inch(e.h)) };
        if(e.rot) box.rotate = e.rot;
        if(e.t === 'img'){
          if(data.images[e.img]) slide.addImage({ ...box, data:data.images[e.img] });
        } else if(e.t === 'shape'){
          slide.addShape(pptxShape(pptx, e.shape), {
            ...box,
            fill: e.fill ? { color:e.fill, transparency:e.alpha || 0 } : { type:'none' },
            line: e.line ? { color:e.line, width:e.lw || 1 } : { type:'none' }
          });
        } else if(e.t === 'line'){
          slide.addShape(pptx.ShapeType.line, { x:inch(e.x), y:inch(e.y), w:inch(e.w), h:inch(e.h || 0), line:{ color:e.col || '999999', width:e.lw || 1 } });
        } else if(e.t === 'table'){
          slide.addTable(e.rows, { ...box, colW:e.colW, margin:0, autoFit:false });
        } else if(e.t === 'text'){
          const opts = {
            ...box,
            fontSize: pt(e.fz || 18),
            bold: !!e.b,
            italic: !!e.it,
            color: e.col || '333333',
            align: e.al || 'left',
            valign: e.va || 'top',
            fontFace: e.ff || 'Arial',
            margin: 0,
            fit: 'shrink'
          };
          if(e.bullet) opts.bullet = { type:'ul' };
          if(e.href) opts.hyperlink = { url:e.href, tooltip:e.href };
          if(e.strike) opts.strike = true;
          slide.addText(String(e.s || ''), opts);
        }
      }catch(err){
        data.warnings.push('paint failed: ' + (err && err.message || err));
      }
    }
  }

  async function convertSlide(root, pptx, options){
    const slide = pptx.addSlide();
    const data = await extract(root, options || {});
    paint(pptx, slide, data);
    return { slide, warnings:data.warnings || [] };
  }

  async function exportSlides(slides, options){
    options = options || {};
    const Pptx = options.PptxGenJS || global.PptxGenJS;
    if(!Pptx) throw new Error('PptxGenJS is not loaded');
    const pptx = new Pptx();
    const width = options.width || 13.333;
    const height = options.height || 7.5;
    pptx.defineLayout({ name:'HTML2PPTX_BROWSER', width, height });
    pptx.layout = 'HTML2PPTX_BROWSER';
    pptx.author = options.author || 'MagicSlider';
    pptx.subject = 'Browser HTML to PPTX export';
    const allWarnings = [];
    for(let i=0;i<slides.length;i++){
      const result = await convertSlide(slides[i], pptx, options);
      result.warnings.forEach(w => allWarnings.push('Slide ' + (i+1) + ': ' + w));
      if(options.onProgress) options.onProgress(i + 1, slides.length);
      await sleep(0);
    }
    if(options.fileName){
      await pptx.writeFile({ fileName:options.fileName });
    }
    return { pptx, warnings:allWarnings };
  }

  global.html2pptxBrowser = { exportSlides, convertSlide, _extract:extract };
})(typeof window !== 'undefined' ? window : globalThis);
