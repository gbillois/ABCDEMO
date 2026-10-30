# Icônes gravées du grimoire (32×32, encre = currentColor). Sortie : bloc <svg> de symboles.
I = {
"dragon": "<path class='f' d='M4 27C5 19 9 14 15 12.5c4-1 8-1.5 11 .5 3 2 4 5 2 7l-5 1c-2 0-4 1-5 3l-1 3'/><path class='f' d='M15 12.5C13 8 13 5 10 2.5c5 1 8 4 9 9.5M21 11.5c1-4 3-6.5 7-8-1 3-2 6-3 8.5'/><path d='M28 20c-3-1-6-1-8 .5'/><path d='M19.5 15.6q2.2-1.6 4.4 0'/><circle cx='21.7' cy='15.9' r='1.1' fill='currentColor'/><circle cx='27' cy='16.4' r='.6' fill='currentColor'/><path class='h' d='M7 23c2-3 4-5 7-6M10 25c2-3 3-4 6-5M6 19c1-2 3-4 5-5'/>",
"engrenage": "<path class='f' d='M20.1 12.5 L22.3 14.2 L21.9 15.9 L19.1 16.3 L18.3 17.4 L18.9 20.2 L17.5 21.2 L15.1 19.6 L13.8 20.0 L12.5 22.5 L10.8 22.3 L9.9 19.6 L8.7 19.1 L6.1 20.2 L4.8 18.9 L5.9 16.3 L5.4 15.1 L2.7 14.2 L2.5 12.5 L5.0 11.2 L5.4 9.9 L3.8 7.5 L4.8 6.1 L7.6 6.7 L8.7 5.9 L9.1 3.1 L10.8 2.7 L12.5 4.9 L13.8 5.0 L15.9 3.1 L17.5 3.8 L17.4 6.7 L18.3 7.6 L21.2 7.5 L21.9 9.1 L20.0 11.2Z'/><circle cx='12.5' cy='12.5' r='4'/><circle cx='12.5' cy='12.5' r='1.4' fill='currentColor'/><path class='f' d='M27.9 23.5 L29.7 24.9 L29.3 26.3 L26.9 26.2 L26.2 26.9 L26.3 29.3 L24.9 29.7 L23.5 27.9 L22.5 27.8 L20.7 29.3 L19.5 28.5 L20.1 26.2 L19.5 25.4 L17.3 24.9 L17.1 23.5 L19.2 22.5 L19.5 21.6 L18.5 19.5 L19.5 18.5 L21.6 19.5 L22.5 19.2 L23.5 17.1 L24.9 17.3 L25.4 19.5 L26.2 20.1 L28.5 19.5 L29.3 20.7 L27.8 22.5Z'/><circle cx='23.5' cy='23.5' r='1.6'/>",
"maj": "<path d='M25 12a10 10 0 0 0-17-3l-2 2'/><path d='M5 6v5h5'/><path d='M7 20a10 10 0 0 0 17 3l2-2'/><path d='M27 26v-5h-5'/>",
"maison": "<path d='M2 17 16 5l14 12'/><path d='M13 6l-3-4M19 6l3-4'/><path d='M6 14v13h20V14'/><path d='M13 27v-7h6v7'/><path class='h' d='M8 18h3M21 18h3M8 22h3M21 22h3'/>",
"rouleau": "<path d='M9 6h16a3 3 0 0 1 0 6h-2v14a3 3 0 0 1-3 3H6a3 3 0 0 1 0-6h3z'/><path d='M23 12V9'/><path d='M9 23v3a3 3 0 0 1-3 3'/><path class='h' d='M12 12h8M12 16h8M12 20h6'/>",
"longuevue": "<path d='M4 21 22 8l3 4L7 25z'/><path d='M22 8l3-2 3 4-3 2'/><path d='M11 18l3 4'/><path d='M8 28l4-5 4 5'/>",
"cor": "<path d='M4 9c9 0 18 5 23 16l-4 2C19 18 12 14 4 14z'/><path d='M4 9v5'/><path d='M10 9.6v4.6M16 11.5l-1.5 4.4'/><path class='h' d='M8 6c2-1 4-1 6 0'/>",
"muet": "<path d='M4 9c9 0 18 5 23 16l-4 2C19 18 12 14 4 14z'/><path d='M4 9v5'/><path d='M18 3l10 10M28 3 18 13' stroke-width='2.4'/>",
"lyre": "<path d='M9 27h14'/><path d='M10 27C6 20 5 12 8 5c2 3 4 4 5 4M22 27c4-7 5-15 2-22-2 3-4 4-5 4'/><path d='M9 9h14'/><path d='M13 9v15M16 9v15M19 9v15'/>",
"cadenas": "<rect x='7' y='14' width='18' height='14' rx='2'/><path d='M11 14V9a5 5 0 0 1 10 0v5'/><circle cx='16' cy='20' r='2' fill='currentColor'/><path d='M16 22v3'/>",
"fleches": "<path d='M16 3v26'/><path d='M10 9l6-6 6 6M10 23l6 6 6-6'/>",
"sablier": "<path d='M7 3h18M7 29h18'/><path d='M9 3c0 8 7 9 7 13s-7 5-7 13M23 3c0 8-7 9-7 13s7 5 7 13'/><path class='h' d='M12 26c2-2 6-2 8 0M13 9h6'/>",
"pause": "<rect x='8' y='6' width='5' height='20' rx='1.5' fill='currentColor'/><rect x='19' y='6' width='5' height='20' rx='1.5' fill='currentColor'/>",
"viser": "<circle cx='16' cy='16' r='10'/><circle cx='16' cy='16' r='3' fill='currentColor'/><path d='M16 2v6M16 24v6M2 16h6M24 16h6'/>",
"croix": "<path d='M16 3v26M3 16h26'/><path d='M12 7l4-4 4 4M12 25l4 4 4-4M7 12l-4 4 4 4M25 12l4 4-4 4'/>",
"aile": "<path class='f' d='M4 26C6 18 8 12 10 6c6-1 13-1 19-2-2 4-3 6-2 9-3 0-5 1-5 4-3 0-5 2-5 5-4-1-9 1-13 4z'/><path d='M10 6l17 7M10 6l12 11M10 6l7 16'/>",
"feu": "<path d='M16 29c-6 0-10-4-10-9 0-6 5-8 6-14 3 2 4 5 4 8 1-2 3-3 3-6 4 3 7 8 7 12 0 5-4 9-10 9z'/><path d='M16 29c-3 0-5-2-5-5 0-3 3-4 4-7 2 2 6 4 6 7 0 3-2 5-5 5z'/>",
"atterrir": "<path d='M16 3v15'/><path d='M10 12l6 6 6-6'/><path d='M3 26h26'/><path class='h' d='M7 29h4M14 29h4M21 29h4'/>",
"saut": "<path d='M5 27c3-10 8-17 17-20'/><path d='M15 6l7 1-2 7'/><path d='M3 29h10'/>",
"anneau": "<ellipse cx='16' cy='16' rx='12' ry='12'/><ellipse cx='16' cy='16' rx='7.5' ry='7.5'/><path class='h' d='M8 9l2 2M23 22l2 2M24 9l-2 2'/>",
"poisson": "<path d='M3 16c5-7 13-8 19-2l7-5v14l-7-5c-6 6-14 5-19-2z'/><circle cx='9' cy='14.5' r='1.4' fill='currentColor'/><path class='h' d='M14 12c1 3 1 5 0 8M18 13c1 2 1 4 0 6'/>",
"nid": "<path d='M3 18c2 8 24 8 26 0'/><path d='M4 21c7 3 17 3 24 0M6 25c6 2 14 2 20 0'/><ellipse cx='11' cy='15' rx='3.2' ry='4'/><ellipse cx='17' cy='13' rx='3.2' ry='4.2'/><ellipse cx='22.5' cy='15.5' rx='3' ry='3.8'/>",
"phare": "<path d='M12 29 13 11h6l1 18'/><path d='M11 11h10M12 11V7h8v4M14 7l2-3 2 3'/><path d='M9 29h14'/><path class='h' d='M13 17h6M12.5 23h7'/><path d='M5 6l6 2M27 6l-6 2'/>",
"village": "<path d='M2 20 9 13l7 7M5 18v10h8V18'/><path d='M14 16 21 8l9 9M17 13v15h11V14'/><path d='M21 28v-5h3v5'/><path d='M2 28h28'/>",
"pic": "<path d='M2 28 12 12l4 6 3-5 11 15z'/><path class='h' d='M10 18l2 3M18 17l3 4'/><path d='M19 11c-2 0-3-2-3-3 0-2 2-3 2-5 2 1 4 3 4 5 0 2-1 3-3 3z'/>",
"fermer": "<path d='M7 7l18 18M25 7 7 25' stroke-width='3'/>",
"rejouer": "<path d='M26 16a10 10 0 1 1-4-8'/><path d='M23 3v6h-6' stroke-width='2.2'/>",
"jouer": "<path d='M10 6v20l16-10z' fill='currentColor'/>",
"oeil": "<path d='M2 16c4-6 9-9 14-9s10 3 14 9c-4 6-9 9-14 9S6 22 2 16z'/><circle cx='16' cy='16' r='5'/><circle cx='16' cy='16' r='2' fill='currentColor'/>",
"livre": "<path class='f' d='M5 6c4-2 8-2 11 1v20c-3-3-7-3-11-1z'/><path class='f' d='M27 6c-4-2-8-2-11 1v20c3-3 7-3 11-1z'/><path class='h' d='M8 11c2-1 4-1 6 0M8 15c2-1 4-1 6 0M18 11c2-1 4-1 6 0M18 15c2-1 4-1 6 0'/>",
"envoyer": "<path d='M16 20V4'/><path d='M10 10l6-6 6 6'/><path d='M5 18v8h22v-8'/>",
"recevoir": "<path d='M16 4v16'/><path d='M10 14l6 6 6-6'/><path d='M5 18v8h22v-8'/>",
"poubelle": "<path d='M6 9h20M13 9V5h6v4'/><path class='f' d='M8 9l2 18h12l2-18'/><path class='h' d='M13 13v10M19 13v10'/>",
"joueurs": "<circle cx='11' cy='11' r='4.5'/><path d='M3 27c0-6 4-9 8-9s8 3 8 9'/><circle cx='22' cy='9' r='3.6'/><path d='M19 16c1-1 2-1.5 3-1.5 3.5 0 7 2.5 7 8'/><path d='M7 7l-2-4M15 7l2-4'/>",
"plus": "<path d='M16 5v22M5 16h22' stroke-width='3'/>",
"bulle": "<path class='f' d='M5 7h22v14H14l-6 5v-5H5z'/><path class='h' d='M9 12h14M9 16h10'/>",
"courbe": "<path d='M3 25c5-14 13-19 26-18'/><path d='M23 3l6 4-5 5'/><path d='M3 29h26' class='h'/>",
}
def sprite():
    out = ["<svg class='defs' aria-hidden='true'>"]
    for k, v in I.items():
        out.append(f"<symbol id='i-{k}' viewBox='0 0 32 32' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'>{v}</symbol>")
    out.append("</svg>")
    return "".join(out)
if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["planche"]:
        print("<!doctype html><meta charset=utf-8><style>body{background:#efe0bc;margin:8px;display:flex;flex-wrap:wrap;gap:10px;font:12px sans-serif;color:#3a1e08} div{width:84px;text-align:center} svg.i{width:64px;height:64px} .h{stroke-width:1.1;opacity:.7} .f{fill:currentColor;fill-opacity:.14} .defs{position:absolute;width:0;height:0}</style>" + sprite())
        for k in I: print(f"<div><svg class='i'><use href='#i-{k}'/></svg><br>{k}</div>")
    else: print(sprite())
