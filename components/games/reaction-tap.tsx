"use client"
import { useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const reactionDelay=(d:ArcadeGameComponentProps["difficulty"])=>d==="HARD"?1500+Math.random()*2200:d==="ADAPTIVE"?1200+Math.random()*1800:900+Math.random()*1300
export function ReactionTapGame({ difficulty, update }: ArcadeGameComponentProps) {
const [armed,setArmed]=useState(false); const [ready,setReady]=useState(false); const [started,setStarted]=useState(0)
const tap=()=>{if(!armed){setArmed(true); setReady(false); window.setTimeout(()=>{setReady(true); setStarted(Date.now())},reactionDelay(difficulty)); return}
if(!ready){setArmed(false); update("lose","Too early. NEO awards itself a point.",{neoScore:1}); return}
const ms=Date.now()-started; const pass=ms<(difficulty==="HARD"?360:difficulty==="ADAPTIVE"?480:650); setArmed(false); setReady(false); update(pass?"win":"lose",`${ms}MS reaction. ${pass?"Human reflexes accepted.":"NEO was faster."}`,{score:pass?1:0,neoScore:pass?0:1,reactionTimeMs:ms})}
return <ArcadeGameButton color="#ff7a00" label={!armed?"ARM TEST":ready?"TAP NOW":"WAIT..."} onClick={tap} />}
