# autocamp.com — AutoCamp | Nature's Boutique Hotel
height 6540px · stack: swiper · scripts: d.adroll.comMDP2BXIHQZAV7EICAOSSHJ
fonts: MNKYBananaGrotesk-Regular · SuisseIntlMono-Regular · ABCArizonaMix-Light-Trial
backgrounds: rgb(245, 228, 196) · rgb(44, 38, 27) · rgb(255, 250, 234)
text colours: rgb(0, 0, 0) · rgb(255, 255, 255) · rgb(44, 38, 27)
header: top fixed h=90 bg=rgba(0, 0, 0, 0) color=rgb(0, 0, 0) → scrolled fixed h=90 bg=rgba(0, 0, 0, 0) color=rgb(0, 0, 0)

## Type styles (most used first)
- p MNKYBananaGrotesk-Regular 15px/21px w400 rgb(0, 0, 0) ×48 "The AutoCamp experience combines the bes"
- a SuisseIntlMono-Regular 15px/21px w400 uppercase rgb(0, 0, 0) ×32 "View Gallery"
- h2 ABCArizonaMix-Light-Trial 45px/49.5px w400 ls-2.25px rgb(0, 0, 0) ×23 "Inspired Design."
- a MNKYBananaGrotesk-Regular 15px/15px w400 rgb(0, 0, 0) ×16 "Home"
- span MNKYBananaGrotesk-Regular 25px/27.5px w400 rgb(255, 255, 255) ×10 "AutoCamp"
- h3 MNKYBananaGrotesk-Regular 25px/35px w400 rgb(0, 0, 0) ×3 "Wellness in Joshua Tree"
- button SuisseIntlMono-Regular 15px/15px w700 uppercase rgb(0, 0, 0) ×1 "BOOK NOW"
- button SuisseIntlMono-Regular 15px/15px w400 uppercase rgb(44, 38, 27) ×1 "Check Availability"
- h1 ABCArizonaMix-Light-Trial 75px/82.5px w400 ls-3.75px rgb(0, 0, 0) ×1 "Where boutique hotel meets nature escape"
- button ABCArizonaMix-Light-Trial 75px/75px w400 ls-3.75px lowercase rgb(0, 0, 0) ×1 "submit"

## Sections, headings, buttons (page px)
  y=5660 btn "BOOK NOW" 205x50 bg=rgb(255, 255, 0) border=0px rgb(0, 0, 0) r=0px pad=17.5px 30px
y=0 h=760 section.hero bg=rgba(0, 0, 0, 0) pad=0px
y=972 h=220 section.basic-text bg=rgba(0, 0, 0, 0) pad=0px
  y=972 x=130 w=1180 H1 "Where boutique hotel meets nature escape."
y=1202 h=217 section.text-columns bg=rgba(0, 0, 0, 0) pad=0px
  y=1202 x=130 w=418 H2 "Inspired Design."
  y=1202 x=892 w=418 H2 "Iconic Destinations."
y=1509 h=871 section.media-carousel bg=rgba(0, 0, 0, 0) pad=0px 0px 60px
  y=1973 btn "Learn More" 129x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
  y=2046 btn "View Offers" 139x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
  y=1983 btn "Learn More" 129x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
  y=2056 btn "View Offers" 139x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
  y=1962 btn "Learn More" 129x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
  y=2035 btn "View Offers" 139x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
y=2510 h=551 section.media-carousel bg=rgba(0, 0, 0, 0) pad=0px 0px 60px
y=3191 h=711 section.image-listings bg=rgba(0, 0, 0, 0) pad=0px
  y=3191 x=130 w=340 H3 "Wellness in Joshua Tree"
  y=3191 x=550 w=340 H3 "Explore our Offers and Rates"
  y=3191 x=970 w=340 H3 "Dine in the Catskills"
y=4032 h=551 section.media-carousel bg=rgba(0, 0, 0, 0) pad=0px 0px 60px
  y=4083 x=180 w=337 H2 "Corporate Meetings & Offsites"
  y=4397 btn "Learn More" 129x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
  y=4154 x=1650 w=337 H2 "Weddings & Events"
  y=4326 btn "Learn More" 129x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
y=4713 h=376 section.interstitial bg=rgba(0, 0, 0, 0) pad=0px
  y=4763 x=672 w=450 H2 "AutoCamp in the Headlines"
  y=5006 btn "EXPLORE PRESS" 158x33 bg=rgb(255, 255, 0) border=1px rgb(44, 38, 27) r=9999px pad=5px 15px
y=5219 h=397 section.text-carousel bg=rgba(0, 0, 0, 0) pad=0px
y=5616 h=924 footer. bg=rgba(0, 0, 0, 0) pad=0px
y=5746 h=794 div.bg-peach bg=rgb(245, 228, 196) pad=20px

## Animations on load

## Animations while scrolling
- transform | div.site-logo | 300ms ease | transform:none→translateY(-60px) computedOffset:0→1
- opacity | div.hi-widget-container.align-left | 300ms ease | opacity:1→0 computedOffset:0→1

## ScrollTrigger
- none

## Hover
- header a: no change | transition all
- a[class*=btn], a[class*=button], button: bg:rgb(255, 250, 234)→rgb(255, 255, 0) | transition all
- img: no change | transition all
