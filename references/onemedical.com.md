# onemedical.com — Exceptional Primary Care - Find a Doctor Near You | One Medical
height 6773px · stack: plain · scripts: -
fonts: Ginto · GT Super Display · WistiaPlayerInterNumbersSemiBold
backgrounds: rgb(244, 244, 244) · rgb(255, 237, 206) · rgb(255, 255, 255) · rgb(245, 243, 239) · rgb(238, 246, 244) · rgb(0, 0, 0) · rgba(6, 132, 102, 0.85) · rgb(0, 84, 80)
text colours: rgb(255, 255, 255) · rgb(0, 77, 73) · rgb(244, 244, 244) · rgb(6, 132, 102) · rgb(171, 204, 118) · rgb(42, 41, 39) · rgb(0, 84, 80) · rgb(5, 120, 255)
header: top absolute h=78 bg=rgb(255, 255, 255) color=rgb(0, 77, 73) → scrolled fixed h=78 bg=rgb(255, 255, 255) color=rgb(0, 77, 73)

## Type styles (most used first)
- p Ginto 18px/31.5px w200 rgb(0, 77, 73) ×58 "Medicare Annual Enrollment is from Oct. "
- span Ginto 16px/24px w600 rgb(255, 255, 255) ×15 "Book an appointment"
- a GT Super Display 50px/53.55px w600 rgb(244, 244, 244) ×13 "Office locations"
- a Ginto 14px/24.5px w200 rgb(171, 204, 118) ×11 "One Medical Terms of Use"
- strong Ginto 18px/31.5px w700 rgb(42, 41, 39) ×5 "in-office and remote appointments"
- h2 GT Super Display 72px/72px w600 rgb(0, 77, 73) ×5 "Fall in love with your doctor’s office"
- button Ginto 14px/normal w600 rgb(0, 77, 73) ×4 "Locations"
- p Ginto 14px/24px w300 rgb(42, 41, 39) ×4 "Already a One Medical member? to apply t"
- h6 Ginto 14px/24.5px w600 ls1.4px uppercase rgb(6, 132, 102) ×3 "MENTAL HEALTH"
- h3 GT Super Display 32px/40px w500 rgb(0, 77, 73) ×3 "Care for your mental health"
- h2 GT Super Display 88px/94.248px w600 rgb(0, 77, 73) ×2 "Get care today for"
- span Ginto 18px/31.5px w600 rgb(0, 77, 73) ×1 "Discover Primary Care designed for adult"
- a Ginto 14px/24.5px w600 rgb(0, 84, 80) ×1 "Log in"
- a Ginto 14px/21px w600 rgb(255, 255, 255) ×1 "Sign up"
- div Ginto 16px/28px w600 uppercase rgb(244, 244, 244) ×1 "For You"
- h1 GT Super Display 72px/72px w500 rgb(5, 120, 255) ×1 "Primary care designed for you"
- h3 GT Super Display 48px/60px w600 rgb(255, 255, 255) ×1 "Membership costs only $99/year."
- span Ginto 20px/30px w600 rgb(255, 255, 255) ×1 "Learn more about membership"

## Sections, headings, buttons (page px)
  y=5890 btn "Sign up" 100x45 bg=rgb(0, 84, 80) border=0px rgb(255, 255, 255) r=36px pad=12px 14px
y=142 h=569 div.page-hero-single-col-alt bg=rgb(245, 243, 239) pad=0px
  y=240 x=60 w=614 H1 "Primary care designed for you"
y=711 h=532 div.page-hero-three-col-preview bg=rgb(238, 246, 244) pad=80px 108px 66px
  y=1054 x=108 w=368 H3 "Care for your mental health"
  y=1054 x=536 w=368 H3 "The annual physical, reimagined"
  y=1054 x=964 w=368 H3 "Finally, a pharmacy that really delivers"
  y=1322 x=206 w=1029 H2 "Get care today for"
  y=1694 x=309 w=823 H2 "Fall in love with your doctor’s office"
  y=2692 x=103 w=555 H2 "With the One Medical app you can:"
  y=3739 x=103 w=1234 H3 "Membership costs only $99/year."
  y=4361 x=103 w=1234 H2 "See what makes One Medical different"
y=4513 h=694 img.w-css-reset bg=rgb(0, 0, 0) pad=0px
  y=5327 x=103 w=1234 H2 "We're an employee benefit at 11,600+ companies"
  y=5887 x=309 w=823 H2 "Become a One Medical patient"
y=6211 h=563 footer.footer bg=rgb(0, 84, 80) pad=120px 102.857px 0px

## Animations on load
- fadeIn | nav.navigation.js-navigation | 1400ms ease | opacity:0→1 computedOffset:0→1
- slide-out | span.rotating-services__headline--highlight.is-hidden | 600ms ease | opacity:1→0 transform:translateY(0px)→translateY(100%) computedOffset:0→1
- slide-in | span.rotating-services__headline--highlight.is-visible | 600ms ease | opacity:0→1 transform:translateY(-100%)→translateY(0px) computedOffset:0→1

## Animations while scrolling
- fadeUp | div.rotating-services.js-scroll-target | 600ms ease | opacity:0→1 transform:translateY(20px)→none computedOffset:0→1
- opacity | img.image-base.js-lazy-load | 250ms linear | opacity:0→1 computedOffset:0→1
- fadeUp | div.services-media-block.row | 600ms ease | opacity:0→1 transform:translateY(20px)→none computedOffset:0→1
- fadeUp | div.logo-grid-cta.js-scroll-target | 600ms ease | opacity:0→1 transform:translateY(20px)→none computedOffset:0→1

## ScrollTrigger
- none

## Hover
- a[class*=btn], a[class*=button], button: no change | transition all
- img: no change | transition opacity 0.25s linear
