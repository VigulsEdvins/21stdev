# unyoked.co — Find An Unyoked Location | Unyoked
height 8975px · stack: plain · scripts: -
fonts: Plain · Pitch
backgrounds: rgb(6, 39, 11) · rgb(232, 222, 206) · rgb(240, 240, 212) · rgb(235, 206, 112) · rgb(4, 24, 7)
text colours: rgb(240, 240, 212) · rgb(6, 39, 11) · rgb(0, 0, 238) · rgb(255, 254, 246)
header: top fixed h=64 bg=rgba(0, 0, 0, 0) color=rgb(240, 240, 212) → scrolled fixed h=64 bg=rgb(240, 240, 212) color=rgba(0, 0, 0, 0.87)

## Type styles (most used first)
- p Pitch 16px/22.88px w400 rgb(240, 240, 212) ×28 "Just 1-3 hours from your doorstep. Far e"
- a Plain 17.1429px/22.8686px w500 rgb(240, 240, 212) ×10 "or, get personalised picks with our Cabi"
- h5 Plain 17.1429px/22.8686px w100 rgb(240, 240, 212) ×5 "Find your calm"
- h3 Plain 27.4286px/32.0091px w500 rgb(6, 39, 11) ×5 "Our cabins sit in quiet, yet easy to get"
- p Pitch 13.7143px/20.5714px w400 rgb(6, 39, 11) ×5 "Read | 5 min"
- h5 Plain 14px/18.676px w500 rgb(6, 39, 11) ×4 "The Science"
- h1 Plain 40px/46.68px w500 rgb(6, 39, 11) ×4 "Leave the noise behind."
- h4 Plain 22.8571px/28.2286px w500 rgb(6, 39, 11) ×4 "The calendar fills. The notifications pi"
- h2 Plain 34.2857px/41.1429px w500 rgb(6, 39, 11) ×3 "Personalised cabin recommendation?"
- h4 Plain 26px/32.11px w500 rgb(6, 39, 11) ×3 "Is Forest Bathing the cure to burnout yo"
- a Pitch 18px/25.74px w400 rgb(240, 240, 212) ×2 "Privacy"
- h1 Plain 64px/74.688px w500 rgb(240, 240, 212) ×1 "Switch off and slow down"
- h2 Plain 34.2857px/41.1428px w500 rgb(240, 240, 212) ×1 "In your own private off-grid cabin seclu"
- h3 Plain 32px/37.344px w500 rgb(6, 39, 11) ×1 "Sign up for our weekly newsletter"
- h1 Plain 46px/53.682px w500 rgb(6, 39, 11) ×1 "The most important meeting in your calen"

## Sections, headings, buttons (page px)
y=0 h=898 div.xbg bg=rgb(6, 39, 11) pad=0px
  y=284 x=334 w=772 H1 "Switch off and slow down"
  y=389 x=180 w=1080 H2 "In your own private off-grid cabin secluded in nat"
  y=1056 x=72 w=435 H1 "Leave the noise behind."
  y=1056 x=746 w=622 H3 "Our cabins sit in quiet, yet easy to get to, corne"
y=2134 h=780 div.MuiBox-root bg=rgb(232, 222, 206) pad=30px 0px 100px
  y=2343 x=216 w=459 H2 "Personalised cabin recommendation?"
  y=2459 x=216 w=459 H2 "Find your match in 30 seconds."
y=2914 h=1396 div.MuiBox-root bg=rgb(6, 39, 11) pad=40px 0px
  y=3034 x=72 w=498 H1 "Intentionally designed for presence, not performan"
  y=3927 x=54 w=303 H3 "Close Enough to Reach"
  y=3927 x=511 w=253 H3 "True Disconnection"
  y=3927 x=969 w=284 H3 "Simple, Safe, Comfort"
y=4311 h=956 div.MuiBox-root bg=rgb(240, 240, 212) pad=0px 158.391px 72px
  y=4383 x=158 w=1123 H3 "Sign up for our weekly newsletter"
  y=5440 x=144 w=1152 H2 "Don't know where to start? Take our Cabin Quiz and"
  y=5903 x=72 w=583 H1 ""I forgot what silence felt like.""
y=6608 h=1000 div.MuiBox-root bg=rgb(235, 206, 112) pad=64px 0px
  y=6702 x=72 w=560 H1 "Need to know a little more?"
  y=6702 x=746 w=622 H3 "Find the answers you're searching for with our 3 m"
  y=7865 x=864 w=432 H1 "The most important meeting in your calendar is wit"
y=8508 h=295 div.MuiGrid-root bg=rgb(4, 24, 7) pad=56px 32px

## Animations on load
- rotate | div.spinner | 1500ms linear ∞ | transform:rotate(0deg)→rotate(360deg) computedOffset:0→1
- rotate | div.spinner.xbg | 1500ms linear ∞ | transform:rotate(0deg)→rotate(360deg) computedOffset:0→1

## Animations while scrolling
- opacity | a.ssr-hero-cta | 300ms ease | opacity:1→0 computedOffset:0→1
- color | a.MuiTypography-root.MuiLink-root | 300ms ease | color:rgb(238, 239, 211)→rgb(6, 39, 11) computedOffset:0→1
- font-size | a.MuiTypography-root.MuiLink-root | 200ms ease | fontSize:0px→0px computedOffset:0→1
- font-weight | a.MuiTypography-root.MuiLink-root | 200ms ease | fontWeight:400→400 computedOffset:0→1
- border-bottom-color | a.MuiTypography-root.MuiLink-root | 200ms ease | borderBottomColor:rgb(240, 240, 212)→rgb(6, 39, 11) computedOffset:0→1
- color | a.MuiTypography-root.MuiLink-root | 200ms ease | color:rgb(228, 230, 202)→rgb(6, 39, 11) computedOffset:0→1
- color | a.MuiTypography-root.MuiLink-root | 298ms ease | color:rgb(238, 239, 211)→rgb(6, 39, 11) computedOffset:0→1
- visibility | a.MuiTypography-root.MuiLink-root | 300ms ease | visibility:visible→hidden computedOffset:0→1
- visibility | a.MuiTypography-root.MuiLink-root | 200ms ease | visibility:visible→hidden computedOffset:0→1
- border-bottom-color | button.MuiButtonBase-root.MuiButton-root | 250ms cubic-bezier(0.4, 0, 0.2, 1) | borderBottomColor:rgb(240, 240, 212)→rgb(6, 39, 11) computedOffset:0→1
- border-left-color | button.MuiButtonBase-root.MuiButton-root | 250ms cubic-bezier(0.4, 0, 0.2, 1) | borderLeftColor:rgb(240, 240, 212)→rgb(6, 39, 11) computedOffset:0→1
- border-right-color | button.MuiButtonBase-root.MuiButton-root | 250ms cubic-bezier(0.4, 0, 0.2, 1) | borderRightColor:rgb(240, 240, 212)→rgb(6, 39, 11) computedOffset:0→1
- border-top-color | button.MuiButtonBase-root.MuiButton-root | 250ms cubic-bezier(0.4, 0, 0.2, 1) | borderTopColor:rgb(240, 240, 212)→rgb(6, 39, 11) computedOffset:0→1
- color | a.MuiTypography-root.MuiLink-root | 200ms ease | color:rgb(6, 39, 11)→rgb(6, 39, 11) computedOffset:0→1
- color | a.MuiTypography-root.MuiLink-root | 200ms ease | color:rgb(228, 230, 202)→rgb(240, 240, 212) computedOffset:0→1
- MuiSkeleton-keyframes-pulse | span.MuiSkeleton-root.MuiSkeleton-text | 1500ms +500ms ease-in-out ∞ | opacity:1→1 computedOffset:0→1

## ScrollTrigger
- none

## Hover
- header a: no change | transition 0.3s
- a[class*=btn], a[class*=button], button: no change | transition background-color 0.15s cubic-bezier(0.4, 0, 0.2, 1)
- img: no change | transition all
