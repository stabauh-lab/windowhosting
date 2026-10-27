const adDocument = `<!doctype html><html><head><meta charset="utf-8"></head><body><script id="aclib" type="text/javascript" src="https://acscdn.com/script/aclib.js"></script><script type="text/javascript">if (window.aclib) { aclib.runAutoTag({ zoneId: 'zr65svo8oa' }); }</script></body></html>`;

export function PublicAdTag() {
  return <iframe title="Advertisement" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={adDocument} className="h-24 w-full border-0 bg-background" loading="lazy" />;
}