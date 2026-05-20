"use client"
import { useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const EMOJIS=[{q:"🤖⚡🌃",a:"CYBER ROBOT",o:["CYBER ROBOT","SLEEPY TOASTER","MOON PIZZA"]},{q:"🔔😂🚪",a:"DOORBELL PRANK",o:["DOORBELL PRANK","CAR RACE","RAIN CLOUD"]},{q:"🎮⚔️🏆",a:"GAME DUEL",o:["GAME DUEL","SANDWICH","SPACE TAX"]}]
export function EmojiDecodeGame({ update }: ArcadeGameComponentProps){const [idx,setIdx]=useState(0); const item=EMOJIS[idx%EMOJIS.length]; return <div className="space-y-2"><p className="text-3xl">{item.q}</p><div className="grid gap-2">{item.o.map((o)=><ArcadeGameButton key={o} color="#ff2d9c" label={o} onClick={()=>{const ok=o===item.a; update(ok?"win":"lose",ok?"Emoji signal decoded.":`Decode failed. It was ${item.a}.`,{score:ok?1:0,neoScore:ok?0:1}); setIdx(i=>i+1)}} />)}</div></div>}
