"use client"
import { useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const rangeMax=(d:ArcadeGameComponentProps["difficulty"])=>d==="HARD"?100:d==="ADAPTIVE"?50:25
export function GuessNumberGame({ difficulty, update }: ArcadeGameComponentProps) {
const max=rangeMax(difficulty); const [target,setTarget]=useState(()=>Math.floor(Math.random()*max)+1); const [guess,setGuess]=useState(""); const [tries,setTries]=useState(0); const limit=difficulty==="HARD"?6:difficulty==="ADAPTIVE"?7:8
const submit=()=>{const n=Number(guess); const next=tries+1; setTries(next); if(n===target){update("win",`Correct in ${next}. Target was ${target}.`,{score:1,completionTimeMs:next*1000}); setTarget(Math.floor(Math.random()*max)+1); setTries(0)} else if(next>=limit){update("lose",`Out of guesses. Target was ${target}.`,{neoScore:1}); setTarget(Math.floor(Math.random()*max)+1); setTries(0)} else update("playing",n<target?"Hot/cold scan says higher.":"Hot/cold scan says lower."); setGuess("")}
return <div className="flex gap-2"><input value={guess} onChange={(e)=>setGuess(e.target.value)} placeholder={`1-${max}`} className="min-w-0 flex-1 rounded-lg bg-black/60 px-3 text-white outline-none" style={{boxShadow:"inset 0 0 0 1px rgba(57,255,20,0.4)"}} /><ArcadeGameButton color="#39ff14" label="GUESS" onClick={submit} /></div>}
