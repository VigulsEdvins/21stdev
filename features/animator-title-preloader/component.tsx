"use client"

// Animator Title Preloader — a loading gate staged as an animation studio's
// title card, and the load is the production pipeline. A blue-pencil rough of
// your title sketches itself in, construction lines and all. Each letter is
// then inked as an outline and painted in, popping with squash and stretch.
// A hand-lettered kicker and your name write themselves on with a broad nib,
// and two painted hands in patterned sweaters reach in from the corners to
// hold the word. Every hand-drawn line boils like real drawings on twos.
//
// At 100 the hands grip, then fling away; an iris closes on the little mascot,
// who winks, and the iris reopens onto your page.
//
// One file, React only. Lettering is the Hershey script and sans single-stroke
// fonts (public domain), inlined below, so any ASCII text writes itself on
// without fetching a font. Hands, mascot and trinkets are inline SVG. Every
// rule in the scoped <style> is .atp- prefixed and nothing is fetched.

import * as React from "react"

export type AnimatorPreset = "ember" | "dusk" | "paper"

export interface AnimatorPalette {
  /** Stage background. */
  stage: string
  /** Hand-lettered lines. */
  ink: string
  /** HUD, trinkets and mascot. */
  muted: string
  /** Blue-pencil rough. */
  rough: string
  /** Misregistered offset printed under the rough. */
  ghost: string
  /** Bold title gradient: start, middle, end. */
  word0: string
  word1: string
  word2: string
  /** Sweater: light, mid, shadow. */
  sleeve0: string
  sleeve1: string
  sleeve2: string
  /** Sweater swirls. */
  pattern: string
  /** Sweater speckles. */
  speck: string
  /** Hands: light, mid, shadow. */
  skin0: string
  skin1: string
  skin2: string
  nail: string
  cuff: string
}

export interface AnimatorTitlePreloaderProps {
  /** Content revealed once the iris opens. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Run forever as a showcase: children are never revealed, onComplete never fires. */
  loop?: boolean
  /** Real loading progress, 0–100. Leave undefined to simulate over `durationMs`. */
  progress?: number
  /** Length of the simulated load. Defaults to 7000ms. */
  durationMs?: number
  /** Hand-lettered line above the title. Empty string hides it. */
  kicker?: string
  /** The bold word the hands hold. */
  title?: string
  /** Small hand-lettered line under the title. Empty string hides it. */
  connector?: string
  /** Your name, written last with a flourish. Empty string hides it. */
  name?: string
  /** Top-right HUD line. */
  meta?: string
  /** Top-left HUD line, like a slate. */
  scene?: string
  /** Length of the frame counter in the HUD. Defaults to 120 (five seconds at 24fps). */
  frames?: number
  /** Colourway. Defaults to "ember". */
  preset?: AnimatorPreset
  /** Colour overrides, merged over the preset. */
  palette?: AnimatorPaletteInput
  /** The two painted hands. Defaults to true. */
  hands?: boolean
  /** The blue-pencil rough pass over the title. Defaults to true. */
  rough?: boolean
  /** The little spectacled mascot the iris closes on. Defaults to true. */
  mascot?: boolean
  /** Corner type, pipeline and frame counter. Defaults to true. */
  hud?: boolean
  /** Reshuffles the hand wobble in the lettering and the rough. */
  seed?: number
  /** Accessible name of the progress bar. */
  label?: string
  /** Face for the bold title. */
  displayFamily?: string
  /** Face for the HUD. */
  monoFamily?: string
  /** Root height. A definite length, never a percentage. */
  height?: string
  /** Fired once, after the iris has opened onto the page. */
  onComplete?: () => void
  className?: string
}

const PRESETS: AnimatorPresetMap = {
  ember: {
    stage: "#151413", ink: "#f6efe4", muted: "#9a8b77", rough: "#27e1f2", ghost: "#ff2e88",
    word0: "#f8bd8a", word1: "#fde3c4", word2: "#ffffff",
    sleeve0: "#f3672f", sleeve1: "#e4432b", sleeve2: "#a51b2e", pattern: "#ffa15a", speck: "#3d0a12",
    skin0: "#ff4a83", skin1: "#e01a5c", skin2: "#9c0e43", nail: "#ff9dbd", cuff: "#c0143e",
  },
  dusk: {
    stage: "#0f1424", ink: "#f3ecdf", muted: "#8791a8", rough: "#ffd23f", ghost: "#ff5d73",
    word0: "#ffd8a8", word1: "#fff0dc", word2: "#ffffff",
    sleeve0: "#2aa198", sleeve1: "#16786f", sleeve2: "#0b4a4a", pattern: "#f2c14e", speck: "#06222a",
    skin0: "#d98a5e", skin1: "#b4673f", skin2: "#7a3f22", nail: "#efb391", cuff: "#e2a12c",
  },
  paper: {
    stage: "#efe7da", ink: "#1f1a16", muted: "#8a7d6c", rough: "#1aa6d9", ghost: "#ef4f7e",
    word0: "#2a1f1a", word1: "#3b2c24", word2: "#151110",
    sleeve0: "#4a6cf0", sleeve1: "#2f4fd0", sleeve2: "#1b2c86", pattern: "#a9c2ff", speck: "#0b1340",
    skin0: "#f6b08c", skin1: "#e08e66", skin2: "#a85a3c", nail: "#ffd3bd", cuff: "#ec4b2f",
  },
}

const DISPLAY_STACK = '"Inter Display", Inter, "SF Pro Display", "Helvetica Neue", "Segoe UI", Arial, sans-serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'
const FALLBACK_SCRIPT = '"Segoe Script", "Bradley Hand", "Snell Roundhand", "Brush Script MT", cursive'

const STAGES = ["Rough", "Ink", "Paint", "Final"]
const GRIP_MS = 520
const HOLD_MS = 1150
const FLING_MS = 760
const IRIS_MS = 900
const WINK_MS = 760
const SHUT_MS = 300
const REVEAL_MS = 1000
const FADE_MS = 600
// How steeply the arms rise from the lower corners: shallow on landscape,
// steep on a portrait screen, where the hands hold the word from below.
const ARM_DEG = 24
const ARM_DEG_TALL = 52

// #region lettering
// Pure helpers, lifted out and executed by tests/animator-title-preloader.test.mjs.

/**
 * Hershey "Script 1-stroke" and "Sans 1-stroke" for ASCII 33–126, from the
 * hersheytext package (MIT) of the public-domain Hershey fonts. One glyph per
 * "|": its first char is the half-width, then space-separated strokes of
 * x,y pairs, every value stored as its char code minus 50.
 */
export const ATP_SCRIPT = "8:3947@ :47@ :3;47@ 5F4G5H6G5F|;937: :37: B3@: C3@:|==/6O C/<O 6<D< 5BCB|=>/6L C/;L D7C8D9E8E7D5C4@3<39476788:9;@?BA 789:@>A?BABDAF@G=H9H6G5F4D4C5B6C5D|>G35H :3<5<7;99:7:58566483:3<4?5B5E4G3 CAAB@D@FBHDHFGGEGCEACA|?I;H<I=J<J;I:H:F;D=?E=G;H8H5G4E4C5A6@8?==?<A:B8B6A4?3=4<6<9=?>B@EBGDHFHGFGE 8H6G5E5C6A7@== <9=>>A@DBFDGFGGF|8:594:3;4;5:789|:A/=2:5886<5A5E6J7M8O =2:68:7=6B6G7L8O|9;/<1=4>9>==B;F9I6L2O ;/<2=7=<<A;D9H6L|;<3<? 76A< A67<|??6?H 6?H?|85H4G5F6G6H5J3L|?6?H?|77F6G7H8G7F|=J/0O|=>3;496796<5@5C6F7G9H;H>G@EBBC?D;D8C5B4@3>3 >3<4:6897<6@6C7F9H ;H=G?EABB?C;C8B5@3|=>79H @3:H @3=6:889 ?6;889|=97:899888795:4=3@3C4D6D8C:A<>>:@7B5D3H @3B4C6C8B:@<:@ 4F5E7E<G?GAFBD 7E<H?HAGBD|=97:899888795:4=3@3C4D6D8C:@<== @3B4C6C8B:@< ;===@>A?BABDAF@G=H9H6G5F4D4C5B6C5D ==?>@?AAAD@F?G=H|=B4<H C3=H C34BDB|=;36= ;3E3 ;4@4E3 6=7<:;=;@<A=B?BBAE?G<H9H6G5F4D4C5B6C5D =;?<@=A?AB@E>G<H|=C6B7C8D7D6C4A3>3;496796<5@5D6F7G9H<H?GAEBCB@A>@=><;<9=7?6A >3<4:6897<6@6E7G <H>G@EACA?@=|=8369 E3D6B9=?;B:D9H B9<?:B9D8H 76:3<3A6 85:4<4A6C6D5E3|==3:495878:9<;=>=B<C;D9D6C4@3=3 =3;4:5979::<;= >=A<B;C9C6B4@3 ;=7>5@4B4E5G8H<H@GAFBDBAA?@>>= ;=8>6@5B5E6G8H <H?G@FADA@@>|=C:B<@>>?;?9>8=7;7886:4=3@3B4C5D7D;C?BB@E>G;H8H6G5E5D6C7D6E 9>8<8896;4=3 B4C6C;B?AB?E=G;H|88:7;8<9;8: 5F4G5H6G|88:7;8<9;8: 5H4G5F6G6H5J3L|>F66?FH|?6<H< 6BHB|>66F?6H|=97:899888795:4=3A3D4E6E8D:C;==;>;@<A>A A3C4D6D8C:B;@< :F9G:H;G:F|@D;C9A8>8<9;::=:@;B=C@CBBC@ >8<:;=;@<B=C D8C@CBECGCIAJ>J<I9H7F5D4A3>3;49577695<5?6B7D9F;G>HAHDGFFGE E8D@DBEC|;2H4G7D:@>9A3AH@E>B<@9>7>6?6A7C9E<G?HDH|=?5@6@9?=>@=B;E9G7H6H5G5D6?7<8::7<5>4A3D3F4G6G8F:E;C<@= ?=@=C>D?EAEDDFCGAH>H<G;E|<>9>:?;A;C:D8D6C4A3>3;496796;5?5C6F7G9H;H>G@EAC|>?3=4<6;::@9C8E6G4H2H1G1E2D4D6E8G;H>HAGCEEAF<F8E5D4B3?3=5=7>:@=B?EAGB|<@7@8A9C9D8D6C4@3<39486899;:<==:=7>6?5A5D6F7G:H=H@GBECC|<<9:9887684;3>3B4E4G3 B4@;>A<E:G8H6H4G3E3C4B6B8C ;=D=|>2H4G8C;><;=7=4<3;3:49699:;<<@<C;D:E8E>DCCEAG>H:H7G5E4C4A|>9:7967667493:3<4=6=8<<:B8F6H4H3G3E 9?B<D;G9I7J5J4I3H3F5D9B?ADAGBHCHEGFFHC|:@C>A<>;<:9:6;4<3>3?4@6@9?>=C<E:G8H6H4G3E3C4B6B8C|9<K:H8C7=7784:3<3=4>7>:=?:H8N7Q6S4T3S3Q4N6K8I;G?E|>9:7967667493:3<4=6=8<<:B8F6H4H3G3E J6J4I3H3F4D6B9@;><<< ><?>?E@GAHBHDGEFGC|<6?8?<>?<A:B8B5A3?3>4=6<;;@:C9E7G5H3H2G2E3D5D7E:G=H?HBGDE|A7:594746547383:4;6;8:=9A7H 9A<9>5?4A3B3D4E6E8D=CAAH CAF9H5I4K3L3N4O6O8N=LDLGMHNHPGQFSC|=7:594746547383:4;6;8:=9A7H 9A<9>5?4A3C3E4F6F8E=CDCGDHEHGGHFJC|=>3;496796;5?5C6F7G9H;H>G@EBBC@D<D8C5B4@3>3<5<8=;?>A@DBFC|??5@6@9?=>@=B;E9G7H6H5G5D6?7<8::7<5>4A3F3H4I5J7J:I<H=F>C>A=@<|>?9>;=<;=9=8;8996;4>3A3C4D6D:C=A@=D:F8G5H3H2G2E3D5D7E:G=H@HCGEE|??5@6@9?=>@=B;E9G7H6H5G5D6?7<8::7<5>4A3E3G4H5I7I:H<G=E>B>?=@>A@AEBGDHFGGFIC|<2H4G6E9A;>=:>7>4=3<3;4:6:8;:=<@>B@CBCDBFAG>H:H7G5E4C4A|;<9:9887684;3>3B4E4G3 B4@;>A<E:G8H6H4G3E3C4B6B8C|=7:594746547383:4;6;8:<9?8C8E9G;H=H?G@FBBE:G3 E:D>CDCGDHEHGGHFJC|=7:594746547383:4;6;8:<9?8C8F9H;H=G@DBAD=E:F6F4E3D3C4B6B8C;E=G>|?7:594746547383:4;6;9:H D3:H D3BH P3N4K7H;EABH|>:989787684:3<3>4?6?9=B=E>G@HBHDGEEECDBBB I6I4H3F3D4B6@9<B:E8G6H4H3G3E|=7:594746547383:4;6;8:<9?8C8E9G:H<H>G@EBBC@E: G3E:BD@J>O<S:T9S9Q:N<K?HBFGC|=?9>;=<;=9=8;8996;4>3A3C4D6D:C=AA>D:G8H5H4G4E5D8D:E;F<H<K;N:P8S6T5S5Q6N8K;H>FDC|96/6O 7/7O 6/=/ 6O=O|923@K|9;/;O </<O 5/</ 5O<O|:89:6<9 5<:7?< :7:H|:2JBJ|8;395878899:897|<;B:@8?6?4@3A2C2E3G5H7H9G:E<?;D;G<H=H?G@FBC|;2C4@7;8996948364564:3A3G4H5H7G9E:B:?;C<D>D@C|89A9@8?6?4@3A2C2E3G5H8H;F=C|<;B:@8?6?4@3A2C2E3G5H7H9G:E@3 <?;D;G<H=H?G@FBC|83F5E6D7B7@6?5?3@2B2E3G5H7H9G:F<C|72C6>8;99:6:49374664>1G.N-Q-S.T0S1P2G3H5H7G8F:C|;;B:@8?6?4@3A2C2E3G5H7H9G:F <?:F6Q5S3T2S2Q3N6K9I;H>FAC|<2C4@7;8996948364564:3@2H 2H3E4C6@8?:?;@;B:E:G;H<H>G?FAC|75:5;6;6:5: 2C4?2E2G3H4H6G7F9C|75:5;6;6:5: 2C4?.Q-S+T*S*Q+N.K1I3H6F9C|;2C4@7;8996948364564:3@2H 2H3E4C6@8?:?;@;B9C6C 6C8D9G:H;H=G>F@C|72C4@7;8996948364564:3A3G4H5H7G8F:C|>2C4@6?7@7A6E5H 6E7C9@;?=?>@>A=E<H =E>C@@B?D?E@EBDEDGEHFHHGIFKC|<2C4@6?7@7A6E5H 6E7C9@;?=?>@>B=E=G>H?HAGBFDC|:8?6?4@3A2C2E3G5H7H9G:F;D;B:@8?7@7B8D:E=E?D@C|:2C4@5>4B.T 4B5@7?9?;@<B<D;F:G8H 4G6H9H<G>FAC|;;B:@8?6?4@3A2C2E3G5H7H9G <?;B9G6N5Q5S6T8S9P9I;H>FAC|:2C4@5>5@8@9A9C8F8G9H:H<G=F?C|92C4@5>5@7C8E8G6H 2G4H8H:G;F=C|82C4@6< 933E3G4H6H8G9F;C 3;:;|;2C4?2E2G3H5H7G9E;B <?:E:G;H<H>G?FAC|;2C4?3D3G4H5H8G:E;B;? ;?<C=D?DAC|>5?3A2D2F3H5H7G9E ;?9E9G:H<H>G@EABA? A?BCCDEDGC|:2C4@6?8?9@9G:H=H@FBC ?@>?<?;@7G6H4H3G|;2C4?2E2G3H5H7G9E;B <?6Q5S3T2S2Q3N6K9I;H>FAC|:2C4@6?8?:A:C9E7G4H6I7K7N6Q5S3T2S2Q3N6K9I=F@C|9;/908173758798:::<8> 90828496:7;9;;:=6?:A;C;E:G9H8J8L9N 8@:B:D9F8G7I7K8M9N;O|66/6O|97/90:1;3;5:7988:8<:> 90:2:49687797;8=<?8A7C7E8G9H:J:L9N :@8B8D9F:G;I;K:M9N7O|>5B5@6=8<:<<=@@BADAF@G> 5@6>8=:=<>@ABBDBFAG>G<"
export const ATP_SANS = "7737A 7F6G7H8G7F|:636: >3>:|==/6O C/<O 6<D< 5BCB|<:/:L >/>L C6A4>3:37456586:7;9<?>A?B@CBCEAG>H:H7G5E|>G35H :3<5<7;99:7:58566483:3<4?5B5E4G3 CAAB@D@FBHDHFGGEGCEACA|?I<I;H:G:F;E=CBAE?G=H9H7G6F5D5B6@7?>;?:@8@6?4=3;4:6:8;;=>BEDGFHHHIGIF|775647384867869|9=/;194786=6A7F9J;M=O|95/7194;8<=<A;F9J7M5O|::9:E 5<?B ?<5B|??6?H 6?H?|67D6E5D6C7D7F5H|?6?H?|66C5D6E7D6C|=F/4O|<;384675<5?6D8G;H=H@GBDC?C<B7@4=3;3|<87:6=3=H|<68677584:3>3@4A5B7B9A;?>5HCH|<73B3<;?;A<B=C@CBBE@G=H:H7G6F5D|<?35ADA ?3?H|<A3736<7;::=:@;B=C@CBBE@G=H:H7G6F5D|<B6A4>3<394776<6A7E9G<H=H@GBECBCAB>@<=;<;9<7>6A|<C39H 53C3|<:37466687:9;=<@=B?CACDBFAG>H:H7G6F5D5A6?8=;<?;A:B8B6A4>3:3|<B:A=??<@;@8?6=5:596684;3<3?4A6B:B?AD?G<H:H7G6E|66<5=6>7=6< 6C5D6E7D6C|66<5=6>7=6< 7D6E5D6C7D7F5H|>F66?FH|?6<H< 6BHB|>66F?6H|;5857657493=3?4@5A7A9@;?<;>;A ;F:G;H<G;F|@D;C9A8>8<9;::=:@;B=C@CBBC@ >8<:;=;@<B=C D8C@CBECGCIAJ>J<I9H7F5D4A3>3;49577695<5?6B7D9F;G>HAHDGFFGE E8D@DBEC|;;33H ;3CH 6A@A|<636H 63?3B4C5D7D9C;B<?= 6=?=B>C?DADDCFBG?H6H|=D8C6A4?3;39476685;5@6C7E9G;H?HAGCEDC|<636H 63=3@4B6C8D;D@CCBE@G=H6H|;636H 63C3 6=>= 6HCH|:636H 63C3 6=>=|=D8C6A4?3;39476685;5@6C7E9G;H?HAGCEDCD@ ?@D@|=636H D3DH 6=D=|6636H|:>3>C=F<G:H8H6G5F4C4A|<636H D36A ;<DH|9636H 6HBH|>636H 63>H F3>H F3FH|=636H 63DH D3DH|=;39476685;5@6C7E9G;H?HAGCEDCE@E;D8C6A4?3;3|<636H 63?3B4C5D7D:C<B=?>6>|=;39476685;5@6C7E9G;H?HAGCEDCE@E;D8C6A4?3;3 >DDJ|<636H 63?3B4C5D7D9C;B<?=6= ==DH|<C6A4>3:37456586:7;9<?>A?B@CBCEAG>H:H7G5E|::3:H 33A3|=636B7E9G<H>HAGCEDBD3|;33;H C3;H|>439H >39H >3CH H3CH|<53CH C35H|;33;=;H C3;=|<C35H 53C3 5HCH|96/6O 7/7O 6/=/ 6O=O|923@K|9;/;O </<O 5/</ 5O<O|::12? :1B?|;2ODO|6785:5<6=7<6;5<|<A:AH A=?;=:::8;6=5@5B6E8G:H=H?GAE|;636H 6=8;::=:?;A=B@BBAE?G=H:H8G6E|;A=?;=:::8;6=5@5B6E8G:H=H?GAE|<A3AH A=?;=:::8;6=5@5B6E8G:H=H?GAE|;5@A@A>@<?;=:::8;6=5@5B6E8G:H=H?GAE|9<3:384777H 4:;:|<A:AJ@M?N=O:O8N A=?;=:::8;6=5@5B6E8G:H=H?GAE|<636H 6>9;;:>:@;A>AH|65364736253 6:6H|77384938273 8:8K7N5O3O|:636H @:6D :@AH|6636H|A6:6H 6>9;;:>:@;A>AH A>D;F:I:K;L>LH|<6:6H 6>9;;:>:@;A>AH|<::8;6=5@5B6E8G:H=H?GAEBBB@A=?;=:::|;6:6O 6=8;::=:?;A=B@BBAE?G=H:H8G6E|<A:AO A=?;=:::8;6=5@5B6E8G:H=H?GAE|86:6H 6@7=9;;:>:|;@=?;<:9:6;5=6?8@=A?B@D@E?G<H9H6G5E|9737D8G:H<H 4:;:|<6:6D7G9H<H>GAD A:AH|:4::H @::H|=5:9H =:9H =:AH E:AH|;5:@H @:5H|:4::H @::H8L6N4O3O|;@:5H 5:@: 5H@H|9;/908173758798:::<8> 90828496:7;9;;:=6?:A;C;E:G9H8J8L9N 8@:B:D9F8G7I7K8M9N;O|66/6O|97/90:1;3;5:7988:8<:> 90:2:49687797;8=<?8A7C7E8G9H:J:L9N :@8B8D9F:G;I;K:M9N7O|>5B5@6=8<:<<=@@BADAF@G> 5@6>8=:=<>@ABBDBFAG>G<"

/** Small fast seeded PRNG (mulberry32): same seed, same wobble. */
export function atpRandom(seed: number) {
  let a = (seed >>> 0) || 1
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A believable network: a quick start, two stalls, a sprint to the end.
const SIM_KEYS = [0, 0, 0.1, 16, 0.26, 33, 0.38, 38, 0.56, 63, 0.68, 68, 0.86, 92, 1, 100]

/** The simulated load at time fraction t ∈ [0, 1]: smoothstepped keyframes, monotonic, 0 → 100. */
export function atpSimulated(t: number) {
  const k = t < 0 ? 0 : t > 1 ? 1 : t
  for (let i = 2; i < SIM_KEYS.length; i += 2) {
    if (k <= SIM_KEYS[i]) {
      const a = SIM_KEYS[i - 2]
      const u = (k - a) / (SIM_KEYS[i] - a)
      return SIM_KEYS[i - 1] + (SIM_KEYS[i + 1] - SIM_KEYS[i - 1]) * u * u * (3 - 2 * u)
    }
  }
  return 100
}

/** Decode a packed font into [{ half, strokes: [[x, y, x, y, ...], ...] }] indexed by charCode - 33. */
export function atpDecode(data: string) {
  return data.split("|").map((g) => {
    const strokes = g
      .slice(1)
      .split(" ")
      .filter((s) => s.length > 1)
      .map((s) => {
        const pts = [] as number[]
        for (let i = 0; i + 1 < s.length; i += 2) pts.push(s.charCodeAt(i) - 50, s.charCodeAt(i + 1) - 50)
        return pts
      })
    return { half: g.charCodeAt(0) - 50, strokes }
  })
}

/** True when every char of the text has a glyph (printable ASCII). */
export function atpSupported(text: string) {
  return /^[\x20-\x7e]*$/.test(text)
}

/**
 * Lay a line of text out as strokes in font units (cap height ≈ 21, baseline
 * at y = 22). Each glyph gets its own small tilt, scale and baseline drift and
 * every point a little tremor, so the line reads as written, not typeset.
 */
export function atpLayout(
  text: string,
  font: { half: number; strokes: number[][] }[],
  opts: { seed: number; jitter: number; condense: number; tracking: number; space: number; capGap: number },
) {
  const rand = atpRandom(opts.seed)
  const strokes = [] as number[][]
  let pen = 0
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const ch of text) {
    const g = ch === " " ? null : font[ch.charCodeAt(0) - 33]
    if (!g || !g.strokes.length) {
      pen += opts.space
      continue
    }
    let gx0 = Infinity
    let gx1 = -Infinity
    for (const s of g.strokes) for (let i = 0; i < s.length; i += 2) {
      gx0 = Math.min(gx0, s[i])
      gx1 = Math.max(gx1, s[i])
    }
    const cx = (gx0 + gx1) / 2
    const rot = (rand() - 0.5) * 0.07
    const sc = 1 + (rand() - 0.5) * 0.07
    const dy = (rand() - 0.5) * opts.jitter * 2.2
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    for (const s of g.strokes) {
      const out = [] as number[]
      for (let i = 0; i < s.length; i += 2) {
        const lx = (s[i] - cx) * sc
        const ly = (s[i + 1] - 14) * sc
        const x = (pen + (cx - gx0) + lx * cos - ly * sin) * opts.condense + (rand() - 0.5) * opts.jitter
        const y = 14 + lx * sin + ly * cos + dy + (rand() - 0.5) * opts.jitter
        out.push(x, y)
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
      strokes.push(out)
    }
    pen += gx1 - gx0 + opts.tracking + (ch >= "A" && ch <= "Z" ? opts.capGap : 0)
  }
  if (!strokes.length) return { strokes, x0: 0, y0: 0, x1: 1, y1: 22, lengths: [] as number[] }
  const lengths = strokes.map((s) => {
    let l = 0
    for (let i = 2; i < s.length; i += 2) l += Math.hypot(s[i] - s[i - 2], s[i + 1] - s[i - 1])
    return l
  })
  return { strokes, x0, y0, x1, y1, lengths }
}

/**
 * A broad-nib pen stroke: one parallelogram per segment, swept by a nib of
 * half-vector (nx, ny), every quad wound the same way so nonzero fill unions
 * them into one calligraphic stroke with thick and thin.
 */
export function atpNib(pts: number[], nx: number, ny: number) {
  const r = (v: number) => Math.round(v * 100) / 100
  let d = ""
  for (let i = 2; i < pts.length; i += 2) {
    const ax = pts[i - 2]
    const ay = pts[i - 1]
    const bx = pts[i]
    const by = pts[i + 1]
    const cross = (bx - ax) * ny - (by - ay) * nx
    const s = cross >= 0 ? 1 : -1
    d +=
      "M" + r(ax + nx * s) + " " + r(ay + ny * s) +
      "L" + r(bx + nx * s) + " " + r(by + ny * s) +
      "L" + r(bx - nx * s) + " " + r(by - ny * s) +
      "L" + r(ax - nx * s) + " " + r(ay - ny * s) + "Z"
  }
  return d
}

/** A polyline as a path. */
export function atpPath(pts: number[]) {
  const r = (v: number) => Math.round(v * 100) / 100
  let d = ""
  for (let i = 0; i < pts.length; i += 2) d += (i ? "L" : "M") + r(pts[i]) + " " + r(pts[i + 1])
  return pts.length === 2 ? d + "l0.01 0" : d
}

/** When letter i of n is inked and painted, as load percentages. */
export function atpBeats(i: number, n: number) {
  const k = n <= 1 ? 0 : i / (n - 1)
  return { ink: 34 + k * 38, paint: 50 + k * 40 }
}

/** Pipeline stage for a load percentage: 0 rough, 1 ink, 2 paint, 3 final. */
export function atpStage(pct: number) {
  return pct >= 100 ? 3 : pct >= 50 ? 2 : pct >= 34 ? 1 : 0
}

/** The HUD frame number for a load percentage, zero-padded to the length of `frames`. */
export function atpFrame(pct: number, frames: number) {
  const total = Math.max(1, Math.round(frames))
  const f = Math.round((Math.max(0, Math.min(100, pct)) / 100) * total)
  const w = Math.max(4, String(total).length)
  return { frame: String(f).padStart(w, "0"), total: String(total).padStart(w, "0") }
}

/** Hex → [r, g, b], or a fallback for anything that isn't #rgb / #rrggbb. */
export function atpHex(hex: string, fallback: number[]) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || "").trim())
  if (!m) return fallback
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
// #endregion

// ---- the hand, drawn once in local units ---------------------------------
// The fingertips sit at the origin and the arm runs off towards -x; the group
// is rotated so the arm rises from the lower corner. The right hand mirrors it.

const r1 = (v: number) => Math.round(v * 10) / 10

function handFinger(x0: number, y: number, len: number, h: number) {
  const r = h * 0.46
  const tx = x0 + len
  return (
    "M" + x0 + " " + r1(y - h / 2) +
    " Q" + r1(x0 + len * 0.5) + " " + r1(y - h * 0.56) + " " + r1(tx - r) + " " + r1(y - h * 0.46) +
    " A" + r1(r) + " " + r1(r) + " 0 0 1 " + r1(tx - r) + " " + r1(y + h * 0.46) +
    " Q" + r1(x0 + len * 0.5) + " " + r1(y + h * 0.56) + " " + x0 + " " + r1(y + h / 2) + "Z"
  )
}

function handNail(tx: number, y: number, h: number) {
  return (
    "M" + r1(tx - h * 0.62) + " " + r1(y - h * 0.3) +
    " Q" + r1(tx - h * 0.2) + " " + r1(y - h * 0.34) + " " + r1(tx - h * 0.1) + " " + r1(y - h * 0.04) +
    " Q" + r1(tx - h * 0.2) + " " + r1(y + h * 0.14) + " " + r1(tx - h * 0.62) + " " + r1(y + h * 0.1) + "Z"
  )
}

function spiral(cx: number, cy: number, turns: number, radius: number) {
  let d = ""
  const n = Math.round(40 * turns)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = t * turns * Math.PI * 2
    const r = 2 + radius * t
    d += (i ? " L" : "M") + r1(cx + Math.cos(a) * r) + " " + r1(cy + Math.sin(a) * r)
  }
  return d
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => r1(cx + Math.cos(a) * r) + " " + r1(cy + Math.sin(a) * r)
  return "M" + p(a0) + " A" + r + " " + r + " 0 " + (a1 - a0 > Math.PI ? 1 : 0) + " 1 " + p(a1)
}

const SWIRLS = [
  spiral(30, 34, 2.2, 20),
  spiral(92, 92, 1.6, 15),
  arc(96, 26, 14, 0.4, 3.6),
  arc(96, 26, 7, 0.6, 3.2),
  arc(26, 96, 12, 3.6, 6.6),
  arc(62, 62, 9, 1, 4),
].join(" ")

// [x0, y, length, thickness], pinky → index.
const FINGERS = [
  [-182, 58, 150, 40],
  [-182, 20, 172, 44],
  [-182, -22, 184, 46],
  [-186, -64, 180, 46],
]
const SLEEVE = "M-2100 -176 L-256 -118 Q-228 -116 -228 -96 L-220 104 Q-220 124 -244 124 L-2100 190 Z"
const SLEEVE_LIGHT = "M-2100 -176 L-256 -118 Q-238 -117 -232 -108 L-2100 -150 Z"
const PALM = "M-212 -96 Q-150 -112 -60 -100 L-40 70 Q-120 96 -212 90 Z"
const THUMB = "M-196 -92 C-150 -128 -90 -136 -30 -126 C-6 -122 4 -110 0 -98 C-4 -86 -18 -82 -34 -86 C-90 -96 -140 -86 -176 -58 Z"

function Hand({ id, side }: { id: string; side: "l" | "r" }) {
  return (
    <g filter={"url(#" + id + "-paint)"} transform={side === "r" ? "scale(-1 1)" : undefined}>
      <path d={SLEEVE} fill={"url(#" + id + "-sleeve)"} />
      <path d={SLEEVE} fill={"url(#" + id + "-swirl)"} />
      <path d={SLEEVE_LIGHT} fill="#fff" opacity=".16" />
      <path d={PALM} fill="var(--atp-skin2)" />
      {FINGERS.map(([x0, y, len, h], i) => (
        <g key={i}>
          <path d={handFinger(x0, y, len, h)} fill={"url(#" + id + "-skin)"} />
          <path d={handNail(x0 + len, y, h)} fill="var(--atp-nail)" opacity=".78" />
          <path
            d={"M" + r1(x0 + len * 0.42) + " " + r1(y - h * 0.36) + " q" + r1(len * 0.12) + " " + r1(-h * 0.08) + " " + r1(len * 0.26) + " " + r1(-h * 0.02)}
            fill="none" stroke="var(--atp-nail)" strokeWidth="3.2" strokeLinecap="round" opacity=".8"
          />
          <path
            d={"M" + r1(x0 + len * 0.62) + " " + r1(y - h * 0.3) + " q-4 " + r1(h * 0.3) + " 0 " + r1(h * 0.6)}
            fill="none" stroke="var(--atp-skin2)" strokeWidth="2.6" strokeLinecap="round" opacity=".7"
          />
        </g>
      ))}
      <g className="atp-thumb">
        <path d={THUMB} fill="var(--atp-skin0)" />
        <path d="M-150 -116 C-110 -128 -70 -130 -34 -124" fill="none" stroke="var(--atp-nail)" strokeWidth="3.5" strokeLinecap="round" opacity=".85" />
        <path d={handNail(0, -106, 34)} fill="var(--atp-nail)" opacity=".85" />
      </g>
      <rect x="-268" y="-128" width="78" height="258" rx="28" fill="var(--atp-cuff)" />
      <rect x="-254" y="-124" width="12" height="250" rx="6" fill="#fff" opacity=".2" />
      <rect x="-216" y="-124" width="8" height="250" rx="4" fill="#000" opacity=".22" />
    </g>
  )
}

// ---- hand-lettered lines ---------------------------------------------------

type Laid = ReturnType<typeof atpLayout>

function ScriptLine({
  laid, text, maskId, filterId, on, duration, className, flourish,
}: {
  laid: Laid
  text: string
  maskId: string
  filterId: string
  on: boolean
  duration: number
  className: string
  flourish?: boolean
}) {
  if (!atpSupported(text)) {
    return (
      <span className={"atp-line atp-fallback " + className} data-on={on ? "1" : "0"} style={{ fontFamily: FALLBACK_SCRIPT }} aria-hidden="true">
        {text}
      </span>
    )
  }
  const strokes = laid.strokes.slice()
  const lengths = laid.lengths.slice()
  let y1 = laid.y1
  if (flourish && strokes.length) {
    // A swash under the whole name: in from the left, a loop, out to the right.
    const a = laid.x0 - 2
    const b = laid.x1 + 6
    const w = b - a
    const by = laid.y1 + 3
    const pts = [] as number[]
    for (let i = 0; i <= 48; i++) {
      const t = i / 48
      const x = a + w * t - Math.sin(t * Math.PI * 2) * w * 0.03
      const y = by + Math.sin(t * Math.PI) * 2.4 - Math.max(0, Math.sin((t - 0.78) * Math.PI * 4.5)) * 5 * (t > 0.78 ? 1 : 0)
      pts.push(x, y)
    }
    strokes.push(pts)
    lengths.push(w * 1.1)
    y1 = by + 3.5
  }
  const pad = 4
  const vx = laid.x0 - pad
  const vy = Math.min(laid.y0, -2) - pad
  const vw = laid.x1 - laid.x0 + pad * 2 + (flourish ? 8 : 0)
  const vh = Math.max(y1, 30) - vy + pad
  const total = lengths.reduce((s, l) => s + l, 0) || 1
  const pause = 0.03
  const span = 1 + pause * strokes.length
  let acc = 0
  const nib = 1.3
  const angle = (-38 * Math.PI) / 180
  const nx = Math.cos(angle) * nib
  const ny = Math.sin(angle) * nib
  return (
    <svg
      className={"atp-line " + className}
      data-on={on ? "1" : "0"}
      viewBox={r1(vx) + " " + r1(vy) + " " + r1(vw) + " " + r1(vh)}
      style={{ width: r1(vw / 21) + "em", height: r1(vh / 21) + "em" }}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={vx} y={vy} width={vw} height={vh}>
          <g fill="none" stroke="#fff" strokeWidth={nib * 3.4} strokeLinecap="round" strokeLinejoin="round">
            {strokes.map((s, i) => {
              const start = (acc / total + pause * i) / span
              acc += lengths[i]
              const len = lengths[i] / total / span
              return (
                <path
                  key={i}
                  className="atp-w"
                  d={atpPath(s)}
                  pathLength={1}
                  style={{ transitionDelay: Math.round(start * duration) + "ms", transitionDuration: Math.max(40, Math.round(len * duration)) + "ms" }}
                />
              )
            })}
          </g>
        </mask>
      </defs>
      <g mask={"url(#" + maskId + ")"} filter={"url(#" + filterId + ")"}>
        <path d={strokes.map((s) => atpNib(s, nx, ny)).join("")} fill="currentColor" />
        <path d={strokes.map(atpPath).join("")} fill="none" stroke="currentColor" strokeWidth={nib * 0.55} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

// ---- the scoped stylesheet --------------------------------------------------

const ATP_CSS = `
.atp-root { position: relative; width: 100%; overflow: hidden; isolation: isolate; }
.atp-gate {
  position: absolute; inset: 0; z-index: 2; overflow: hidden; outline: none;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  transition: opacity 600ms cubic-bezier(.65,0,.35,1);
}
.atp-gate[data-phase="fade"] { opacity: 0; }
.atp-gate:focus-visible .atp-stage { box-shadow: inset 0 0 0 2px var(--atp-rough); }
.atp-backdrop { position: absolute; inset: 0; background: #0a0a0a; }
.atp-stage {
  position: absolute; inset: 0; overflow: hidden; background: var(--atp-stage); color: var(--atp-ink);
  container-type: size; cursor: pointer;
}
.atp-stage svg { max-width: none; }
.atp-vignette {
  position: absolute; inset: 0; pointer-events: none; z-index: 5;
  background: radial-gradient(120% 90% at 50% 46%, transparent 52%, rgba(0,0,0,var(--atp-vig)) 100%);
}
.atp-grain {
  position: absolute; left: -60px; top: -60px; width: calc(100% + 120px); height: calc(100% + 120px);
  pointer-events: none; z-index: 6; opacity: var(--atp-grain); mix-blend-mode: var(--atp-grain-blend);
  animation: atp-grain 0.5s steps(1) infinite;
}
@keyframes atp-grain {
  0% { transform: translate(0, 0); } 25% { transform: translate(-31px, 17px); }
  50% { transform: translate(23px, -27px); } 75% { transform: translate(-13px, -41px); }
}
.atp-card {
  position: absolute; left: 50%; top: 50%; z-index: 3; display: flex; flex-direction: column; align-items: center;
  transform: translate(-50%, -50%); width: max-content; max-width: 100%;
}
.atp-kickrow { position: relative; display: flex; align-items: flex-start; justify-content: center; gap: 0.9em; font-size: calc(var(--atp-word-size) * 0.27); color: var(--atp-ink); }
.atp-kicker { margin-bottom: 0.15em; }
.atp-line { display: block; overflow: visible; flex: none; }
.atp-line .atp-w { stroke-dasharray: 1 2; stroke-dashoffset: 1.001; transition-property: stroke-dashoffset; transition-timing-function: linear; }
.atp-line[data-on="1"] .atp-w { stroke-dashoffset: 0; }
.atp-fallback {
  font-size: 1.5em; line-height: 1.2; white-space: nowrap; clip-path: inset(0 100% 0 0);
  transition: clip-path 1400ms cubic-bezier(.4,0,.2,1);
}
.atp-fallback[data-on="1"] { clip-path: inset(0 -10% 0 0); }
.atp-trinket { width: 1.05em; height: 2.4em; color: var(--atp-muted); transform-origin: 50% 0; opacity: 0; transform: translateY(-0.6em) rotate(0deg); transition: opacity 500ms ease, transform 900ms cubic-bezier(.3,1.6,.5,1); }
.atp-stage[data-trinkets="1"] .atp-trinket { opacity: 1; transform: none; animation: atp-swing 2.6s ease-in-out 900ms infinite; }
.atp-trinket.atp-t2 { animation-delay: 1.3s !important; }
@keyframes atp-swing { 0%, 100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
.atp-titlewrap { position: relative; margin: 0.06em 0 0.02em; }
.atp-word {
  position: relative; z-index: 2; display: block; white-space: nowrap; margin: 0;
  font-family: var(--atp-display); font-weight: 900; line-height: 0.92; letter-spacing: -0.045em;
  font-size: var(--atp-word-size); color: transparent; transform-origin: 50% 60%;
}
.atp-gate[data-phase="grip"] .atp-word { animation: atp-squeeze 520ms cubic-bezier(.3,0,.3,1) both; }
.atp-gate[data-phase="fling"] .atp-word { animation: atp-stretch 760ms cubic-bezier(.2,.8,.3,1) both; }
@keyframes atp-squeeze { 0% { transform: none; } 45% { transform: scale(.955, 1.05); } 100% { transform: scale(.985, 1.015); } }
@keyframes atp-stretch { 0% { transform: scale(.985, 1.015); } 22% { transform: scale(.94, 1.07); } 55% { transform: scale(1.05, .95); } 100% { transform: none; } }
.atp-ch { position: relative; display: inline-block; opacity: 0; transform-origin: 50% 85%; }
.atp-ch[data-ink="1"] { opacity: 1; animation: atp-pop 640ms cubic-bezier(.2,.9,.3,1) both; }
@keyframes atp-pop {
  0% { opacity: 0; transform: translateY(-0.18em) scale(.55, 1.45); }
  38% { opacity: 1; transform: translateY(0.02em) scale(1.22, .78); }
  62% { transform: translateY(-0.03em) scale(.93, 1.08); }
  82% { transform: scale(1.03, .97); }
  100% { opacity: 1; transform: none; }
}
.atp-ink { -webkit-text-stroke: max(1.5px, 0.014em) var(--atp-ink); color: transparent; transition: -webkit-text-stroke-color 600ms ease; }
.atp-paint {
  position: absolute; left: 0; top: 0; pointer-events: none;
  background: linear-gradient(90deg, var(--atp-word0), var(--atp-word1) 55%, var(--atp-word2));
  background-size: var(--atp-ww, 100%) 100%; background-position: var(--atp-gx, 0) 0;
  -webkit-background-clip: text; background-clip: text; color: transparent;
  clip-path: inset(100% -10% -10% -10%); transition: clip-path 760ms cubic-bezier(.6,0,.2,1);
}
.atp-ch[data-paint="1"] .atp-paint { clip-path: inset(-10% -10% -10% -10%); }
.atp-ch[data-paint="1"] .atp-ink { -webkit-text-stroke-color: transparent; transition-delay: 500ms; }
.atp-rough { position: absolute; left: 0; top: 0; z-index: 3; overflow: visible; pointer-events: none; }
.atp-rough path { stroke-dasharray: 1 2; stroke-dashoffset: 1.001; }
.atp-rough path { transition: opacity 900ms ease; }
.atp-stage[data-final="1"] .atp-rough path[data-keep="0"] { opacity: 0; }
.atp-handslot { position: absolute; z-index: 1; width: 0; height: 0; }
.atp-hand { position: absolute; left: 0; top: 0; will-change: transform; }
.atp-hand svg { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: visible; }
.atp-thumb { transform-box: fill-box; transform-origin: 0% 100%; transition: transform 420ms cubic-bezier(.3,1.5,.5,1); }
.atp-gate[data-phase="grip"] .atp-thumb, .atp-gate[data-phase="hold"] .atp-thumb { transform: rotate(5deg) translateY(4px); }
.atp-ofrow { font-size: calc(var(--atp-word-size) * 0.14); margin-top: 0.4em; }
.atp-namerow { font-size: calc(var(--atp-word-size) * 0.28); margin-top: 0.25em; }
.atp-mascot { width: calc(var(--atp-word-size) * 0.62); margin-top: calc(var(--atp-word-size) * 0.17); color: var(--atp-muted); overflow: visible; }
.atp-mascot .atp-mdraw { stroke-dasharray: 1 2; stroke-dashoffset: 1.001; transition: stroke-dashoffset 700ms cubic-bezier(.5,0,.3,1); }
.atp-mascot .atp-mdot { opacity: 0; transform-box: fill-box; transform-origin: 50% 50%; transform: scale(0); transition: opacity 300ms ease, transform 500ms cubic-bezier(.3,1.8,.5,1); }
.atp-stage[data-mascot="1"] .atp-mdraw { stroke-dashoffset: 0; }
.atp-stage[data-mascot="1"] .atp-mdot { opacity: 1; transform: none; }
.atp-stage[data-mascot="1"] .atp-mdot.atp-d2 { transition-delay: 120ms; }
.atp-stage[data-mascot="1"] .atp-mdot.atp-d3 { transition-delay: 240ms; }
.atp-eye { transform-box: fill-box; transform-origin: 50% 50%; opacity: 0; transition: opacity 300ms ease 500ms; animation: atp-blink 4.8s ease-in-out 2s infinite; }
.atp-stage[data-mascot="1"] .atp-eye { opacity: 1; }
@keyframes atp-blink { 0%, 93%, 100% { transform: scaleY(1); } 96% { transform: scaleY(.1); } }
.atp-lid { opacity: 0; }
.atp-gate[data-phase="wink"] .atp-eye.atp-e2, .atp-gate[data-phase="shut"] .atp-eye.atp-e2 { opacity: 0; }
.atp-gate[data-phase="wink"] .atp-lid, .atp-gate[data-phase="shut"] .atp-lid { opacity: 1; }
.atp-gate[data-phase="wink"] .atp-mascot { animation: atp-nod 760ms cubic-bezier(.3,1.4,.5,1) both; }
@keyframes atp-nod { 0% { transform: none; } 30% { transform: translateY(-6%) rotate(-6deg); } 100% { transform: rotate(-3deg); } }
.atp-hud {
  position: absolute; z-index: 7; font-family: var(--atp-mono); font-size: 10px; letter-spacing: .2em;
  text-transform: uppercase; color: var(--atp-muted); white-space: nowrap; pointer-events: none;
  transition: opacity 500ms ease;
}
.atp-tl { left: clamp(16px, 3vw, 36px); top: clamp(16px, 3vw, 30px); }
.atp-tr { right: clamp(16px, 3vw, 36px); top: clamp(16px, 3vw, 30px); }
.atp-bl { left: clamp(16px, 3vw, 36px); bottom: clamp(16px, 3vw, 28px); display: flex; gap: 14px; }
.atp-br { right: clamp(16px, 3vw, 36px); bottom: clamp(16px, 3vw, 28px); font-variant-numeric: tabular-nums; }
.atp-br b { color: var(--atp-ink); font-weight: 500; }
.atp-step { position: relative; padding-left: 11px; opacity: .55; transition: opacity 400ms ease, color 400ms ease; }
.atp-step::before {
  content: ""; position: absolute; left: 0; top: 50%; width: 5px; height: 5px; margin-top: -3px; border-radius: 50%;
  border: 1px solid currentColor; transition: background-color 400ms ease;
}
.atp-step[data-on="1"] { opacity: 1; color: var(--atp-ink); }
.atp-step[data-on="1"]::before { background: var(--atp-rough); border-color: var(--atp-rough); }
.atp-step[data-done="1"] { opacity: .8; }
.atp-step[data-done="1"]::before { background: currentColor; }
.atp-pegs { position: absolute; left: 50%; top: 0; z-index: 4; transform: translateX(-50%); display: flex; align-items: center; gap: 64px; padding-top: 14px; pointer-events: none; }
.atp-peg { background: rgba(0,0,0,var(--atp-peg)); box-shadow: inset 0 1px 2px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05); border-radius: 99px; }
.atp-gate[data-phase="fling"] .atp-hud, .atp-gate[data-phase="iris"] .atp-hud, .atp-gate[data-phase="wink"] .atp-hud,
.atp-gate[data-phase="shut"] .atp-hud, .atp-gate[data-phase="reveal"] .atp-hud { opacity: 0; }
.atp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (max-width: 560px) {
  .atp-bl { gap: 9px; letter-spacing: .14em; }
  .atp-tl { display: none; }
  .atp-pegs { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .atp-grain, .atp-eye, .atp-trinket, .atp-stage[data-trinkets="1"] .atp-trinket { animation: none !important; }
  .atp-ch[data-ink="1"] { animation: none; }
  .atp-gate[data-phase] .atp-word, .atp-gate[data-phase] .atp-mascot { animation: none; }
  .atp-line .atp-w, .atp-paint, .atp-thumb, .atp-mascot .atp-mdraw { transition-duration: 1ms !important; transition-delay: 0ms !important; }
  .atp-fallback { transition: none; }
}
`

// ---- the gate ---------------------------------------------------------------

const SCRIPT_FONT = { cache: null as ReturnType<typeof atpDecode> | null }
const SANS_FONT = { cache: null as ReturnType<typeof atpDecode> | null }
const scriptFont = () => SCRIPT_FONT.cache || (SCRIPT_FONT.cache = atpDecode(ATP_SCRIPT))
const sansFont = () => SANS_FONT.cache || (SANS_FONT.cache = atpDecode(ATP_SANS))

const SCRIPT_OPTS = { jitter: 0.3, condense: 0.86, tracking: 0.3, space: 9, capGap: 2 }

type Box = { x: number; w: number }
type Metrics = { boxes: Box[]; base: number; size: number; ww: number; wh: number; tall: boolean }

export default function AnimatorTitlePreloader({
  children,
  loop = false,
  progress,
  durationMs = 7000,
  kicker = "An Animation",
  title = "Portfolio",
  connector = "of",
  name = "Kedhareswer",
  meta = "Showreel · 2026",
  scene = "Sc. 01 — Title card",
  frames = 120,
  preset = "ember",
  palette,
  hands = true,
  rough = true,
  mascot = true,
  hud = true,
  seed = 11,
  label = "Loading portfolio",
  displayFamily = DISPLAY_STACK,
  monoFamily = MONO_STACK,
  height = "100svh",
  onComplete,
  className = "",
}: AnimatorTitlePreloaderProps) {
  const colors = { ...(PRESETS[preset] || PRESETS.ember), ...(palette || {}) }
  const stageRgb = atpHex(colors.stage, [21, 20, 19])
  const lightStage = stageRgb[0] * 0.3 + stageRgb[1] * 0.59 + stageRgb[2] * 0.11 > 150
  const uid = "atp" + React.useId().replace(/[^a-zA-Z0-9]/g, "")

  const rootRef = React.useRef(null as HTMLDivElement | null)
  const gateRef = React.useRef(null as HTMLDivElement | null)
  const stageRef = React.useRef(null as HTMLDivElement | null)
  const backdropRef = React.useRef(null as HTMLDivElement | null)
  const cardRef = React.useRef(null as HTMLDivElement | null)
  const wordRef = React.useRef(null as HTMLParagraphElement | null)
  const probeRef = React.useRef(null as HTMLSpanElement | null)
  const roughRef = React.useRef(null as SVGGElement | null)
  const handLRef = React.useRef(null as HTMLDivElement | null)
  const handRRef = React.useRef(null as HTMLDivElement | null)
  const mascotRef = React.useRef(null as SVGSVGElement | null)
  const pupilRefs = React.useRef([] as (SVGCircleElement | null)[])

  const [phase, setPhase] = React.useState("draw")
  const [pct, setPct] = React.useState(0)
  const [run, setRun] = React.useState(0)
  const [reduced, setReduced] = React.useState(false)
  const [metrics, setMetrics] = React.useState(null as Metrics | null)
  const [fit, setFit] = React.useState(1)
  const fitRef = React.useRef(1)

  const phaseRef = React.useRef(phase)
  phaseRef.current = phase
  const progressRef = React.useRef(progress)
  progressRef.current = progress
  const onCompleteRef = React.useRef(onComplete)
  onCompleteRef.current = onComplete
  const optsRef = React.useRef({ durationMs, loop })
  optsRef.current = { durationMs, loop }
  const rushRef = React.useRef(false)
  const irisOpenRef = React.useRef(null as { x: number; y: number } | null)
  const pointerRef = React.useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const letters = React.useMemo(() => Array.from(title), [title])
  const kickLaid = React.useMemo(() => atpLayout(kicker, scriptFont(), { seed: seed + 1, ...SCRIPT_OPTS }), [kicker, seed])
  const ofLaid = React.useMemo(() => atpLayout(connector, scriptFont(), { seed: seed + 2, ...SCRIPT_OPTS }), [connector, seed])
  const nameLaid = React.useMemo(() => atpLayout(name, scriptFont(), { seed: seed + 3, ...SCRIPT_OPTS }), [name, seed])

  // Measure every letter of the bold word so the rough, the gradient and the
  // hands can be laid onto it, and shrink the word until the hands have room.
  // Layout offsets, not bounding rects, so a letter mid-pop measures true.
  // Re-measured on resize and once fonts settle.
  React.useLayoutEffect(() => {
    const word = wordRef.current
    const probe = probeRef.current
    const stage = stageRef.current
    if (!word || !probe || !stage) return
    const measure = () => {
      const ww = word.offsetWidth
      const sw = stage.clientWidth
      if (!ww || !sw) return
      const tall = stage.clientHeight > sw * 1.15
      const room = sw * (tall ? 0.74 : sw > 720 ? 0.6 : 0.7)
      const natural = ww / fitRef.current
      // A portrait screen has height to spare, so the word may grow past its base size there.
      const fit = Math.min(tall ? 1.5 : 1, room / natural)
      if (Math.abs(fit - fitRef.current) > 0.005) {
        fitRef.current = fit
        setFit(fit)
        return
      }
      const boxes = [] as Box[]
      word.querySelectorAll(".atp-ch").forEach((el) => {
        const ch = el as HTMLElement
        boxes.push({ x: ch.offsetLeft, w: ch.offsetWidth })
      })
      const size = parseFloat(getComputedStyle(word).fontSize) || 100
      const next = { boxes, base: probe.offsetTop, size, ww, wh: word.offsetHeight, tall }
      setMetrics((m) =>
        m && m.tall === tall && m.ww === next.ww && m.wh === next.wh && m.base === next.base && m.boxes.length === boxes.length && m.boxes.every((b, i) => b.x === boxes[i].x)
          ? m
          : next,
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(word)
    ro.observe(stage)
    let alive = true
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => alive && measure())
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [title, displayFamily, run, fit])

  // The rough pass: construction lines, then two loose passes of a sans
  // skeleton per letter, as one ordered list of strokes.
  const roughStrokes = React.useMemo(() => {
    if (!metrics || !rough) return [] as { d: string; w: number; a: number; b: number; guide?: boolean; keep?: boolean }[]
    const font = sansFont()
    const rand = atpRandom(seed + 9)
    const { boxes, base, size } = metrics
    const cap = size * 0.72
    const s = cap / 21
    const out = [] as { d: string; w: number; pts: number[]; guide?: boolean; keep?: boolean }[]
    // Like an animator's clean-up, most of the rough is erased once the title
    // is painted. The first letter keeps its blue pencil, and so do the last
    // three, unless they are bare stems, whose rough is just a line.
    const kept = (i: number) =>
      letters.length < 4 || i === 0 || (i >= letters.length - 3 && !/[\sIJLTiljtf1!|.,'-]/.test(letters[i]))
    const left = (boxes[0] ? boxes[0].x : 0) - size * 0.12
    const last = boxes[boxes.length - 1]
    const right = (last ? last.x + last.w : metrics.ww) + size * 0.16
    const guide = (y: number, k: number) => {
      const pts = [] as number[]
      for (let i = 0; i <= 8; i++) {
        const t = i / 8
        pts.push(left + (right - left) * t + (rand() - 0.5) * 2, y + (rand() - 0.5) * size * 0.012 + k * t * size * 0.02)
      }
      out.push({ d: atpPath(pts), w: Math.max(1, size * 0.005), pts, guide: true })
    }
    guide(base, 0.4)
    guide(base - cap, -0.3)
    letters.forEach((ch, i) => {
      const box = boxes[i]
      const g = ch === " " ? null : font[ch.charCodeAt(0) - 33]
      if (!box || !g) return
      let gx0 = Infinity
      let gx1 = -Infinity
      for (const st of g.strokes) for (let k = 0; k < st.length; k += 2) {
        gx0 = Math.min(gx0, st[k])
        gx1 = Math.max(gx1, st[k])
      }
      const gcx = (gx0 + gx1) / 2
      const cx = box.x + box.w / 2
      for (let pass = 0; pass < 2; pass++) {
        const sx = s * (pass ? 1.04 : 0.98) * (1.12 + (rand() - 0.5) * 0.08)
        const sy = s * (pass ? 1.03 : 1)
        const rot = (rand() - 0.5) * 0.08
        const ox = (rand() - 0.5) * size * 0.03 + (pass ? size * 0.012 : 0)
        const oy = (rand() - 0.5) * size * 0.02
        const cos = Math.cos(rot)
        const sin = Math.sin(rot)
        for (const st of g.strokes) {
          const pts = [] as number[]
          for (let k = 0; k < st.length; k += 2) {
            const lx = (st[k] - gcx) * sx
            const ly = (st[k + 1] - 22) * sy
            pts.push(
              cx + ox + lx * cos - ly * sin + (rand() - 0.5) * size * 0.008,
              base + oy + lx * sin + ly * cos + (rand() - 0.5) * size * 0.008,
            )
          }
          out.push({ d: atpPath(pts), w: size * (pass ? 0.009 : 0.018), pts, keep: kept(i) })
        }
      }
    })
    const lens = out.map((o) => {
      let l = 0
      for (let k = 2; k < o.pts.length; k += 2) l += Math.hypot(o.pts[k] - o.pts[k - 2], o.pts[k + 1] - o.pts[k - 1])
      return Math.max(l, size * 0.02)
    })
    const total = lens.reduce((a, b) => a + b, 0) || 1
    let acc = 0
    return out.map((o, i) => {
      const a = acc / total
      acc += lens[i]
      return { d: o.d, w: o.w, a, b: acc / total, guide: o.guide, keep: o.keep }
    })
  }, [metrics, letters, rough, seed])

  const armRef = React.useRef(ARM_DEG)
  const roughListRef = React.useRef(roughStrokes)
  roughListRef.current = roughStrokes

  // The animation loop: progress, the rough pass, the hands, the pointer,
  // the exit and the iris. Everything continuous is written straight to the
  // DOM; React only hears about whole-percent steps and phase changes.
  React.useEffect(() => {
    const stage = stageRef.current
    const gate = gateRef.current
    const backdrop = backdropRef.current
    if (!stage || !gate || !backdrop) return
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let shown = 0
    let pctLast = -1
    let last = performance.now()
    const started = last
    let phaseAt = last
    let local = "draw"
    let irisX = 0
    let irisY = 0
    let irisMax = 1
    let roughEls = null as SVGPathElement[] | null
    let roughFor = null as unknown
    const opening = irisOpenRef.current
    irisOpenRef.current = null

    const go = (p: string, now: number) => {
      local = p
      phaseAt = now
      setPhase(p)
    }

    const setIris = (el: HTMLElement, r: number, inside: boolean) => {
      const R = Math.max(0, r)
      const g = inside
        ? "radial-gradient(circle at " + irisX + "px " + irisY + "px, #000 " + R + "px, transparent " + (R + 1.5) + "px)"
        : "radial-gradient(circle at " + irisX + "px " + irisY + "px, transparent " + R + "px, #000 " + (R + 1.5) + "px)"
      el.style.webkitMaskImage = g
      el.style.maskImage = g
    }
    const clearIris = (el: HTMLElement) => {
      el.style.webkitMaskImage = ""
      el.style.maskImage = ""
    }
    const aimIris = () => {
      const gr = gate.getBoundingClientRect()
      const target = mascotRef.current || wordRef.current
      if (target) {
        // The mascot's face sits a little below the middle of its box.
        const r = target.getBoundingClientRect()
        irisX = r.left + r.width / 2 - gr.left
        irisY = r.top + r.height * (mascotRef.current ? 0.56 : 0.5) - gr.top
      } else {
        irisX = gr.width / 2
        irisY = gr.height / 2
      }
      irisMax = Math.hypot(Math.max(irisX, gr.width - irisX), Math.max(irisY, gr.height - irisY)) + 4
    }
    if (opening) {
      irisX = opening.x
      irisY = opening.y
      const gr = gate.getBoundingClientRect()
      irisMax = Math.hypot(Math.max(irisX, gr.width - irisX), Math.max(irisY, gr.height - irisY)) + 4
      setIris(stage, 0, true)
    }

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
    const easeIn = (t: number) => t * t * t
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(64, now - last)
      last = now
      const o = optsRef.current
      const ph = local
      const since = now - phaseAt

      // ---- progress ----
      if (ph === "draw") {
        const real = progressRef.current
        const t = (now - started) / Math.max(1200, o.durationMs)
        let target = real === undefined ? atpSimulated(t) : Math.max(0, Math.min(100, Number(real) || 0))
        if (rushRef.current) target = 100
        // Never faster than 100% in 2.6s (1.1s when rushed): every beat gets to play.
        const cap = (dt / (rushRef.current ? 1100 : 2600)) * 100
        const ease = 1 - Math.exp(-dt / 160)
        shown = isReduced ? target : Math.min(target, shown + Math.min(cap, Math.max(0.02, (target - shown) * ease)))
        if (target >= 100 && shown > 99.6) shown = 100
        const p = Math.floor(shown)
        if (p !== pctLast) {
          pctLast = p
          setPct(p)
        }
        if (shown >= 100) go(isReduced ? "hold" : "grip", now)
      } else if (ph === "grip" && since > GRIP_MS) go("hold", now)
      else if (ph === "hold" && since > (isReduced ? 900 : HOLD_MS)) {
        if (isReduced) {
          if (o.loop) replay(null)
          else go("fade", now)
        } else {
          go("fling", now)
        }
      } else if (ph === "fling" && since > FLING_MS) {
        aimIris()
        go("iris", now)
      } else if (ph === "iris" && since > IRIS_MS) go("wink", now)
      else if (ph === "wink" && since > WINK_MS) go("shut", now)
      else if (ph === "shut" && since > SHUT_MS) {
        if (o.loop) {
          replay({ x: irisX, y: irisY })
          return
        }
        go("reveal", now)
      } else if (ph === "reveal" && since > REVEAL_MS) go("open", now)
      else if (ph === "fade" && since > FADE_MS) go("open", now)

      // ---- iris ----
      if (opening) {
        const k = clamp((now - started) / REVEAL_MS)
        if (k < 1) setIris(stage, irisMax * easeOut(k), true)
        else clearIris(stage)
      }
      if (ph === "iris") {
        const r0 = (mascotRef.current ? mascotRef.current.getBoundingClientRect().width : 80) * 0.64
        setIris(stage, r0 + (irisMax - r0) * (1 - easeInOut(clamp(since / IRIS_MS))), true)
      } else if (ph === "wink") {
        const r0 = (mascotRef.current ? mascotRef.current.getBoundingClientRect().width : 80) * 0.64
        setIris(stage, r0, true)
      } else if (ph === "shut") {
        const r0 = (mascotRef.current ? mascotRef.current.getBoundingClientRect().width : 80) * 0.64
        setIris(stage, r0 * (1 - easeIn(clamp(since / SHUT_MS))), true)
      } else if (ph === "reveal" || ph === "open") {
        stage.style.visibility = "hidden"
        setIris(backdrop, irisMax * easeOut(clamp(since / REVEAL_MS)) * (ph === "open" ? 2 : 1), false)
      }

      // ---- the pointer, eased ----
      const pt = pointerRef.current
      pt.x += (pt.tx - pt.x) * 0.08
      pt.y += (pt.ty - pt.y) * 0.08
      const card = cardRef.current
      if (card && !isReduced) card.style.transform = "translate(calc(-50% + " + (pt.x * 7).toFixed(2) + "px), calc(-50% + " + (pt.y * 5).toFixed(2) + "px))"
      pupilRefs.current.forEach((el) => {
        if (el) el.setAttribute("transform", "translate(" + (pt.x * 3.2).toFixed(2) + " " + (pt.y * 2.4).toFixed(2) + ")")
      })

      // ---- the rough pass, drawn with the load ----
      const rg = roughRef.current
      if (rg) {
        if (roughFor !== roughListRef.current || !roughEls || !roughEls[0] || !roughEls[0].isConnected) {
          roughFor = roughListRef.current
          roughEls = Array.from(rg.querySelectorAll("path"))
        }
        const k = ph === "draw" ? clamp((shown - 4) / 48) : 1
        for (const el of roughEls) {
          const a = Number(el.dataset.a)
          const b = Number(el.dataset.b)
          const v = clamp((k - a) / Math.max(1e-6, b - a))
          const off = v >= 1 ? "0" : v <= 0 ? "1.001" : (1 - v).toFixed(4)
          if (el.style.strokeDashoffset !== off) el.style.strokeDashoffset = off
        }
      }

      // ---- the hands ----
      const hl = handLRef.current
      const hr = handRRef.current
      if (hl && hr) {
        const sw = stage.clientWidth
        const D = Math.max(sw, 700) * 0.85
        let reach = isReduced ? (shown >= 10 ? 1 : 0) : easeOut(clamp((shown - 10) / 62))
        let push = 0
        if (ph === "grip") push = Math.sin(clamp(since / GRIP_MS) * Math.PI) * 10
        if (ph === "hold") push = 3
        if (ph === "fling") {
          const t = clamp(since / FLING_MS)
          push = t < 0.24 ? Math.sin((t / 0.24) * (Math.PI / 2)) * 16 : 16 - easeIn((t - 0.24) / 0.76) * (D * 1.3)
          reach = 1
        }
        if (ph === "iris" || ph === "wink" || ph === "shut" || ph === "reveal" || ph === "open") reach = -0.6
        // Idle drift on twos: the hands move at 12fps like drawn animation.
        const tw = Math.floor((now - started) / 83.3) * 83.3
        const bob = isReduced ? 0 : Math.sin(tw / 620) * 3.2
        const tilt = isReduced ? 0 : Math.sin(tw / 910) * 0.8
        const along = -(1 - reach) * D + push
        const rad = (armRef.current * Math.PI) / 180
        const dx = along * Math.cos(rad)
        const dy = -along * Math.sin(rad)
        const py = isReduced ? 0 : pt.y * 9
        hl.style.transform = "translate(" + dx.toFixed(1) + "px," + (dy + bob + py).toFixed(1) + "px) rotate(" + (tilt + pt.y * 1.5).toFixed(2) + "deg)"
        hr.style.transform = "translate(" + (-dx).toFixed(1) + "px," + (dy - bob * 0.8 + py).toFixed(1) + "px) rotate(" + (-tilt - pt.y * 1.5).toFixed(2) + "deg)"
        const vis = reach > -0.55 ? "visible" : "hidden"
        if (hl.style.visibility !== vis) {
          hl.style.visibility = vis
          hr.style.visibility = vis
        }
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [run])

  // After the iris (or the fade) is fully open: hand over to the page.
  React.useEffect(() => {
    if (phase !== "open" || loop) return
    setPhase("done")
    onCompleteRef.current?.()
  }, [phase, loop])

  function replay(from: { x: number; y: number } | null) {
    rushRef.current = false
    irisOpenRef.current = from
    setPct(0)
    setPhase("draw")
    setRun((r) => r + 1)
  }

  const onActivate = () => {
    if (phaseRef.current === "draw") rushRef.current = true
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    pointerRef.current.tx = ((e.clientX - r.left) / r.width - 0.5) * 2
    pointerRef.current.ty = ((e.clientY - r.top) / r.height - 0.5) * 2
  }
  const onPointerLeave = () => {
    pointerRef.current.tx = 0
    pointerRef.current.ty = 0
  }

  const done = phase === "done"
  const showGate = loop || !done
  const final = phase !== "draw"
  const stage = final ? 3 : atpStage(pct)
  const counter = atpFrame(final ? 100 : pct, frames)
  const n = letters.length
  const fullTitle = [kicker, title, connector, name].filter(Boolean).join(" ")

  // Hands hold the word at its ends, scaled to its size.
  const armDeg = metrics && metrics.tall ? ARM_DEG_TALL : ARM_DEG
  armRef.current = armDeg
  const handScale = metrics ? metrics.size * (metrics.tall ? 0.0046 : 0.0036) : 0
  const handY = metrics ? metrics.base - metrics.size * 0.3 : 0
  const firstBox = metrics && metrics.boxes[0]
  const lastBox = metrics && metrics.boxes[metrics.boxes.length - 1]
  const handLX = firstBox && metrics ? firstBox.x + metrics.size * 0.05 : 0
  const handRX = lastBox && metrics ? lastBox.x + lastBox.w - metrics.size * 0.04 : 0

  return (
    <div
      ref={rootRef}
      className={"atp-root " + className}
      style={
        {
          height,
          "--atp-stage": colors.stage,
          "--atp-ink": colors.ink,
          "--atp-muted": colors.muted,
          "--atp-rough": colors.rough,
          "--atp-word0": colors.word0,
          "--atp-word1": colors.word1,
          "--atp-word2": colors.word2,
          "--atp-skin0": colors.skin0,
          "--atp-skin2": colors.skin2,
          "--atp-nail": colors.nail,
          "--atp-cuff": colors.cuff,
          "--atp-display": displayFamily,
          "--atp-mono": monoFamily,
          "--atp-vig": lightStage ? 0.16 : 0.55,
          "--atp-grain": lightStage ? 0.5 : 0.09,
          "--atp-grain-blend": lightStage ? "multiply" : "screen",
          "--atp-peg": lightStage ? 0.1 : 0.42,
          "--atp-word-size": "calc(min(" + Math.round(1400 / Math.max(n, 6)) / 10 + "cqw, 21cqh) * " + fit.toFixed(3) + ")",
        } as React.CSSProperties
      }
    >
      <style>{ATP_CSS}</style>
      {loop ? null : children}
      {showGate ? (
        <div
          ref={gateRef}
          className="atp-gate"
          data-phase={phase}
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={final ? 100 : pct}
          aria-valuetext={STAGES[stage] + ", " + (final ? 100 : pct) + "%"}
          tabIndex={0}
          onClick={onActivate}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onActivate()
            }
          }}
        >
          <div ref={backdropRef} className="atp-backdrop" />
          <div
            key={run}
            ref={stageRef}
            className="atp-stage"
            data-trinkets={pct >= 3 || final ? "1" : "0"}
            data-mascot={pct >= 88 || final ? "1" : "0"}
            data-final={final ? "1" : "0"}
          >
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
              <defs>
                <filter id={uid + "-boil"} x="-10%" y="-30%" width="120%" height="160%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="2" result="n">
                    {reduced ? null : <animate attributeName="seed" values="2;5;8" dur="0.375s" calcMode="discrete" repeatCount="indefinite" />}
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
                </filter>
                <filter id={uid + "-boilpx"} x="-5%" y="-20%" width="110%" height="140%" filterUnits="objectBoundingBox">
                  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="3" result="n">
                    {reduced ? null : <animate attributeName="seed" values="3;6;9" dur="0.375s" calcMode="discrete" repeatCount="indefinite" />}
                  </feTurbulence>
                  <feDisplacementMap in="SourceGraphic" in2="n" scale={metrics ? Math.max(2, metrics.size * 0.022) : 3} xChannelSelector="R" yChannelSelector="G" />
                </filter>
                <filter id={uid + "-paint"} x="-5%" y="-15%" width="110%" height="130%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="n" />
                  <feColorMatrix in="n" type="matrix" values="0 0 0 0 .1  0 0 0 0 0  0 0 0 0 .02  0 0 0 -1.7 1.08" result="dark" />
                  <feComposite in="dark" in2="SourceGraphic" operator="in" result="grain" />
                  <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="5" result="w" />
                  <feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G" result="wob" />
                  <feMerge>
                    <feMergeNode in="wob" />
                    <feMergeNode in="grain" />
                  </feMerge>
                </filter>
                <filter id={uid + "-grain"} x="0" y="0" width="100%" height="100%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" result="n" />
                  <feColorMatrix in="n" type="saturate" values="0" />
                </filter>
                <linearGradient id={uid + "-sleeve"} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={colors.sleeve0} />
                  <stop offset=".5" stopColor={colors.sleeve1} />
                  <stop offset="1" stopColor={colors.sleeve2} />
                </linearGradient>
                <linearGradient id={uid + "-skin"} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={colors.skin0} />
                  <stop offset=".55" stopColor={colors.skin1} />
                  <stop offset="1" stopColor={colors.skin2} />
                </linearGradient>
                <pattern id={uid + "-swirl"} width="124" height="124" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)">
                  <path d={SWIRLS} fill="none" stroke={colors.pattern} strokeWidth="4.5" strokeLinecap="round" opacity=".55" />
                  <circle cx="70" cy="18" r="3" fill={colors.speck} opacity=".6" />
                  <circle cx="8" cy="64" r="2.4" fill={colors.speck} opacity=".5" />
                  <circle cx="60" cy="108" r="1.8" fill={colors.speck} opacity=".55" />
                  <circle cx="112" cy="58" r="2.6" fill={colors.speck} opacity=".5" />
                  <circle cx="48" cy="80" r="1.4" fill={colors.speck} opacity=".5" />
                </pattern>
              </defs>
            </svg>

            <svg className="atp-grain" aria-hidden="true">
              <rect width="100%" height="100%" filter={"url(#" + uid + "-grain)"} />
            </svg>
            <div className="atp-vignette" aria-hidden="true" />

            <div className="atp-pegs" aria-hidden="true">
              <span className="atp-peg" style={{ width: 30, height: 10 }} />
              <span className="atp-peg" style={{ width: 13, height: 13 }} />
              <span className="atp-peg" style={{ width: 30, height: 10 }} />
            </div>

            {hud ? (
              <>
                {scene ? <div className="atp-hud atp-tl" aria-hidden="true">{scene}</div> : null}
                {meta ? <div className="atp-hud atp-tr" aria-hidden="true">{meta}</div> : null}
                <div className="atp-hud atp-bl" aria-hidden="true">
                  {STAGES.map((s, i) => (
                    <span key={s} className="atp-step" data-on={i === stage ? "1" : "0"} data-done={i < stage ? "1" : "0"}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="atp-hud atp-br" aria-hidden="true">
                  Fr <b>{counter.frame}</b> / {counter.total}
                </div>
              </>
            ) : null}

            <div ref={cardRef} className="atp-card">
              {kicker ? (
                <div className="atp-kickrow">
                  <Trinket className="atp-trinket" filterId={uid + "-boil"} />
                  <ScriptLine
                    laid={kickLaid}
                    text={kicker}
                    maskId={uid + "-mk"}
                    filterId={uid + "-boil"}
                    on={pct >= 1 || final}
                    duration={reduced ? 0 : 1600}
                    className="atp-kicker"
                  />
                  <Trinket className="atp-trinket atp-t2" filterId={uid + "-boil"} />
                </div>
              ) : null}

              <div className="atp-titlewrap">
                {hands && metrics ? (
                  <>
                    <div className="atp-handslot" style={{ left: handLX, top: handY }} aria-hidden="true">
                      <div ref={handLRef} className="atp-hand" style={{ visibility: "hidden" }}>
                        <svg>
                          <g transform={"scale(" + handScale + ") rotate(" + -armDeg + ")"}>
                            <Hand id={uid} side="l" />
                          </g>
                        </svg>
                      </div>
                    </div>
                    <div className="atp-handslot" style={{ left: handRX, top: handY }} aria-hidden="true">
                      <div ref={handRRef} className="atp-hand" style={{ visibility: "hidden" }}>
                        <svg>
                          <g transform={"scale(" + handScale + ") rotate(" + armDeg + ")"}>
                            <Hand id={uid} side="r" />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </>
                ) : null}

                <p
                  ref={wordRef}
                  className="atp-word"
                  aria-hidden="true"
                  style={metrics ? ({ "--atp-ww": metrics.ww + "px" } as React.CSSProperties) : undefined}
                >
                  {letters.map((ch, i) => {
                    const beat = atpBeats(i, n)
                    const box = metrics && metrics.boxes[i]
                    return (
                      <span
                        key={i}
                        className="atp-ch"
                        data-ink={pct >= beat.ink || final ? "1" : "0"}
                        data-paint={pct >= beat.paint || final ? "1" : "0"}
                        style={box ? ({ "--atp-gx": -box.x + "px" } as React.CSSProperties) : undefined}
                      >
                        <span className="atp-ink">{ch === " " ? " " : ch}</span>
                        <span className="atp-paint">{ch === " " ? " " : ch}</span>
                      </span>
                    )
                  })}
                  <span ref={probeRef} style={{ display: "inline-block", width: 0, height: 0 }} />
                </p>

                {rough && metrics ? (
                  <svg className="atp-rough" width={metrics.ww} height={metrics.wh} aria-hidden="true">
                    {/* The ghost is real paths, not a <use> clone: a clone of animated
                        paths makes Chrome re-filter the painted hands every frame. */}
                    <g ref={roughRef} filter={"url(#" + uid + "-boilpx)"} fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <g stroke={colors.ghost} opacity=".7" transform={"translate(" + (metrics.size * 0.014).toFixed(1) + " " + (metrics.size * 0.01).toFixed(1) + ")"}>
                        {roughStrokes.map((s, i) => (
                          <path key={i} d={s.d} strokeWidth={s.w} strokeOpacity={s.guide ? 0.5 : 1} pathLength={1} data-a={s.a} data-b={s.b} data-keep={s.keep ? "1" : "0"} />
                        ))}
                      </g>
                      <g stroke={colors.rough}>
                        {roughStrokes.map((s, i) => (
                          <path key={i} d={s.d} strokeWidth={s.w} strokeOpacity={s.guide ? 0.5 : 1} pathLength={1} data-a={s.a} data-b={s.b} data-keep={s.keep ? "1" : "0"} />
                        ))}
                      </g>
                    </g>
                  </svg>
                ) : null}
              </div>

              {connector ? (
                <div className="atp-ofrow">
                  <ScriptLine
                    laid={ofLaid}
                    text={connector}
                    maskId={uid + "-mo"}
                    filterId={uid + "-boil"}
                    on={pct >= 72 || final}
                    duration={reduced ? 0 : 500}
                    className="atp-of"
                  />
                </div>
              ) : null}

              {name ? (
                <div className="atp-namerow">
                  <ScriptLine
                    laid={nameLaid}
                    text={name}
                    maskId={uid + "-mn"}
                    filterId={uid + "-boil"}
                    on={pct >= 78 || final}
                    duration={reduced ? 0 : 1900}
                    className="atp-name"
                    flourish
                  />
                </div>
              ) : null}

              {mascot ? (
                <svg ref={mascotRef} className="atp-mascot" viewBox="0 0 120 84" aria-hidden="true">
                  <g filter={"url(#" + uid + "-boil)"} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <circle className="atp-mdot" cx="44" cy="12" r="2.4" fill="currentColor" stroke="none" />
                    <circle className="atp-mdot atp-d2" cx="60" cy="10" r="5" fill="currentColor" stroke="none" />
                    <circle className="atp-mdot atp-d3" cx="76" cy="12" r="2.4" fill="currentColor" stroke="none" />
                    <path className="atp-mdraw" pathLength={1} d="M58 52 C58 40 44 36 34 40 C22 45 22 62 34 65 C46 68 56 62 58 52 C60 62 70 68 82 65 C94 62 98 45 86 40 C76 36 62 40 62 52" />
                    <path className="atp-mdraw" pathLength={1} d="M22 46 C14 44 9 47 6 52 M98 46 C106 44 111 47 114 52" />
                    <g className="atp-eye atp-e1">
                      <circle ref={(el) => { pupilRefs.current[0] = el }} cx="40" cy="53" r="4.6" fill="currentColor" stroke="none" />
                    </g>
                    <g className="atp-eye atp-e2">
                      <circle ref={(el) => { pupilRefs.current[1] = el }} cx="80" cy="53" r="4.6" fill="currentColor" stroke="none" />
                    </g>
                    <path className="atp-lid" d="M71 54 Q80 59 89 54" />
                  </g>
                </svg>
              ) : null}
            </div>
          </div>
          <span className="atp-sr" aria-live="polite">
            {fullTitle + (final ? ". Loaded." : "")}
          </span>
        </div>
      ) : null}
    </div>
  )
}

function Trinket({ className, filterId }: { className: string; filterId: string }) {
  return (
    <svg className={className} viewBox="0 0 30 70" aria-hidden="true">
      <g filter={"url(#" + filterId + ")"} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 1 L15 16" />
        <circle cx="15" cy="21" r="4.4" />
        <path d="M15 27 C22 31 26 37 25 44 C24 52 19 57 15 63 C11 57 6 52 5 44 C4 37 8 31 15 27 Z" />
        <path d="M11 41 C13 38 17 38 19 41" opacity=".7" />
        <circle cx="15" cy="49" r="1.6" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}

// Declared after the JSX: the 21st CLI tokenizer hangs on mapped types before it.
export type AnimatorPaletteInput = { [K in keyof AnimatorPalette]?: string }
type AnimatorPresetMap = { [K in AnimatorPreset]: AnimatorPalette }
