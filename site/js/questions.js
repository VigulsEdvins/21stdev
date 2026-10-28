/* The questions (plan E3.1). DRAFT WORDING: the owner reviews it before launch.
   type: 'one' (pick one), 'many' (pick several, optional max), 'text'. Every question can be answered "I don't know yet". */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.EdvQuestions = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const BLOCKS = [
    ['banner', 'Opening banner', 'The first thing people see.'],
    ['about', 'About you', 'A short story and a photo.'],
    ['services', 'What you offer', 'The things you do or sell.'],
    ['prices', 'Prices', 'What things cost.'],
    ['gallery', 'Gallery', 'Photos of your work.'],
    ['reviews', 'What customers say', 'A few kind words from others.'],
    ['faq', 'Questions and answers', 'The things people always ask.'],
    ['contact', 'Contact form', 'A way to write to you.'],
    ['map', 'Map and opening hours', 'Where you are and when.'],
    ['newsletter', 'Newsletter sign-up', 'Collect email addresses.'],
    ['team', 'Your team', 'Who people will meet.'],
    ['process', 'How you work', 'Your steps, one by one.']
  ];
  const QUESTIONS = [
    { id: 'purpose', type: 'one', title: 'What is the page for?', help: 'Pick the closest one.', options: [['business', 'My business', 'Something you sell or a service you give.'], ['self', 'Myself', 'Your work, your story or your CV.'], ['event', 'An event', 'A wedding, a party, a launch.'], ['product', 'One product', 'A single thing you want to show off.'], ['other', 'Something else', 'We will ask more later.']] },
    { id: 'kind', type: 'text', title: 'What kind of business or work is it?', help: 'A few words are enough, for example “a hair salon in Riga” or “wedding photographer”.', label: 'In a few words' },
    { id: 'action', type: 'many', title: 'What should a visitor do on your page?', help: 'Pick everything that matters.', options: [['call', 'Call or write to me', ''], ['book', 'Book a time', ''], ['buy', 'Buy something', ''], ['signup', 'Sign up', ''], ['read', 'Read about me', ''], ['see', 'See my work', '']] },
    { id: 'blocks', type: 'many', layout: 'blocks', title: 'Which blocks should your page have?', help: 'A page is a stack of blocks. Pick the ones you want. The first three are included in the base price.', suggest: 'Not sure, suggest for me', options: BLOCKS },
    { id: 'editor', type: 'one', title: 'Do you want to change the words yourself later?', help: 'The editor lets you change the words and pictures on your finished page without touching any code. It costs a little extra.', options: [['yes', 'Yes, add the editor', 'I will want to change things.'], ['no', 'No', 'I will ask someone, or leave it as it is.']] },
    { id: 'content', type: 'one', title: 'Do you already have words, photos and a logo?', help: 'It is fine to have none. We will tell you what to prepare.', options: [['all', 'All of them', ''], ['some', 'Some of them', ''], ['none', 'None yet', '']] },
    { id: 'feel', type: 'many', max: 3, title: 'How should it feel?', help: 'Pick up to three words.', options: [['calm', 'Calm', ''], ['warm', 'Warm', ''], ['bold', 'Bold', ''], ['playful', 'Playful', ''], ['serious', 'Serious', ''], ['elegant', 'Elegant', ''], ['simple', 'Simple', ''], ['friendly', 'Friendly', '']] },
    { id: 'languages', type: 'one', title: 'How many languages should the page be in?', help: 'Each language is a copy of the page with its own words.', options: [['1', 'One', ''], ['2', 'Two', ''], ['3', 'Three or more', '']] },
    { id: 'hosting', type: 'one', title: 'Do you already have a domain name and hosting?', help: 'A domain is the address, like yourname.com. Hosting is where the page lives online. Neither is included, and we explain both.', options: [['both', 'Both', ''], ['domain', 'Only a domain', ''], ['hosting', 'Only hosting', ''], ['neither', 'Neither', '']] },
    { id: 'when', type: 'one', title: 'When do you need it?', help: 'A rough idea is enough.', options: [['week', 'Within a week', ''], ['month', 'Within a month', ''], ['later', 'No hurry', '']] }
  ];
  /** Number of blocks a brief asks for. If the visitor did not choose, assume the usual five so the estimate stays honest. */
  const USUAL_BLOCKS = 5;
  function blockCount(brief) {
    const a = brief.blocks;
    if (!a || a.unknown || !Array.isArray(a.value) || !a.value.length) return USUAL_BLOCKS;
    return a.value.length;
  }
  const wantsEditor = (brief) => !!(brief.editor && !brief.editor.unknown && brief.editor.value === 'yes');
  return { QUESTIONS, BLOCKS, USUAL_BLOCKS, blockCount, wantsEditor };
});
