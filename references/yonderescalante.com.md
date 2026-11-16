# yonderescalante.com — Ofland Hotels
height 2096px · stack: plain · scripts: -
fonts: proxima-soft-condensed · Typoforge+Studio+-+Kapra+Neue+Pro+Medium+Condensed+Rounded
backgrounds: rgb(55, 46, 44) · rgb(145, 114, 68)
text colours: rgb(247, 243, 230) · rgb(255, 255, 255)
header: top static h=2096 bg=rgb(0, 0, 0) color=rgb(55, 46, 44) → scrolled static h=2096 bg=rgb(0, 0, 0) color=rgb(55, 46, 44)

## Type styles (most used first)
- span proxima-soft-condensed 19.456px/31.1296px w500 ls5.8368px uppercase rgb(247, 243, 230) ×6 "In Southern Utah"
- span Typoforge+Studio+-+Kapra+Neue+Pro+Medium+Condensed+Rounded 39.8464px/56.4703px w500 ls3.18771px uppercase rgb(247, 243, 230) ×4 "BOOK NOW FOR THE"
- a proxima-soft-condensed 17.728px/28.3648px w600 ls1.24096px uppercase rgb(247, 243, 230) ×2 "Escalante"
- a proxima-soft-condensed 12.544px/normal w700 ls2.63424px rgb(247, 243, 230) ×1 "Skip to Content"
- h1 Typoforge+Studio+-+Kapra+Neue+Pro+Medium+Condensed+Rounded 122.099px/138.167px w400 uppercase rgb(247, 243, 230) ×1 "outdoor boutique hotelS"
- p proxima-soft-condensed 17.728px/28.3648px w400 ls1.06368px rgb(247, 243, 230) ×1 "Ofland reimagines what a hotel near a na"
- p proxima-soft-condensed 14.272px/22.8352px w400 ls1.06368px rgb(247, 243, 230) ×1 "©2026 Ofland Hotels"

## Sections, headings, buttons (page px)
  y=19 btn "Skip to Content" 169x50 bg=rgba(153, 57, 33, 0.91) border=1px rgba(153, 57, 33, 0.91) r=0px pad=15.0528px 26.3424px
y=0 h=1837 main.container bg=rgba(0, 0, 0, 0) pad=0px
y=0 h=1837 section.region bg=rgba(0, 0, 0, 0) pad=0px
y=0 h=1024 section.page-section bg=rgba(0, 0, 0, 0) pad=141.984px 0px 0px
y=0 h=1024 div.section-border bg=rgb(55, 46, 44) pad=0px
y=0 h=1024 div.section-background bg=rgb(55, 46, 44) pad=0px
  y=756 x=223 w=994 H1 "outdoor boutique hotelS"
y=1024 h=812 section.page-section bg=rgba(0, 0, 0, 0) pad=0px
y=1024 h=812 div.section-border bg=rgb(55, 46, 44) pad=0px
y=1024 h=812 div.section-background bg=rgb(55, 46, 44) pad=0px
  y=1076 x=503 w=434 H3 "Follow us!"
y=1837 h=259 footer.sections bg=rgba(0, 0, 0, 0) pad=0px
y=1837 h=259 section.page-section bg=rgba(0, 0, 0, 0) pad=0px
y=1837 h=259 div.section-border bg=rgb(145, 114, 68) pad=0px
y=1837 h=259 div.section-background bg=rgb(145, 114, 68) pad=0px

## Animations on load
- opacity | p.preFade | 800ms +285ms ease | opacity:1→0 computedOffset:0→1
- opacity | h3.preSlide | 800ms +300ms ease | opacity:1→0 computedOffset:0→1
- transform | h3.preSlide | 800ms +300ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +449.99999999999994ms ease | opacity:1→0 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +449.99999999999994ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | div.fluid-image-animation-wrapper.sqs-image | 800ms +464.99999999999994ms ease | opacity:1→0 computedOffset:0→1
- transform | div.fluid-image-animation-wrapper.sqs-image | 800ms +464.99999999999994ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +480ms ease | opacity:1→0 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +480ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | p.sqsrte-large.preFade | 800ms +495ms ease | opacity:1→0 computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +510ms ease | opacity:1→0 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +510ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | p.sqsrte-large.preFade | 800ms +525ms ease | opacity:1→0 computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +540ms ease | opacity:1→0 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +540ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +554.9999999999999ms ease | opacity:1→0 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +554.9999999999999ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +570ms ease | opacity:1→0 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +570ms ease | transform:none→translate(0px, 30%) computedOffset:0→1
- opacity | p.sqsrte-small.preFade | 800ms +585ms ease | opacity:1→0 computedOffset:0→1

## Animations while scrolling
- opacity | p.preFade.fadeIn | 800ms +285ms ease | opacity:0→1 computedOffset:0→1
- opacity | h3.preSlide.slideIn | 800ms +300ms ease | opacity:0→1 computedOffset:0→1
- transform | h3.preSlide.slideIn | 800ms +300ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | img.loaded | 1000ms ease | opacity:0→1 computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +449.99999999999994ms ease | opacity:0→1 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +449.99999999999994ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | div.fluid-image-animation-wrapper.sqs-image | 800ms +464.99999999999994ms ease | opacity:0→1 computedOffset:0→1
- transform | div.fluid-image-animation-wrapper.sqs-image | 800ms +464.99999999999994ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +480ms ease | opacity:0→1 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +480ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | p.sqsrte-large.preFade | 800ms +495ms ease | opacity:0→1 computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +510ms ease | opacity:0→1 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +510ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | p.sqsrte-large.preFade | 800ms +525ms ease | opacity:0→1 computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +540ms ease | opacity:0→1 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +540ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +554.9999999999999ms ease | opacity:0→1 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +554.9999999999999ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | div.sqs-block-content.preSlide | 800ms +570ms ease | opacity:0→1 computedOffset:0→1
- transform | div.sqs-block-content.preSlide | 800ms +570ms ease | transform:translate(0px, 30%)→translate(0px) computedOffset:0→1
- opacity | p.sqsrte-small.preFade | 800ms +585ms ease | opacity:0→1 computedOffset:0→1

## ScrollTrigger
- none

## Hover
- header a: no change | transition opacity 0.1s linear
- a[class*=btn], a[class*=button], button: no change | transition opacity 0.1s linear
- [class*=card]: no change | transition all
- img: no change | transition all
