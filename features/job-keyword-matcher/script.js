/**
 * Job Keyword Matcher & Gap Analyzer Controller
 * Extracted from CV Craft Pro (src/utils/jobMatcher.js)
 */
(function () {
  const PRESETS = {
    frontend: `We are looking for a Senior Frontend Architect proficient in TypeScript, React, Next.js, and Tailwind CSS. The ideal candidate has deep experience with WebGL or Three.js, CI/CD automation, state management, Docker containers, GraphQL, and micro-frontend architectures. Excellent communication and Agile collaboration required.`,
    devops: `Seeking a Lead Cloud & DevOps Engineer with extensive knowledge of Kubernetes, Docker, AWS or GCP, Terraform, PostgreSQL database tuning, CI/CD pipelines, Prometheus monitoring, and Infrastructure as Code.`
  };

  // Base applicant skills from CV
  let mySkills = new Set([
    'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Three.js', 'Tailwind CSS'
  ]);

  const KEYWORD_DICTIONARY = [
    'TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'Kubernetes',
    'Three.js', 'WebGL', 'Tailwind CSS', 'CI/CD', 'GraphQL', 'AWS', 'GCP', 'Terraform',
    'Prometheus', 'Microservices', 'State Management', 'Agile'
  ];

  const textarea = document.getElementById('jobInput');
  const clearBtn = document.getElementById('clearBtn');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const scoreVal = document.getElementById('scoreVal');
  const scoreVerdict = document.getElementById('scoreVerdict');
  const scoreDesc = document.getElementById('scoreDesc');
  const matchedChips = document.getElementById('matchedChips');
  const missingChips = document.getElementById('missingChips');
  const matchedCount = document.getElementById('matchedCount');
  const missingCount = document.getElementById('missingCount');
  const activeSkillsList = document.getElementById('activeSkillsList');

  function renderActiveSkills() {
    activeSkillsList.innerHTML = '';
    [...mySkills].sort().forEach((skill) => {
      const el = document.createElement('span');
      el.className = 'active-skill-item';
      el.textContent = skill;
      activeSkillsList.appendChild(el);
    });
  }

  function analyzeText(text) {
    const raw = (text || '').toLowerCase();
    const matched = [];
    const missing = [];

    KEYWORD_DICTIONARY.forEach((kw) => {
      const lower = kw.toLowerCase();
      // Test word boundary or occurrence
      const regex = new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(raw)) {
        // Has keyword in job description
        const hasInCv = [...mySkills].some((s) => s.toLowerCase() === lower);
        if (hasInCv) {
          matched.push(kw);
        } else {
          missing.push(kw);
        }
      }
    });

    const totalInJob = matched.length + missing.length;
    const score = totalInJob === 0 ? 0 : Math.round((matched.length / totalInJob) * 100);

    scoreVal.textContent = `${score}%`;
    if (score >= 80) {
      scoreVerdict.textContent = 'Exceptional ATS Match (Top 5%)';
      scoreDesc.textContent = `Strong alignment with ${matched.length} of ${totalInJob} job requirements. Your resume is primed for hiring manager screening.`;
    } else if (score >= 50) {
      scoreVerdict.textContent = 'Solid ATS Match';
      scoreDesc.textContent = `You match ${matched.length} of ${totalInJob} core competencies. Click any missing tag below to add it to your profile.`;
    } else {
      scoreVerdict.textContent = 'Low ATS Match';
      scoreDesc.textContent = `Found ${matched.length} matching keywords. Consider incorporating more skills from the target description.`;
    }

    matchedCount.textContent = matched.length;
    missingCount.textContent = missing.length;

    matchedChips.innerHTML = '';
    matched.forEach((kw) => {
      const chip = document.createElement('span');
      chip.className = 'skill-chip matched';
      chip.textContent = kw;
      matchedChips.appendChild(chip);
    });

    missingChips.innerHTML = '';
    missing.forEach((kw) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'skill-chip missing';
      chip.textContent = kw;
      chip.title = `Click to add ${kw} to your resume skills`;
      chip.addEventListener('click', () => {
        mySkills.add(kw);
        renderActiveSkills();
        analyzeText(textarea.value);
      });
      missingChips.appendChild(chip);
    });
  }

  textarea.addEventListener('input', () => analyzeText(textarea.value));

  clearBtn.addEventListener('click', () => {
    textarea.value = '';
    analyzeText('');
    presetBtns.forEach((b) => b.classList.remove('active'));
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      presetBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const presetKey = btn.getAttribute('data-preset');
      if (PRESETS[presetKey]) {
        textarea.value = PRESETS[presetKey];
        analyzeText(textarea.value);
      }
    });
  });

  // Init with frontend preset
  renderActiveSkills();
  textarea.value = PRESETS.frontend;
  analyzeText(textarea.value);
})();
