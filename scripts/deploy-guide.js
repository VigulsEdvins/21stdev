/**
 * The "put it online yourself" guide (plan E7.8). One source, three outputs: DEPLOY.md and a printable DEPLOY.html inside
 * every download, and the public page at /guide/ (site/guide/index.html is made from the same text by
 * scripts/build-guide-page.js). Plain words, numbered steps, a "You should now see" line after every step.
 * Pure string work: runs in the builder and in Node.
 */
(function (root) {
  'use strict';

  const SUPPORT = 'the support address on edvlabs.com/contact';

  // Every chapter carries the date its steps were last checked against the real host screens (re-check before launch and every six months, plan E15).
  const CHAPTERS = [
    {
      id: 'need', title: 'What you need', checked: '2026-10-29',
      intro: 'Nothing to install. About 30 minutes for your first time.',
      bullets: [
        '**The unzipped folder.** Open the ZIP you downloaded and extract it (right-click, "Extract all" on Windows; double-click on a Mac). The folder holds `index.html`, `style.css`, `script.js` and an `assets` folder. Keep them together.',
        '**A hosting account.** This is the computer that shows your site to visitors. Free ones are named below; you do not need to pay for hosting to start.',
        '**A domain name (optional at first).** The address people type, like `yourname.com`. Buying one costs roughly 8 to 20 euros a year. Without one you get a free address like `yourname.netlify.app`, which is fine for trying it out.',
        '**An email address** you can read, for the host to send you a confirmation.'
      ],
      after: 'Which route? **No experience:** Netlify Drop (Route 1). **Want it free with your own domain:** Cloudflare Pages (Route 2). **You already have a host with a file manager:** Route 4, upload.'
    },
    {
      id: 'netlify', title: 'Route 1: Netlify Drop (easiest)', checked: '2026-10-29',
      steps: [
        ['Open https://app.netlify.com/drop in your browser.', 'A page with a large box that says to drag and drop a folder.'],
        ['Drag the unzipped folder (the one holding `index.html`) onto the box. Drag the folder, not the ZIP file.', 'A progress bar, then your site with a web address ending in `.netlify.app`.'],
        ['Click the address. Your page opens in a new tab.', 'Your page, with its pictures. If it is blank, see "If something goes wrong" below.'],
        ['Create a free Netlify account when it asks, so the site is not deleted after an hour.', 'The site listed under "Sites" in your Netlify account.']
      ],
      note: 'Netlify reads the `_headers` file in your folder, so the security and caching rules are applied for you.'
    },
    {
      id: 'cloudflare', title: 'Route 2: Cloudflare Pages (free, with your own domain)', checked: '2026-10-29',
      steps: [
        ['Create a free account at https://dash.cloudflare.com/sign-up and confirm your email.', 'The Cloudflare dashboard.'],
        ['In the left menu choose "Workers & Pages", then "Create", then the "Pages" tab, then "Upload assets".', 'A form asking for a project name.'],
        ['Type a project name (letters and dashes only). This becomes `name.pages.dev`. Click "Create project".', 'A box to drop files.'],
        ['Drag the unzipped folder into the box, or use "Select from computer" and choose the folder. Click "Deploy site".', 'A "Success" message and a `.pages.dev` address.'],
        ['Click the address to open your site.', 'Your page.']
      ],
      note: 'Cloudflare reads `_headers` too. To update later, open the project and choose "Create new deployment" to upload the new folder.',
      github: 'Already sent the files to your GitHub account from edvlabs? Choose "Connect to Git" instead of "Upload assets", pick your repository, leave the build command empty and set the output folder to `/`. Each new commit then goes online by itself.'
    },
    {
      id: 'github', title: 'Route 3: GitHub Pages', checked: '2026-10-29',
      steps: [
        ['Create a free account at https://github.com and make a new repository (the "+" at the top, "New repository"). Choose Public.', 'An empty repository.'],
        ['Click "uploading an existing file", drag in the contents of the unzipped folder (the files and the `assets` folder, not the folder around them), and click "Commit changes".', 'The files listed in the repository.'],
        ['Open the repository "Settings", then "Pages". Under "Build and deployment" choose "Deploy from a branch", branch `main`, folder `/ (root)`, and Save.', 'After a minute or two the page shows "Your site is live at ...".'],
        ['Open that address.', 'Your page.']
      ],
      note: 'GitHub Pages ignores the `_headers` file, so the extra security and caching rules are not applied there. It works, but Netlify and Cloudflare Pages protect your visitors a little better.'
    },
    {
      id: 'host', title: 'Route 4: An ordinary web host (cPanel, FTP, file manager)', checked: '2026-10-29',
      steps: [
        ['Log in to your hosting control panel and open "File Manager" (or connect with an FTP program using the details your host emailed you).', 'A list of folders. Look for one called `public_html`, `www` or `htdocs`.'],
        ['Open that folder. If it holds a placeholder page such as `index.php` or `default.html`, delete or rename it.', 'An empty folder.'],
        ['Upload everything from inside the unzipped folder: `index.html`, `style.css`, `script.js`, the `assets` folder and the rest. Keep the folder structure.', 'The same files listed, with `assets` still a folder.'],
        ['Open your domain in a browser.', 'Your page.']
      ],
      note: '`_headers` is ignored by most ordinary hosts. That is harmless.'
    },
    {
      id: 'domain', title: 'Connect your own domain', checked: '2026-10-29',
      steps: [
        ['Buy a domain from a registrar (for example Cloudflare Registrar, Namecheap, or a local one). Choose a short name; `.com` or your country ending.', 'The domain listed in your registrar account.'],
        ['In your host (Netlify: "Domain management"; Cloudflare Pages: "Custom domains"), click "Add a domain" and type it, for example `yourname.com`.', 'The host shows what to change: either two name servers, or two DNS records (an A or CNAME record).'],
        ['In your registrar, either replace the name servers with the two the host gave you, or add the DNS records exactly as shown. Save.', 'The registrar shows the new values.'],
        ['Wait. It usually takes minutes, sometimes up to a few hours. The host turns on HTTPS (the padlock) by itself.', 'The host shows the domain as "Active" or "Verified" and the address opens with a padlock.'],
        ['Choose `www` or no `www` as the main address, and let the host redirect the other one to it.', 'Typing either version lands on the same page.']
      ],
      note: 'If it still does not work after an hour: check you copied the values with no extra spaces, that you changed them at the registrar where the domain is registered, and that old records for the same name were removed. Then ask your host\'s support; they see the same screen you do.'
    },
    {
      id: 'after', title: 'After it is online', checked: '2026-10-29',
      steps: [
        ['In the builder, open Step 5 and type your real web address when asked ("What will your web address be?"). Download again and upload the new folder.', 'The new `sitemap.xml` and the right address inside the page.'],
        ['Open Google Search Console at https://search.google.com/search-console, add your site, and submit `https://your-address/sitemap.xml` under "Sitemaps". Do the same at https://www.bing.com/webmasters.', '"Success" next to the sitemap.'],
        ['Open your site on your phone, on mobile data, not your home wifi.', 'The page looks right and loads in a few seconds.'],
        ['Click every link and button. Send yourself a message through the contact form, if you have one.', 'Everything goes where it should (see the form note below).']
      ],
      note: 'What to expect from Google: it takes days to a few weeks to list a new site. Where you appear depends on your content, your links and your competition. edvlabs cannot promise a ranking and nobody honest can.'
    },
    {
      id: 'form', title: 'Contact forms: where the messages go', checked: '2026-10-29',
      intro: 'A page made of plain files has no back end of its own, so a form needs somewhere to send its messages. The builder sets this up for you: open the **admin panel** (Content tab, "Open admin panel"), choose **Form messages**, pick one option below, type what it asks for, and download your site. You can change it later in the `admin.html` that comes with your site: pick another option, press Publish, then download the content file from the editor\'s "Publishing & backup" tab and upload it over the old one. Every contact, newsletter, waiting-list and quote form that came with the blocks uses your choice. A form you wrote yourself in custom code is not covered, and the check step warns about it.',
      bullets: [
        '**Netlify Forms** (only if your site is on Netlify). Nothing to type. After you upload the site, open Netlify, your site, then **Forms**: messages appear there, and you can switch on email notifications. It does not work on other hosts.',
        '**My email** (no account). Type your email address. Messages are sent by the free FormSubmit service. The first message asks you to confirm your address: click the link in that email, and send another test message. Your address is visible to anyone who views the page source, so use one made for this.',
        '**Formspree** (free account at https://formspree.io). Make a new form there and copy its address, which looks like `https://formspree.io/f/abcdwxyz` (the last part alone also works). Paste it in the builder.',
        '**Web3Forms** (free account at https://web3forms.com). Enter your email there; they send you an access key that looks like `12345678-abcd-1234-abcd-1234567890ab`. Paste the key in the builder. The key is public by design: it can only send messages to your address.',
        '**WhatsApp.** Type your number with the country code. When a visitor sends the form, their WhatsApp opens with the message already written to you, and they press send. You only receive it if they do.',
        '**The visitor\'s email app.** Type your email address. The visitor\'s mail program opens with the message written, and they press send. It does not work for visitors who have no mail program set up.',
        '**My own address** (advanced). A full `https://` address on your own server that accepts a JSON post and allows requests from your site. Ask your developer.'
      ],
      steps: [
        ['In the builder, open the admin panel, choose Form messages and pick where messages go. Type the address, number or key if it asks.', 'A note under the box explains what to type. If the value is wrong the box turns red and says why.'],
        ['Download your site again and upload it, the same way as the first time.', 'Your site online with the new forms.'],
        ['Open the live site and send yourself a test message through each form.', 'The thank-you message appears on the page, and the message reaches your inbox, your Netlify Forms list or your WhatsApp within a minute.'],
        ['If nothing arrives, look just under the form.', 'A line saying the message could not be sent means the service refused it. Check the address or key, that you confirmed your email (FormSubmit), or that Forms is switched on for the site (Netlify).']
      ],
      note: 'Good to know: the preview inside the builder never sends anything; messages are only sent from the live site. Free plans have limits. Every form carries a hidden trap box, and a message sent the instant the page opens is ignored, which stops most simple bots. A spam message can still get through: see "Keeping your forms and editor safe" below. edvlabs never sees or stores your messages; they go from your visitor to the service you chose. If you collect personal details from visitors, put a privacy notice on your site.'
    },
    {
      id: 'safe', title: 'Keeping your forms and editor safe', checked: '2026-10-29',
      intro: 'The builder does what a page of plain files can do: it checks every address you type, ignores a form that is filled in and sent by a program in a fraction of a second, and never sends a password field. These are the parts only you can cover.',
      bullets: [
        '**Spam from programs that skip your page.** A program can send messages straight to the service without ever opening your page, so only the service can stop those. Netlify filters every submission for spam by default (look under Forms, "Spam submissions"), and offers a reCAPTCHA check you can switch on. Web3Forms offers an hCaptcha check on its free plan (Turnstile and reCAPTCHA are on its paid plan). Formspree and FormSubmit have their own spam settings: switch on the ones you are offered in your account.',
        '**Your address is visible.** An email address in a form is written into the page in an encoded form, so a simple scraper does not find it, but anyone who reads the page script can decode it, and the content file of the editor holds it as plain text. Use an address made for your site, or pick Formspree or Web3Forms, where only a form code or key is in the page.',
        '**Say who receives the messages.** The messages pass through the service you chose (the Form messages tab names it). Put that in your privacy notice, with what you do with the messages.',
        '**The editor has no password.** Opening `admin.html` does not let anyone change your live site, because only the content file you upload does that, but it does show your editable content. Keep `admin.html` on your own computer and upload only the content file, or protect that page with your host\'s password or access feature if it has one.',
        '**Protect your hosting and domain accounts.** Whoever can upload files to your host can change your site, including where form messages go. Use a long, unique password and two-step sign-in on both accounts.',
        '**If you switched on the strict security policy** at download, connections are limited to your site and the form services. If you later choose another "own address" for the forms in the editor, add that address to `connect-src` in the `<meta>` tag of `index.html`.'
      ],
      note: 'Before you rely on a form, send one real message through it from the live site and check that it arrives (see the form steps above).'
    },
    {
      id: 'mail', title: 'Email on your own domain', checked: '2026-10-29',
      intro: 'Email like `hello@yourname.com` is not part of the website. Get it from your registrar, Google Workspace, Zoho or Fastmail. Be careful: if you move your domain to a new host and change the **MX records** by accident, your email stops arriving. Only touch the A, CNAME or name-server settings the host tells you to.'
    },
    {
      id: 'update', title: 'Updating later', checked: '2026-10-29',
      steps: [
        ['Change the page in the builder (or, if you bought the editor, in the editor page) and download again.', 'A new ZIP.'],
        ['Upload it the same way as the first time: Netlify "Deploys", Cloudflare "Create new deployment", GitHub commit, or the file manager.', 'The change visible after a minute. If you still see the old page, refresh the page hard (Ctrl+Shift+R, or Cmd+Shift+R on a Mac).']
      ],
      note: 'Keep the first ZIP. It is your backup.'
    },
    {
      id: 'trouble', title: 'If something goes wrong', checked: '2026-10-29',
      table: [
        ['Blank white page', 'You uploaded the ZIP itself or the outer folder. Upload the files inside the folder, with `index.html` at the top.'],
        ['Pictures or styles missing', 'The `assets` folder or `style.css` was left out, or renamed. Upload them again, keeping the names.'],
        ['"404 Not Found" when you refresh a page', 'The file name is different from the link. Check names are lower case and match exactly.'],
        ['You still see the old version', 'Your browser kept a copy. Hard-refresh, or open the address in a private window.'],
        ['"Not secure" warning', 'The address starts with `http://`. Use `https://`. For your own domain, wait for the host to finish turning HTTPS on.'],
        ['The domain shows a host\'s parking page', 'The DNS change has not spread yet, or the records are wrong. See "Connect your own domain".']
      ],
      after: 'Still stuck? Write to ' + SUPPORT + ' and include: the address of your site, which route you followed, the step you are on, and a screenshot. Never send us a password, API key or card number. We will never ask for one.'
    }
  ];

  const CHECKLIST = ['Files uploaded', 'Address opens', 'HTTPS (padlock) works', 'Checked on a phone', 'Sitemap sent to Google', 'Contact form tested', 'Backup copy of the ZIP kept'];

  const inline = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(https?:\/\/[^\s<)]+[^\s<).,])/g, '<a href="$1" rel="noopener noreferrer">$1</a>');
  const plain = (s) => String(s);

  function markdown(opts = {}) {
    const addr = opts.address ? `\nYour web address is set to **${opts.address}**.\n` : '\nYou have not set your web address yet. Do that after the site is online (see "After it is online").\n';
    const out = ['# Putting your site online', '', 'These files are ready to upload as they are. Nothing needs to be built, and nothing here asks for a password, API key or card number to be sent to edvlabs.', addr];
    CHAPTERS.forEach((c) => {
      out.push(`## ${c.title}`, `*Last checked: ${c.checked}*`, '');
      if (c.intro) out.push(plain(c.intro), '');
      (c.bullets || []).forEach((b) => out.push('- ' + b));
      if (c.bullets) out.push('');
      (c.steps || []).forEach((s, i) => out.push(`${i + 1}. ${s[0]}`, `   *You should now see:* ${s[1]}`));
      if (c.steps) out.push('');
      if (c.table) { out.push('| Problem | What to do |', '| --- | --- |'); c.table.forEach((r) => out.push(`| ${r[0]} | ${r[1]} |`)); out.push(''); }
      if (c.note) out.push(c.note, '');
      if (c.github) out.push('**Sent to GitHub?** ' + c.github, '');
      if (c.example) out.push(c.example, '');
      if (c.after) out.push(c.after, '');
    });
    out.push('## Checklist', '');
    CHECKLIST.forEach((i) => out.push('- [ ] ' + i));
    out.push('');
    return out.join('\n');
  }

  /** The chapters as HTML, shared by DEPLOY.html and the public page. */
  function bodyHtml(opts = {}) {
    const h = [];
    CHAPTERS.forEach((c) => {
      h.push(`<section id="${c.id}"><h2>${inline(c.title)}</h2><p class="checked">Last checked: ${c.checked}</p>`);
      if (c.intro) h.push(`<p>${inline(c.intro)}</p>`);
      if (c.bullets) h.push('<ul>' + c.bullets.map((b) => `<li>${inline(b)}</li>`).join('') + '</ul>');
      if (c.steps) h.push('<ol>' + c.steps.map((s) => `<li>${inline(s[0])}<span class="see"><b>You should now see:</b> ${inline(s[1])}</span></li>`).join('') + '</ol>');
      if (c.table) h.push('<table><thead><tr><th>Problem</th><th>What to do</th></tr></thead><tbody>' + c.table.map((r) => `<tr><td>${inline(r[0])}</td><td>${inline(r[1])}</td></tr>`).join('') + '</tbody></table>');
      if (c.note) h.push(`<p>${inline(c.note)}</p>`);
      if (c.github) h.push(`<p><strong>Sent to GitHub?</strong> ${inline(c.github)}</p>`);
      if (c.example) h.push(`<p>${inline(c.example)}</p>`);
      if (c.after) h.push(`<p>${inline(c.after)}</p>`);
      h.push('</section>');
    });
    h.push('<section id="checklist"><h2>Checklist</h2><ul class="checklist">' + CHECKLIST.map((i) => `<li><label><input type="checkbox"> ${inline(i)}</label></li>`).join('') + '</ul></section>');
    return h.join('\n');
  }

  /** DEPLOY.html: one printable page with its own small stylesheet, no scripts. */
  function html(opts = {}) {
    const css = 'body{font:16px/1.6 system-ui,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1c1c1c}h1,h2{line-height:1.2}code{background:#f1ede4;padding:.1em .3em;border-radius:3px}.checked{color:#555;font-size:.85em;margin-top:-.5em}.see{display:block;color:#0e5a5a;font-size:.92em;margin:.2em 0 .8em}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:.4em .6em;text-align:left;vertical-align:top}.checklist{list-style:none;padding:0}@media print{body{margin:0}section{break-inside:avoid}}';
    const addr = opts.address ? `<p>Your web address is set to <strong>${inline(opts.address)}</strong>.</p>` : '<p>You have not set your web address yet. Do that after the site is online (see "After it is online").</p>';
    return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Putting your site online</title><style>${css}</style></head><body>\n<h1>Putting your site online</h1>\n<p>These files are ready to upload as they are. Nothing needs to be built, and nothing here asks for a password, API key or card number to be sent to edvlabs.</p>\n${addr}\n${bodyHtml(opts)}\n</body></html>\n`;
  }

  const api = { CHAPTERS, CHECKLIST, markdown, html, bodyHtml };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DeployGuide = api;
})(typeof window !== 'undefined' ? window : this);
