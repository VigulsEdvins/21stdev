/* Cloudflare Pages Function: POST /api/lead (the older Pages layout; the Worker in src/worker.js does the same job).
   All logic is in ../lib/lead-http.js and ../lib/lead.js. */
import http from '../lib/lead-http.js';

export const onRequestPost = ({ request, env }) => http.receive(request, env);
export const onRequest = () => http.json(405, { ok: false, errors: ['Use POST.'] }, { Allow: 'POST' }); // any method except POST
