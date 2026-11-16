# abathhouse.com — Bathhouse — An oasis to be fundamentally human.
height 4836px · stack: plain · scripts: -
fonts: robotoMono · Nunito
backgrounds: rgb(42, 42, 42) · rgba(0, 0, 0, 0.95) · rgb(0, 0, 0) · rgb(51, 51, 51)
text colours: rgb(255, 255, 255) · rgba(255, 255, 255, 0.75) · rgba(255, 255, 255, 0.8) · rgba(255, 255, 255, 0.85) · rgb(0, 0, 0)
header: top static h=73 bg=rgba(0, 0, 0, 0.95) color=rgb(255, 255, 255) backdrop=blur(4px) → scrolled static h=73 bg=rgba(0, 0, 0, 0.95) color=rgb(255, 255, 255) backdrop=blur(4px)

## Type styles (most used first)
- span robotoMono 14px/21px w400 rgb(255, 255, 255) ×36 "Select..."
- p robotoMono 12px/18px w400 rgba(255, 255, 255, 0.8) ×11 "103 North 10th Street, Brooklyn"
- h3 robotoMono 24px/32px w300 ls0.48px rgb(255, 255, 255) ×9 "Williamsburg"
- span robotoMono 12px/18px w500 ls0.96px uppercase rgb(255, 255, 255) ×6 "Book now – From $39"
- a robotoMono 16px/25.6px w700 rgb(255, 255, 255) ×6 "Williamsburg"
- button robotoMono 12px/16px w500 ls0.6px uppercase rgba(255, 255, 255, 0.85) ×5 "Locations"
- h2 robotoMono 36px/40px w300 ls-0.72px rgb(255, 255, 255) ×5 "Find a Bathhouse Near You"
- p robotoMono 14px/22.75px w400 rgba(255, 255, 255, 0.8) ×5 "Enjoy amenity access with a Day Pass or "
- h3 robotoMono 16px/25.6px w500 ls0.8px rgb(255, 255, 255) ×4 "Day Pass"
- p robotoMono 12px/18px w500 ls2.4px uppercase rgba(255, 255, 255, 0.85) ×3 "Locations & Hours"
- span robotoMono 60px/60px w300 ls-1.2px rgb(255, 255, 255) ×2 "An oasis to be"
- p robotoMono 12px/18px w500 ls3px uppercase rgba(255, 255, 255, 0.75) ×2 "Coming soon"
- text robotoMono 36px/54px w400 ls4px rgb(255, 255, 255) ×2 "OPENS"
- p robotoMono 13px/17.875px w400 rgba(255, 255, 255, 0.8) ×2 "We and our partners use cookies and simi"
- a robotoMono 12px/18px w600 ls1.44px uppercase rgb(255, 255, 255) ×2 "Manage Cookies"
- a robotoMono 14px/22.4px w400 rgb(255, 255, 255) ×1 "First Timer? Get 10% off your first Day "
- strong robotoMono 14px/22.4px w700 rgb(255, 255, 255) ×1 "Redeem Now"
- span robotoMono 60px/60px w400 ls-1.2px italic rgb(255, 255, 255) ×1 "human"

## Sections, headings, buttons (page px)
y=129 h=3824 main.flex-1 bg=rgba(0, 0, 0, 0) pad=0px
y=57 h=783 section.relative bg=rgba(0, 0, 0, 0) pad=0px
  y=671 btn "Book now" 115x63 bg=rgba(255, 255, 255, 0.06) border=0px rgb(229, 231, 235) r=12px pad=12px 24px
y=840 h=1149 section.py-10 bg=rgba(0, 0, 0, 0) pad=56px 40px
  y=896 x=144 w=1152 H2 "Find a Bathhouse Near You"
  y=1309 x=176 w=309 H3 "Williamsburg"
  y=1309 x=565 w=309 H3 "Flatiron"
  y=1309 x=955 w=309 H3 "Atlantic Ave"
  y=1792 x=176 w=309 H3 "Berkeley Heights"
  y=1792 x=565 w=309 H3 "Philadelphia"
  y=1792 x=955 w=309 H3 "Chicago"
y=1990 h=489 section.px-6 bg=rgba(0, 0, 0, 0) pad=0px 40px 56px
  y=1990 x=144 w=1152 H2 "Offerings"
  y=2353 x=168 w=228 H3 "Day Pass"
  y=2353 x=460 w=228 H3 "Massage"
  y=2353 x=752 w=228 H3 "Body Scrub"
  y=2353 x=1044 w=228 H3 "Packs"
y=2479 h=631 section.py-10 bg=rgba(0, 0, 0, 0) pad=56px 40px
  y=2535 x=144 w=1152 H2 "Plan your visit"
  y=2923 x=144 w=373 H3 "Amenities"
  y=2923 x=533 w=373 H3 "Treatments"
  y=2923 x=923 w=373 H3 "Sauna Rituals"
y=3110 h=603 section.py-10 bg=rgba(0, 0, 0, 0) pad=56px 40px
y=3713 h=241 section.py-14 bg=rgba(0, 0, 0, 0) pad=80px 40px
y=3954 h=798 footer.bg-bath-black bg=rgb(0, 0, 0) pad=0px
  y=4788 btn "Manage Cookies" 155x36 bg=rgba(0, 0, 0, 0) border=1px rgba(255, 255, 255, 0.3) r=0px pad=0px 16px
  y=4788 btn "Accept All" 118x36 bg=rgb(255, 255, 255) border=0px rgb(229, 231, 235) r=0px pad=0px 16px

## Animations on load
- fadeUp | h1.mb-4.text-center | 800ms ease-out | opacity:0→1 transform:translateY(20px)→translateY(0px) computedOffset:0→1
- fadeUp | div.flex.w-full | 800ms +300ms ease-out | opacity:0→1 transform:translateY(20px)→translateY(0px) computedOffset:0→1

## Animations while scrolling
- revealUp | div.scroll-reveal.revealed | 700ms cubic-bezier(0.22, 1, 0.36, 1) | opacity:0→1 transform:translateY(30px) scale(0.98)→translateY(0px) scale(1) computedOffset:0→1
- opacity | img.absolute.inset-0 | 700ms cubic-bezier(0.4, 0, 0.2, 1) | opacity:1→0 computedOffset:0→1
- opacity | img.absolute.inset-0 | 700ms cubic-bezier(0.4, 0, 0.2, 1) | opacity:0→1 computedOffset:0→1

## ScrollTrigger
- none

## Hover
- header a: no change | transition all
- a[class*=btn], a[class*=button], button: color:rgba(255, 255, 255, 0.9)→rgb(255, 255, 255) | transition all
- img: no change | transition all
