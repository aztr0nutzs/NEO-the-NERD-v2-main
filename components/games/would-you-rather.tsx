"use client"
import { useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const WYR=[["Have neon shoes","Have a robot backpack"],["Speak in modem sounds","Glow when you lie"],["Win trivia forever","Never lose RPS"]]
export function WouldYouRatherGame({ update }: ArcadeGameComponentProps){const [idx,setIdx]=useState(0); const pair=WYR[idx%WYR.length]; const choose=(pick:string)=>{update("draw",`You chose: ${pick}. NEO respects the weirdness.`,{score:1,neoScore:1}); setIdx(i=>i+1)}; return <div className="grid gap-2"><ArcadeGameButton color="#39ff14" label={pair[0]} onClick={()=>choose(pair[0])}/><ArcadeGameButton color="#39ff14" label={pair[1]} onClick={()=>choose(pair[1])}/></div>}
