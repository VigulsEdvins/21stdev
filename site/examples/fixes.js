/* Stand-in for the inline onsubmit="return false;" the whole websites carried: forms marked data-no-submit never leave the page. */
document.addEventListener('submit', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-no-submit')) e.preventDefault(); }, true);
