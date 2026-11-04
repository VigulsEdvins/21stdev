// Consultation inquiry hub form handling & sanitization
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cih-inquiry-form');
  const status = document.getElementById('cih-status');

  function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cih-name')?.value.trim();
    const email = document.getElementById('cih-email')?.value.trim();
    const subject = document.getElementById('cih-subject')?.value;
    const message = document.getElementById('cih-message')?.value.trim();
    const consent = document.getElementById('cih-consent')?.checked;

    if (!name || !email || !message) {
      if (status) {
        status.textContent = 'Please fill in all required fields.';
        status.className = 'cih-status error';
        status.style.display = 'block';
      }
      return;
    }

    if (!consent) {
      if (status) {
        status.textContent = 'Please accept the privacy policy.';
        status.className = 'cih-status error';
        status.style.display = 'block';
      }
      return;
    }

    if (status) {
      status.innerHTML = `✓ Thank you, <strong>${sanitize(name)}</strong>! Your consultation request regarding <em>${sanitize(subject)}</em> has been forwarded to our engineering directors.`;
      status.className = 'cih-status success';
      status.style.display = 'block';
    }

    form.reset();
  });
});
