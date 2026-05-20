"use client"
import { useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const TRIVIA=[{q:"Which planet is known as the red planet?",a:"MARS",o:["MARS","VENUS","JUPITER"]},{q:"What does CPU stand for?",a:"CENTRAL PROCESSING UNIT",o:["CENTRAL PROCESSING UNIT","CORE POWER UNIT","CYBER PULSE UNIT"]},{q:"Which language powers React components here?",a:"TYPESCRIPT",o:["TYPESCRIPT","COBOL","LUA"]}]
export function TriviaDuelGame({ update }: ArcadeGameComponentProps){const [idx,setIdx]=useState(0); const q=TRIVIA[idx%TRIVIA.length]; return <div className="space-y-2"><p className="text-sm text-white/85">{q.q}</p><div className="grid gap-2">{q.o.map((o)=><ArcadeGameButton key={o} color="#00f0ff" label={o} onClick={()=>{const ok=o===q.a; update(ok?"win":"lose",ok?"Correct. Trivia dignity preserved.":`Wrong. Answer: ${q.a}.`,{score:ok?1:0,neoScore:ok?0:1}); setIdx(i=>i+1)}} />)}</div></div>}
