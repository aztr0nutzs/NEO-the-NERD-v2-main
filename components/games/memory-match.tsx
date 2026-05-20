"use client"
import { useEffect, useState } from "react"
import { ArcadeGameButton } from "./arcade-game-button"
import type { ArcadeGameComponentProps } from "./types"
const MEMORY_ICONS = ["⚡", "◆", "▲", "●", "★", "✚", "◇", "☽"]
const memoryPairs = (d: ArcadeGameComponentProps["difficulty"]) => d === "HARD" ? 8 : d === "ADAPTIVE" ? 6 : 4
export function MemoryMatchGame({ difficulty, update }: ArcadeGameComponentProps) {
 const [deck,setDeck]=useState<string[]>([]); const [open,setOpen]=useState<number[]>([]); const [matched,setMatched]=useState<number[]>([])
 useEffect(()=>{const p=MEMORY_ICONS.slice(0,memoryPairs(difficulty)); setDeck([...p,...p].sort(()=>Math.random()-0.5)); setOpen([]); setMatched([])},[difficulty])
 const pick=(i:number)=>{ if(open.length===2||open.includes(i)||matched.includes(i)) return; const n=[...open,i]; setOpen(n); if(n.length===2){const ok=deck[n[0]]===deck[n[1]]; setTimeout(()=>{ if(ok){const all=[...matched,...n]; setMatched(all); update(all.length===deck.length?"win":"playing",all.length===deck.length?"Memory grid cleared.":"Pair locked.",{score:1})} else update("lose","Mismatch. NEO steals a point.",{neoScore:1}); setOpen([])},650)}}
 return <div className="grid grid-cols-4 gap-2">{deck.map((v,i)=><ArcadeGameButton key={`${v}-${i}`} color="#b829ff" label={open.includes(i)||matched.includes(i)?v:"?"} onClick={()=>pick(i)} />)}</div>
}
