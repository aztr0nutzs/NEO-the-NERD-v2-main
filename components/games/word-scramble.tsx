"use client"
import { useMemo, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const WORDS=["ROBOT","NEON","CYBER","PRANK","ARCADE","MATRIX"]
export function WordScrambleGame({ difficulty, update }: ArcadeGameComponentProps){const word=WORDS[difficulty==="HARD"?5:difficulty==="ADAPTIVE"?2:0]; const scrambled=useMemo(()=>word.split("").sort(()=>Math.random()-0.5).join(""),[word]); const [answer,setAnswer]=useState(""); return <div className="space-y-2"><p className="ps-heading text-2xl ps-text-purple">{scrambled}</p><div className="flex gap-2"><input value={answer} onChange={(e)=>setAnswer(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{boxShadow:"inset 0 0 0 1px rgba(184,41,255,0.4)"}} /><ArcadeGameButton color="#b829ff" label="SOLVE" onClick={()=>{const ok=answer.trim().toUpperCase()===word; update(ok?"win":"lose",ok?"Word unscrambled.":`Nope. It was ${word}.`,{score:ok?1:0,neoScore:ok?0:1}); setAnswer("")}} /></div></div>}
