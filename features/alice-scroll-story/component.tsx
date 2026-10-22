'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const styles = `

.main {
  --font-open-sans: "Open Sans", "Segoe UI", system-ui, sans-serif;
  --color-white: hsla(0, 0%, 100%, 1);
  --color-black: hsla(0, 0%, 0%, 1);
}

.main,
.main * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.main {
  font-family: var(--font-open-sans);
  font-size: 1rem;
  line-height: 1.75;
}

/* --- alice-scroll-story --------------------------------------------------- */

.main {
  max-width: 100vw;
  overflow-x: hidden;
}

.intro {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 100vh;
}

.intro__heading {
  font-size: clamp(1.875rem, 8.083vw + -0.217rem, 6.25rem);
  line-height: clamp(2.813rem, 9.815vw + 0.273rem, 8.125rem);
  text-align: center;
}

.content {
  background-color: #fff;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.content--after-hero {
  padding: 6.25rem 0;
}

.article {
  max-width: 31.25rem;
  padding: 0 1rem;
}

.article p {
  margin-bottom: 1rem;
}

.hero-reveal {
  background-color: var(--color-black);
  position: relative;
  min-height: 100vh !important;
}

.hero-reveal__header {
  align-items: center;
  background-color: var(--color-white);
  color: var(--color-black);
  display: flex;
  font-size: clamp(3.125rem, 12.61vw + -0.138rem, 15.625rem);
  line-height: clamp(4.688rem, 15.763vw + 0.609rem, 20.313rem);
  font-weight: 900;
  justify-content: center;
  left: 0;
  min-height: 100vh;
  position: relative;
  top: 0;
  will-change: transform;
  z-index: 1;
}

.hero-reveal_split {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  width: 100%;
}

.hero-reveal_split_item {
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
}

.hero-reveal_split_item:nth-child(1) {
  -webkit-clip-path: inset(0 0 calc(50% - 1px) 0);
  clip-path: inset(0 0 calc(50% - 1px) 0);
}

.hero-reveal_split_item:nth-child(2) {
  -webkit-clip-path: inset(calc(50% - 1px) 0 0 0);
  clip-path: inset(calc(50% - 1px) 0 0 0);
  left: 0;
  position: absolute;
  top: 0;
}

.c-wide-text {
  margin: 0;
}

.hero-reveal__content {
  color: var(--color-white);
  display: flex;
  justify-content: center;
  padding: 0;
  position: relative;
  margin-top: -60vh;
}

.hero-reveal__content-inner {
  max-width: 31.25rem;
  position: relative;
  padding: 0 1rem;
}

.hero-reveal__content-p {
  padding-bottom: 8rem;
}

.hero-reveal__content-p p {
  margin-bottom: 1rem;
}

.hero-reveal__parallax {
  position: absolute;
  z-index: 0;
}

/* Tailwind Preflight applies "img { max-width: 100% }". This container is
   absolutely positioned with no width, so it shrink-wraps to 0px and that
   max-width collapses every parallax image to zero width - painted, but
   invisible. The original CodePen/bundle ships no Tailwind, hence no clash. */
.hero-reveal__parallax img {
  max-width: none;
}

/* Explicit intrinsic sizes below are load-order critical, not cosmetic: the
   parallax tweens animate yPercent, which GSAP resolves against each image's
   own height when the tween is built. Un-sized images measure 0 tall until
   they finish downloading, so yPercent resolves to 0px and the drift silently
   never happens. Values match each PNG's natural aspect ratio. */

.hero-reveal__parallax-clock {
  position: absolute;
  width: 150px;
  height: 167px;
  left: -100px;
  top: -400px;
}

.hero-reveal__parallax-book {
  position: absolute;
  width: 100px;
  height: 94px;
  left: -200px;
  top: -400px;
}

.hero-reveal__parallax-alice {
  position: absolute;
  width: 576px;
  height: 468px;
  top: -500px;
}

.hero-reveal__parallax-kattle {
  position: absolute;
  width: 50px;
  height: 41px;
  left: 500px;
  filter: blur(2px);
  top: -300px;
}

.hero-reveal__parallax-card {
  position: absolute;
  width: 330px;
  height: 340px;
  left: 400px;
  filter: blur(2px);
  z-index: 1;
  top: -400px;
}

@media (max-width: 768px) {
  .hero-reveal__parallax-kattle,
  .hero-reveal__parallax-card {
    left: 200px;
  }

  .hero-reveal__parallax-clock,
  .hero-reveal__parallax-book {
    left: -50px;
  }
}
`

export default function AliceScrollStory() {
  useEffect(() => {
    // Hero reveal animation
    const heroReveal = gsap.utils.toArray('.hero-reveal')
    heroReveal.forEach((element: any) => {
      const heroBox = element.querySelector('.hero-reveal__header')
      const heroHeadings = element.querySelectorAll('.hero-reveal_split_item')
      const contentEl = element.querySelector('.hero-reveal__content')

      const heroBoxHeight = heroBox.offsetHeight
      const contentHeight = contentEl.offsetHeight

      // Content scroll up
      gsap
        .timeline({
          scrollTrigger: {
            trigger: element,
            start: 'top top',
            end: `+=${
              heroBoxHeight > contentHeight ? heroBoxHeight : contentHeight
            }`,
            scrub: true
          }
        })
        .fromTo(contentEl, { y: '50%' }, { y: '0%', ease: 'none' }, 0.2)

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: element,
          start: 'top top',
          end: `+=${heroBoxHeight > contentHeight ? heroBoxHeight : contentHeight}`,
          scrub: true,
          pin: true
        }
      })

      // Main clipPath animation
      tl.fromTo(
        heroBox,
        {
          clipPath:
            'polygon(0 0, 100% 0, 100% 50%, 0 50%, 0 50%, 100% 50%, 100% 100%, 0 100%)'
        },
        {
          clipPath:
            'polygon(0 0, 100% 0, 100% 0%, 0 0%, 0 100%, 100% 100%, 100% 100%, 0 100%)',
          duration: 0.4,
          ease: 'power4.inOut'
        }
      )

      // Split animations for child items
      if (heroHeadings.length < 2) return

      tl.fromTo(
        heroHeadings[0],
        { y: '0%' },
        { y: '-30%', ease: 'power3.inOut' },
        0
      )

      tl.fromTo(
        heroHeadings[1],
        { y: '0%' },
        { y: '30%', ease: 'power3.inOut' },
        0
      )
    })

    // Parallax animation function
    function parallaxScrollBySpeed(selector: string, speed = 1, trigger = '.hero-reveal') {
      const el = document.querySelector(selector)
      const contentEl = document.querySelector('.hero-reveal__content')
      const contentHeight = contentEl?.getBoundingClientRect().height || 0

      if (!el) return

      gsap.to(el, {
        yPercent: (speed - 1) * 100,
        ease: 'none',
        scrollTrigger: {
          trigger,
          start: 'top top',
          end: `+=${contentHeight * 3}`,
          scrub: true
        }
      })
    }

    // Apply parallax to different elements
    parallaxScrollBySpeed('.hero-reveal__parallax-book', 15)
    parallaxScrollBySpeed('.hero-reveal__parallax-clock', 13)
    parallaxScrollBySpeed('.hero-reveal__parallax-alice', 6)
    parallaxScrollBySpeed('.hero-reveal__parallax-kattle', 23)
    parallaxScrollBySpeed('.hero-reveal__parallax-card', 5)

    // Cleanup function
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill())
    }
  }, [])

  return (
    <>
      <style>{styles}</style>

    <main className="main">
      <section className="intro">
        <h1 className="intro__heading">
          Alice&apos;s Adventures<br />in Wonderland
        </h1>
      </section>

      <section className="content">
        <article className="article">
          <h2>Chapter 1</h2>
          <p>
            ALICE was beginning to get very tired of sitting by her sister on the bank, and of having
            nothing to do: once or twice she had peeped into the book her sister was reading, but it had no
            pictures or conversations in it, &ldquo;and what is the use of a book,&rdquo; thought Alice, &ldquo;without
            pictures or conversations?&rdquo;
          </p>

          <p>
            So she was considering in her own mind, (as well as she could, for the hot day made
            her feel very sleepy and stupid,) whether the pleasure of making a daisy-chain would be
            worth the trouble of getting up and picking the daisies, when suddenly a white rabbit with
            pink eyes ran close by her
          </p>

          <p>
            There was nothing so very remarkable in that; nor did Alice think it so very much out
            of the way to hear the Rabbit say to itself, &ldquo;Oh dear! Oh dear! I shall be too late!&rdquo;
            (when she thought it over afterwards, it occurred to her that she ought to have wondered
            at this, but at the time it all seemed quite natural); but when the Rabbit actually took a
            watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her
            feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket or a watch to take out of it, and, burning with curiosity, she ran across the field
            after it, and was just in time to see it pop down a large rabbit-hole under the hedge.
          </p>

          <p>
            In another moment down went Alice after it, never once considering how in the world
            she was to get out again.
          </p>

          <p>
            The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly
            down, so suddenly that Alice had not a moment to think about stopping herself before she found
            herself falling down what seemed to be a very deep well.
          </p>
        </article>
      </section>

      <section className="hero-reveal">
        <article>
          <header className="hero-reveal__header">
            <div className="hero-reveal_split">
              <div className="hero-reveal_split_item">
                <p className="c-wide-text -split">RABBIT HOLE</p>
              </div>
              <div className="hero-reveal_split_item" aria-hidden="true">
                <p className="c-wide-text -split" aria-hidden="true">RABBIT HOLE</p>
              </div>
            </div>
          </header>

          <div className="hero-reveal__content">
            <div className="hero-reveal__content-inner">
              <div className="hero-reveal__parallax">
                <img
                  src="https://cdn.21st.dev/assets/mirror/9b/9bc8918f9a205f2b72edf3d4e9d7e2b0c3fcfba2ab80962eba6ad1fb4b89cb33.png"
                  alt="Alice"
                  className="hero-reveal__parallax-alice"
                />
                <img
                  width="150"
                  src="https://cdn.21st.dev/assets/mirror/d9/d910502e2c6fa3f6f5e9c63cd498a005d1ec7a974f2286850859589b597a8aa1.png"
                  alt="Clock"
                  className="hero-reveal__parallax-clock"
                />
                <img
                  width="100"
                  src="https://cdn.21st.dev/assets/mirror/9e/9eb45f5186ffc7f60c3c085907211d5157bced180e6b1d0a15c0aab0150b7636.png"
                  alt="Book"
                  className="hero-reveal__parallax-book"
                />
                <img
                  width="50"
                  src="https://cdn.21st.dev/assets/mirror/d3/d3f44d54a86e918c2050ef8fa67d6bbc66cb272f42a4da04b1fd002faf5e915a.png"
                  alt="Kettle"
                  className="hero-reveal__parallax-kattle"
                />
                <img
                  width="330"
                  src="https://cdn.21st.dev/assets/mirror/4d/4da8755595b497e15b45fcebdcd9d7c83b1700535e0bb4a3305fbdbb8e9324a2.png"
                  alt="Card"
                  className="hero-reveal__parallax-card"
                />
              </div>

              <div className="hero-reveal__content-p">
                <p>
                  Either the well was very deep, or she fell very slowly, for she had plenty of time as she
                  went down to look about her, and to wonder what was going to happen next. First, she tried
                  to look down and make out what she was coming to, but it was too dark to see anything :
                  then she looked at the sides of the well, and noticed that they were filled with cupboards
                  and bookshelves: here and there she saw maps and pictures hung upon pegs. She took down a jar from one of the shelves as she passed; it
                  was labelled &ldquo;ORANGE MARMALADE,&rdquo; but to her great disappointment it was empty: she did
                  not like to drop the jar for fear of killing somebody underneath, so managed to put it into
                  one of the cupboards as she fell past it.
                </p>
                <p>
                  &ldquo;Well!&rdquo; thought Alice to herself, &ldquo;after such a fall as this, I shall think nothing of
                  tumbling down stairs! How brave they&apos;ll all think me at home! Why, I wouldn&apos;t say anything about it, even if I fell off the top of
                  the house!&rdquo; (Which was very likely true.)
                </p>
                <p>
                  Down, down, down. Would the fall never come to an end? &ldquo;I wonder how many miles
                  I&apos;ve fallen by this time?&rdquo; she said aloud. &ldquo;I must be getting somewhere near the centre of
                  the earth. Let me see : that would be four thousand miles down, I think—&rdquo; (for, you see,
                  Alice had learnt several things of this sort in her lessons in the schoolroom, and though this
                  was not a very good opportunity for showing off her knowledge, as there was no one to listen to her, still it was good practice to say it over)
                  &ldquo;—yes, that&apos;s about the right distance—but then I wonder what Latitude or Longitude
                  I&apos;ve got to?&rdquo; (Alice had not the slightest idea what Latitude was, or Longitude either, but
                  she thought they were nice grand words to say.)
                </p>
                <p>
                  Presently she began again. &ldquo;I wonder if I shall fall right through the earth! How funny
                  it&apos;ll seem to come out among the people that walk with their heads downwards! The Antipathies, I think—&rdquo; (she was rather glad there
                  was no one listening, this time, as it didn&apos;t sound at all the right word) &ldquo;—but I shall
                  have to ask them what the name of the country is, you know. Please, Ma&apos;am, is this New
                  Zealand or Australia?&rdquo; (and she tried to curtsey as she spoke—fancy curtseying as you&apos;re falling
                  through the air! Do you think you could manage it?) &ldquo;And what an ignorant little girl
                  she&apos;ll think me for asking! No, it&apos;ll never do to ask : perhaps I shall see it written up
                  somewhere.&rdquo;
                </p>
                <p>
                  Down, down, down. There was nothing else to do, so Alice soon began talking again. &ldquo;Dinah&apos;ll
                  miss me very much to-night, I should think!&rdquo; (Dinah was the cat.) &ldquo;I hope they&apos;ll remember
                  her saucer of milk at tea-time. Dinah, my dear! I wish you were down here with me! There
                  are no mice in the air, I&apos;m afraid, but you might catch a bat, and that&apos;s very like a mouse,
                  you know. But do cats eat bats, I wonder?&rdquo; And here Alice began to get rather sleepy, and
                  went on saying to herself, in a dreamy sort of way, &ldquo;Do cats eat bats? Do cats eat bats?&rdquo;
                  and sometimes, &ldquo;Do bats eat cats?&rdquo; for, you see, as she couldn&apos;t answer either question, it
                  didn&apos;t much matter which way she put it. She felt that she was dozing off, and had just begun
                  to dream that she was walking hand in hand with Dinah, and was saying to her very
                  earnestly, &ldquo;Now, Dinah, tell me the truth: did you ever eat a bat?&rdquo; when suddenly, thump!
                  thump! down she came upon a heap of sticks and dry leaves, and the fall was over.
                </p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="content content--after-hero">
        <article className="article">
          <p>
            Alice was not a bit hurt, and she jumped up on to her feet in a moment : she looked up,
            but it was all dark overhead; before her was another long passage, and the White Rabbit was
            still in sight, hurrying down it. There was not a moment to be lost: away went Alice like
            the wind, and was just in time to hear it say, as it turned a corner, &ldquo;Oh my ears and whiskers,
            how late it &apos;s getting !&rdquo; She was close behind it when she turned the corner, but the Rabbit
            was no longer to be seen : she found herself in a long, low hall, which was lit up by a row of
            lamps hanging from the roof
          </p>
          <p>
            There were doors all round the hall, but they were all locked, and when Alice had been all
            the way down one side and up the other, trying every door, she walked sadly down the middle,
            wondering how she was ever to get out again.
          </p>
          <p>
            Suddenly she came upon a little three-legged table, all made of solid glass; there was nothing
            on it but a tiny golden key, and Alice&apos;s first idea was that this might belong to one of the doors of the hall ; but alas ! either the locks
            were too large, or the key was too small, but at any rate it would not open any of them.
          </p>
          <p>
            However, on the second time round, she came upon a low curtain she had
            not noticed before, and behind it was a little door about fifteen
            inches high : she tried the little golden key in the
            lock, and to her great delight it fitted !
          </p>
        </article>
      </section>
    </main>
    </>
  )
}
