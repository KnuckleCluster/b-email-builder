/** Strip anything executable from HTML before it is injected into the editor canvas. */
export function sanitize(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  doc.querySelectorAll('script,iframe,object,embed,link[rel="import"],meta[http-equiv]').forEach((n) => n.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => {
      const name = a.name.toLowerCase();
      const val = a.value.trim().toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(a.name);
      else if (['href', 'src', 'action', 'formaction', 'xlink:href', 'background'].includes(name) && val.startsWith('javascript:')) el.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}
