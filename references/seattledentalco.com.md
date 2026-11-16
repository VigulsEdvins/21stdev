# seattledentalco.com — Queen Anne Dentist | Seattle Dental Co.
height 3673px · stack: webflow · scripts: cdn.prod.website-files.comwebflow.schunk.36b8fb49256177c8.js, cdn.prod.website-files.comwebflow.b22f379c.4b4454b0a914f046.js, cdn.prod.website-files.comwebflow.schunk.3fe72a18295911e2.js
fonts: Lato · Quicksand
backgrounds: rgba(255, 255, 255, 0.69) · rgb(175, 175, 175) · rgba(255, 255, 255, 0.82) · rgb(221, 221, 221) · rgb(255, 255, 255) · rgb(214, 69, 69)
text colours: rgb(58, 58, 58) · rgb(107, 107, 107) · rgb(131, 131, 131) · rgb(255, 255, 255) · rgb(0, 0, 0) · rgb(37, 37, 37) · rgb(34, 34, 34) · rgb(245, 245, 245)
header: top fixed h=131 bg=rgba(0, 0, 0, 0) color=rgb(37, 37, 37) → scrolled fixed h=131 bg=rgba(0, 0, 0, 0) color=rgb(37, 37, 37)

## Type styles (most used first)
- li Quicksand 16px/20px w300 rgb(131, 131, 131) ×7 "100 W Harrison St North Tower #150 Seatt"
- span Quicksand 16px/20px w600 uppercase rgb(107, 107, 107) ×7 "Address:"
- a Lato 13px/20px w400 ls3px uppercase rgb(0, 0, 0) ×6 "About"
- h3 Lato 29px/30px w400 ls5px rgb(58, 58, 58) ×6 "Samantha B."
- p Quicksand 14px/24px w400 ls1px rgb(58, 58, 58) ×6 ""I wasn’t sure how I’d feel about changi"
- strong Quicksand 16px/24px w700 ls1px rgb(58, 58, 58) ×4 "Perfection in our craft."
- h3 Lato 23px/30px w300 ls5px uppercase rgb(37, 37, 37) ×3 "What "co" means to us"
- h2 Lato 20px/31px w900 ls4px uppercase rgb(58, 58, 58) ×3 "Services"
- a Lato 13px/19.5px w400 ls2.6px uppercase rgb(255, 255, 255) ×3 "Get the Details"
- div Lato 14px/22px w400 ls1px uppercase rgb(209, 209, 209) ×3 "© Seattle Dental Co. Serving Queen Anne "
- h2 Lato 35px/50px w700 ls1px rgb(58, 58, 58) ×2 "Read Reviews & Testimonials"
- div Lato 13px/20px w400 rgb(245, 245, 245) ×1 "We apologize for the inconvenience, our "
- a Lato 21px/20px w400 rgb(58, 58, 58) ×1 "(206) 284-4412"
- h1 Lato 45px/59px w700 ls1px rgb(58, 58, 58) ×1 "Our Passion"
- span Lato 45px/59px w300 ls1px rgb(58, 58, 58) ×1 "We're Sharing"
- h1 Lato 55px/44px w700 ls2px rgb(37, 37, 37) ×1 "Seattle Dental Co"
- p Lato 55px/82.5px w700 ls1px rgb(58, 58, 58) ×1 "smetic"
- p Quicksand 16px/24px w300 ls1px rgb(58, 58, 58) ×1 "We care deeply about getting your treatm"

## Sections, headings, buttons (page px)
  y=393 x=87 w=545 H1 "Our Passion"
  y=929 x=531 w=378 H3 "What "co" means to us"
  y=979 x=364 w=465 H1 "Seattle Dental Co"
  y=1491 x=-534 w=414 H2 "Services"
  y=1538 btn "Get the Details" 178x34 bg=rgb(58, 58, 58) border=0px rgb(255, 255, 255) r=3px pad=7px 11px
  y=1490 x=-104 w=679 H2 "About Us"
  y=1537 btn "learn more" 292x34 bg=rgb(58, 58, 58) border=0px rgb(255, 255, 255) r=3px pad=7px 11px
  y=1826 x=-104 w=679 H2 "Patients"
  y=1873 btn "read more" 292x34 bg=rgb(58, 58, 58) border=0px rgb(255, 255, 255) r=3px pad=7px 11px
y=2214 h=500 div.section bg=rgb(255, 255, 255) pad=40px 0px
  y=2274 x=220 w=1000 H3 "Don’t Take Our Word for It!"
  y=2314 x=220 w=1000 H2 "Read Reviews & Testimonials"
  y=2421 x=364 w=212 H3 "Samantha B."
  y=2421 x=666 w=108 H3 "Kim L."
  y=2421 x=902 w=137 H3 "Janet S."
  y=2445 x=1286 w=154 H3 "Amber L."
  y=2421 x=1518 w=189 H3 "Natasha H."
  y=2433 x=1790 w=145 H3 "Robin B."
  y=2861 btn "Book an appointment!" 244x41 bg=rgb(58, 58, 58) border=0px rgb(255, 255, 255) r=5px pad=9px 15px
  y=3027 x=250 w=484 H3 "Don’t Be a Stranger"
  y=3067 x=250 w=484 H2 "Book Your Next Visit Today!"

## Animations on load

## Animations while scrolling
- transform | div.slideright.w-slide | 400ms ease | transform:translateX(-720px)→translateX(-1440px) computedOffset:0→1
- transform | div.slide-8.w-slide | 400ms ease | transform:translateX(-720px)→translateX(-1440px) computedOffset:0→1
- transform | div.slide-8.alt | 400ms ease | transform:translateX(-720px)→translateX(-1440px) computedOffset:0→1

## ScrollTrigger
- none

## Hover
- a[class*=btn], a[class*=button], button: no change | transition background-color 0.408s, color 0.5s
- img: no change | transition all
