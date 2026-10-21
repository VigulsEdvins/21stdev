/**
 * STAR Accomplishment Builder & Passive Verb Linter Controller
 * Extracted from CV Craft Pro (src/utils/starEnhancer.js)
 */
(function () {
  const RULES = [
    {
      regex: /\b(?:responsible for managing|responsible for)\b/gi,
      weak: 'responsible for managing',
      replacements: ['Spearheaded', 'Architected', 'Directed', 'Orchestrated']
    },
    {
      regex: /\b(?:helped with|assisted with|assisted in)\b/gi,
      weak: 'helped with',
      replacements: ['Accelerated', 'Co-engineered', 'Collaborated to build', 'Facilitated']
    },
    {
      regex: /\b(?:worked on|worked with)\b/gi,
      weak: 'worked on',
      replacements: ['Engineered', 'Developed', 'Delivered', 'Implemented']
    },
    {
      regex: /\b(?:speeding up|sped up)\b/gi,
      weak: 'speeding up',
      replacements: ['optimizing', 'benchmarking and cutting latency in', 'streamlining']
    },
    {
      regex: /\b(?:handled|handled the)\b/gi,
      weak: 'handled',
      replacements: ['Streamlined', 'Resolved', 'Executed', 'Maintained']
    }
  ];

  const textarea = document.getElementById('bulletInput');
  const linterStatus = document.getElementById('linterStatus');
  const suggestionsBox = document.getElementById('suggestionsBox');
  const replacementsList = document.getElementById('replacementsList');
  const renderedBullet = document.getElementById('renderedBullet');
  const metricBtns = document.querySelectorAll('.metric-btn');
  const copyBtn = document.getElementById('copyBulletBtn');

  function analyzeBullet() {
    const text = textarea.value.trim();
    const detected = [];

    RULES.forEach((rule) => {
      const match = text.match(rule.regex);
      if (match) {
        detected.push({
          matchedPhrase: match[0],
          weak: rule.weak,
          replacements: rule.replacements,
          regex: rule.regex
        });
      }
    });

    if (detected.length === 0) {
      linterStatus.textContent = '✓ 100% Executive Power Verbs';
      linterStatus.classList.add('green');
      suggestionsBox.classList.add('is-clean');
      replacementsList.innerHTML = '<span style="font-size:11.5px; color:#a7f3d0;">No weak or passive phrases detected. This bullet demonstrates strong STAR methodology leadership!</span>';
    } else {
      linterStatus.textContent = `${detected.length} Weak Verb${detected.length > 1 ? 's' : ''} Detected`;
      linterStatus.classList.remove('green');
      suggestionsBox.classList.remove('is-clean');
      replacementsList.innerHTML = '';

      detected.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'replacement-row';

        const weakSpan = document.createElement('span');
        weakSpan.className = 'weak-phrase';
        weakSpan.textContent = `"${item.matchedPhrase}"`;

        const arrow = document.createElement('span');
        arrow.className = 'arrow';
        arrow.textContent = '→';

        const optDiv = document.createElement('div');
        optDiv.className = 'replacement-options';

        item.replacements.forEach((rep) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'verb-chip';
          chip.textContent = rep;
          chip.addEventListener('click', () => {
            textarea.value = textarea.value.replace(item.regex, rep);
            analyzeBullet();
          });
          optDiv.appendChild(chip);
        });

        row.appendChild(weakSpan);
        row.appendChild(arrow);
        row.appendChild(optDiv);
        replacementsList.appendChild(row);
      });
    }

    // Render bold lead-in preview
    const words = text.split(' ');
    if (words.length > 0 && words[0]) {
      const lead = words[0];
      const rest = words.slice(1).join(' ');
      renderedBullet.innerHTML = `&bull; <strong>${lead}</strong> ${rest}`;
    } else {
      renderedBullet.innerHTML = '&bull; <em>Enter a draft bullet point above...</em>';
    }
  }

  metricBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const injectText = btn.getAttribute('data-inject');
      textarea.value = textarea.value.replace(/\.?$/, '') + injectText + '.';
      analyzeBullet();
    });
  });

  textarea.addEventListener('input', analyzeBullet);

  copyBtn.addEventListener('click', () => {
    const raw = renderedBullet.textContent.replace(/^•\s*/, '');
    navigator.clipboard.writeText(raw);
    const orig = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = orig; }, 1800);
  });

  analyzeBullet();
})();
