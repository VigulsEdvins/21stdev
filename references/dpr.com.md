# dpr.com — Homepage | DPR Construction
height 901px · stack: swiper · scripts: -
fonts: FranklinGothic · Bodoni
backgrounds: rgb(230, 230, 230) · rgb(133, 136, 140) · rgba(255, 255, 255, 0.95) · rgba(255, 255, 255, 0.5) · rgb(255, 255, 255)
text colours: rgb(65, 64, 66) · rgb(0, 91, 156) · rgb(255, 255, 255)
header: top fixed h=80 bg=rgb(255, 255, 255) color=rgb(65, 64, 66) → scrolled fixed h=80 bg=rgb(255, 255, 255) color=rgb(65, 64, 66)

## Type styles (most used first)
- p FranklinGothic 16px/24px w400 rgb(65, 64, 66) ×10 "Our core values underlie the passion tha"
- span Bodoni 20px/25px w400 rgb(65, 64, 66) ×10 "Mission"
- span FranklinGothic 14px/14px w500 uppercase rgb(65, 64, 66) ×7 "what we build"
- span Bodoni 64px/64px w400 ls-1.6px rgb(65, 64, 66) ×5 "Great Teams. Great Projects. A Great Pla"
- strong FranklinGothic 16px/24px w800 rgb(65, 64, 66) ×5 "Integrity. Uniqueness. Enjoyment. Ever F"
- span Bodoni 20px/30px w400 rgb(65, 64, 66) ×3 "Menu"
- h1 Bodoni 96px/96px w400 rgb(255, 255, 255) ×1 "We Exist to Build Great Things"
- span FranklinGothic 24px/36px w800 uppercase rgb(255, 255, 255) ×1 "A self-performing general contractor foc"
- a FranklinGothic 18px/27px w400 uppercase rgb(255, 255, 255) ×1 "View Projects"
- span FranklinGothic 20px/30px w800 rgb(65, 64, 66) ×1 "We Exist to Build Great Things.®"
- p FranklinGothic 14px/21px w400 rgb(65, 64, 66) ×1 "Breaking ground for your groundbreaking "

## Sections, headings, buttons (page px)
y=80 h=820 main. bg=rgba(0, 0, 0, 0) pad=0px
y=80 h=820 section.overflow-hidden bg=rgb(133, 136, 140) pad=0px
  y=373 x=-8336 w=1192 H1 "We Exist to Build Great Things"
  y=565 btn "View Projects" 187x43 bg=rgba(0, 0, 0, 0) border=1px rgb(255, 255, 255) r=4px pad=7px 32px
y=80 h=820 section.flex bg=rgba(0, 0, 0, 0) pad=0px
y=80 h=820 div.hidden bg=rgb(133, 136, 140) pad=0px
y=80 h=820 section.relative bg=rgba(0, 0, 0, 0) pad=0px

## Animations on load
- slide-down-custom | div.otFlat.bottom | 1000ms ease-out | bottom:-99px→0px computedOffset:0→1

## Animations while scrolling
- opacity | div.h-full | 200ms cubic-bezier(0, 0, 0.2, 1) | opacity:0→1 computedOffset:0→1
- opacity | div.bg-brand-green.block | 200ms cubic-bezier(0.4, 0, 0.2, 1) | opacity:0→1 computedOffset:0→1
- right | span.text-brand-green.absolute | 200ms cubic-bezier(0.4, 0, 0.2, 1) | right:4px→0px computedOffset:0→1

## ScrollTrigger
- none

## Hover
- header a: no change | transition all
- a[class*=btn], a[class*=button], button: no change | transition all
- img: no change | transition all
