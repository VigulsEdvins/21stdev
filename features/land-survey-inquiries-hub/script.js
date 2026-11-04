export default function() {
  const form = document.querySelector('.lsih-form');
  const feedback = document.querySelector('.lsih-feedback');
  if (!form || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]')?.value.trim();
    const phone = form.querySelector('[name="phone"]')?.value.trim();
    const email = form.querySelector('[name="email"]')?.value.trim();

    if (!name || !phone || !email || !email.includes('@')) {
      feedback.className = 'lsih-feedback error';
      feedback.textContent = 'Please provide your full name, phone number, and a valid email.';
      return;
    }

    feedback.className = 'lsih-feedback success';
    feedback.textContent = 'Survey request submitted successfully. A forestry specialist will be in touch shortly.';
    form.reset();
  });
}
