# henselphelps.com — General Contractor & Construction | Hensel Phelps
height 5215px · stack: swiper · scripts: www.henselphelps.comswiper.min.js, cdnjs.cloudflare.comaos.js
fonts: Roboto
backgrounds: rgb(44, 42, 41) · rgb(255, 255, 255)
text colours: rgb(255, 255, 255) · rgb(44, 42, 41) · rgb(154, 25, 47) · rgb(166, 25, 46) · rgb(34, 30, 31)
header: top fixed h=99 bg=rgba(0, 0, 0, 0) color=rgb(44, 42, 41) → scrolled fixed h=99 bg=rgb(44, 42, 41) color=rgb(44, 42, 41)

## Type styles (most used first)
- a Roboto 13px/16px w700 ls1px uppercase rgb(255, 255, 255) ×10 "All News"
- div Roboto 14px/normal w700 ls1px uppercase rgb(255, 255, 255) ×8 "Market Insights"
- h2 Roboto 18px/22px w700 rgb(255, 255, 255) ×8 "Airport Construction Innovation: Stoppin"
- a Roboto 13px/normal w700 ls1px uppercase rgb(154, 25, 47) ×8 "Projects"
- p Roboto 18px/24px w300 rgb(44, 42, 41) ×6 "We plan with ingenuity – Every landmark "
- a Roboto 12px/normal w700 ls1px uppercase rgb(166, 25, 46) ×5 "Our Vision and Values"
- a Roboto 11px/normal w700 ls1px uppercase rgb(255, 255, 255) ×4 "Projects"
- h2 Roboto 64px/normal w100 rgb(166, 25, 46) ×3 "Plan"
- h3 Roboto 42px/46px w100 capitalize rgb(255, 255, 255) ×3 "aviation Case Study"
- a Roboto 12px/16px w300 rgb(34, 30, 31) ×2 "Privacy Policy"
- h2 Roboto 65px/65px w100 rgb(255, 255, 255) ×1 "Delivering in all we do."
- span Roboto 65px/65px w600 rgb(255, 255, 255) ×1 "EXCELLENCE"
- h3 Roboto 63px/normal w100 rgb(44, 42, 41) ×1 "Hensel Phelps News Center"
- span Roboto 18px/normal w300 rgb(44, 42, 41) ×1 "Filter News:"
- h3 Roboto 64px/70.4px w100 rgb(255, 255, 255) ×1 "Build Your Own Legacy"
- div Roboto 13px/16px w300 rgb(34, 30, 31) ×1 "Copyright © 2026 Hensel Phelps. All righ"

## Sections, headings, buttons (page px)
  y=261 x=120 w=425 H2 "Delivering in all we do."
y=783 h=537 div.process-block-outer bg=rgb(255, 255, 255) pad=0px
  y=843 x=140 w=120 H2 "Plan"
  y=843 x=554 w=135 H2 "Build"
  y=843 x=968 w=225 H2 "Manage"
y=1320 h=620 div.case-study-post bg=rgb(44, 42, 41) pad=0px
  y=1505 x=1068 w=312 H3 "aviation Case Study"
y=1939 h=620 div.case-study-post bg=rgb(44, 42, 41) pad=0px
  y=2125 x=60 w=312 H3 "healthcare Case Study"
y=2559 h=620 div.case-study-post bg=rgb(44, 42, 41) pad=0px
  y=2709 x=1068 w=312 H3 "science-technology Case Study"
  y=3324 x=100 w=1240 H3 "Hensel Phelps News Center"
  y=3483 btn "All News" 110x30 bg=rgb(166, 25, 46) border=0px rgb(255, 255, 255) r=5px pad=7px 20px
  y=3802 x=138 w=234 H2 "Airport Construction Innovation: Stoppin..."
  y=3802 x=448 w=234 H2 "Hensel Phelps Projects Earn National Rec..."
  y=3802 x=758 w=234 H2 "Ground Blessings Mark Start of Oahu and ..."
  y=3802 x=1068 w=234 H2 "Downtown Redmond Link Extension Wins ENR..."
  y=4157 x=138 w=234 H2 "Building Federal Facilities Faster With ..."
  y=4157 x=448 w=234 H2 "Building Stronger Federal Outcomes Throu..."
  y=4157 x=758 w=234 H2 "Construction Inclusion Week 2026: Buildi..."
  y=4157 x=1068 w=234 H2 "Hensel Phelps Begins Construction on Lan..."
  y=4600 x=120 w=640 H3 "Build Your Own Legacy"
y=4914 h=301 footer.footer bg=rgb(255, 255, 255) pad=30px 0px 26px

## Animations on load

## Animations while scrolling
- background-color | header.header.is-sticky | 250ms ease-in-out | backgroundColor:rgba(0, 0, 0, 0)→rgb(44, 42, 41) computedOffset:0→1
- top | div.projects-menu.menu-content | 250ms +500ms ease-in-out | top:13px→14px computedOffset:0→1
- top | div.projects-menu.menu-content | 250ms +500ms ease-in-out | top:58px→70px computedOffset:0→1
- top | header.header.is-sticky | 250ms ease-in-out | top:0px→-110px computedOffset:0→1

## ScrollTrigger
- none

## Hover
- header a: no change | transition all
- a[class*=btn], a[class*=button], button: no change | transition all
- img: no change | transition all
