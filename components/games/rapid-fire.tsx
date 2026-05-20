"use client"
import { useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const RAPID=[{q:"2 + 2?",a:"4"},{q:"Color of NEO cyan glow?",a:"CYAN"},{q:"Opposite of lose?",a:"WIN"}]
const targetScore=(d:ArcadeGameComponentProps["difficulty"])=>d==="HARD"?5:d==="ADAPTIVE"?4:3
export function RapidFireGame({ difficulty, update }: ArcadeGameComponentProps){const [idx,setIdx]=useState(0); const [answer,setAnswer]=useState(""); const q=RAPID[idx%RAPID.length]; return <div className="space-y-2"><p className="text-sm text-white/85">{q.q} {"//"} FIRST TO {targetScore(difficulty)}</p><div className="flex gap-2"><input value={answer} onChange={(e)=>setAnswer(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{boxShadow:"inset 0 0 0 1px rgba(255,122,0,0.4)"}} /><ArcadeGameButton color="#ff7a00" label="FIRE" onClick={()=>{const ok=answer.trim().toUpperCase()===q.a; update(ok?"win":"lose",ok?"Rapid point acquired.":`Miss. Answer: ${q.a}.`,{score:ok?1:0,neoScore:ok?0:1}); setIdx(i=>i+1); setAnswer("")}} /></div></div>}
