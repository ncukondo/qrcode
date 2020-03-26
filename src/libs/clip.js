export const copyToClip = (text) => {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  if (ta.parentElement) ta.parentElement.removeChild(ta);
};

export const copyHtmlToClip = (html) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  const range = document.createRange();
  range.selectNode(el);

  const selection = getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  document.execCommand('copy');

  selection.removeAllRanges();
  document.execCommand('copy');
  if (el.parentElement) el.parentElement.removeChild(el);
};

export const copyFromClip = () => {
  const ta = document.createElement('textarea');
  document.body.appendChild(ta);
  document.execCommand('paste');
  return ta.value;
};