import { useState, useEffect, useCallback, useRef } from "react";

/* ╔══════════════════════════════════════════════════════════════╗
   ║  CONFIGURATION — Reads from .env via Vite                   ║
   ║  See .env.example for required variables                    ║
   ╚══════════════════════════════════════════════════════════════╝ */
const CONFIG = {
  GOOGLE_SCRIPT_URL: import.meta.env.VITE_GOOGLE_SCRIPT_URL || "",
  IMGBB_API_KEY: import.meta.env.VITE_IMGBB_API_KEY || "",
};

/* ═══ STORAGE (GOOGLE SHEETS) ═══ */
const DB = {
  async get(key) {
    try {
      const r = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=get&key=${encodeURIComponent(key)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const t = await r.text();
      return t && t !== "null" ? JSON.parse(t) : null;
    } catch (e) { console.error("DB get error:", e); return null; }
  },
  async set(key, val) {
    try {
      const r = await fetch(CONFIG.GOOGLE_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ action: "set", key, value: val }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return true;
    } catch (e) { console.error("DB set error:", e); return false; }
  },
};

/* ═══ IMGBB UPLOAD ═══ */
const uploadToImgBB = async (file) => {
  if (!CONFIG.IMGBB_API_KEY) return null;
  try {
    const fd = new FormData();
    fd.append("image", file);
    const r = await fetch(`https://api.imgbb.com/1/upload?key=${CONFIG.IMGBB_API_KEY}`, { method: "POST", body: fd });
    const d = await r.json();
    return d.data?.url || null;
  } catch (e) { console.error("ImgBB error:", e); return null; }
};

/* ═══ SECURITY QUESTIONS ═══ */
const SECURITY_QUESTIONS = [
  "What is your pet's name?",
  "What city were you born in?",
  "What is your favorite movie?",
  "What was your first school's name?",
  "What is your mother's maiden name?",
];

const generateRecoveryKey = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
};

/* ═══ DEFAULTS ═══ */
const DEF = {
  hero: { badge: "☕ Cafe & 🎮 Gaming Zone", t1: "Freedom", t2: "Cafe & Gaming", sub: "Where freshly brewed coffee meets board games, pool, and good vibes. Your neighborhood hangout in Lucknow.", phone: "+911234567890" },
  about: { heading: "More Than Just A Cafe", p1: "Freedom Cafe & Gaming Zone is Lucknow's go-to spot for great coffee, chill board games, a round of pool, and a vibrant atmosphere.", p2: "Step in, grab your brew, pick a game, and let the good times roll. No memberships, no hassle — just pure freedom.", stats: [{ n: "15+", l: "Board Games" }, { n: "2", l: "Pool Tables" }, { n: "∞", l: "Good Vibes" }] },
  menu: [
    { icon: "☕", title: "Coffee & Beverages", items: [{ n: "Espresso", d: "Rich & bold single shot", p: "₹99" }, { n: "Cappuccino", d: "Classic frothy goodness", p: "₹129" }, { n: "Cold Coffee", d: "Chilled & creamy blend", p: "₹149" }, { n: "Iced Latte", d: "Smooth espresso on ice", p: "₹159" }, { n: "Hot Chocolate", d: "Rich Belgian cocoa", p: "₹139" }] },
    { icon: "🍿", title: "Snacks & Bites", items: [{ n: "Loaded Fries", d: "Cheese, jalapeño & cream", p: "₹149" }, { n: "Veg Sandwich", d: "Grilled with fresh veggies", p: "₹119" }, { n: "Chicken Nuggets", d: "Crispy golden bites (6 pcs)", p: "₹179" }, { n: "Maggi", d: "Classic masala or cheese", p: "₹89" }, { n: "Garlic Bread", d: "Toasted with herbs", p: "₹109" }] },
    { icon: "🎲", title: "Board Games", items: [{ n: "Chess", d: "Classic strategy showdown", p: "Free*" }, { n: "Ludo / Carrom", d: "Old school favorites", p: "Free*" }, { n: "Uno & Card Games", d: "Bring the chaos", p: "Free*" }, { n: "Monopoly", d: "Become a real estate mogul", p: "Free*" }] },
    { icon: "🎱", title: "Pool Table", items: [{ n: "Per Game", d: "Single frame session", p: "₹60" }, { n: "30 Minutes", d: "Unlimited frames", p: "₹100" }, { n: "1 Hour", d: "Best value session", p: "₹180" }, { n: "Group Package", d: "4 friends, 2 hrs + snacks", p: "₹799" }] },
  ],
  gallery: [
    { url: "", label: "The Cafe Corner", desc: "Cozy vibes, great brews", emoji: "☕", g: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" },
    { url: "", label: "Pool Zone", desc: "Rack 'em up!", emoji: "🎱", g: "linear-gradient(135deg,#1a1a2e,#2d1b69,#11001c)" },
    { url: "", label: "Game Nights", desc: "Board games & banter", emoji: "🎲", g: "linear-gradient(135deg,#0a2647,#144272,#205295)" },
    { url: "", label: "Events", desc: "Tournaments & hangouts", emoji: "🎉", g: "linear-gradient(135deg,#2d033b,#810ca8,#c147e9)" },
    { url: "", label: "Lounge", desc: "Chill, relax, repeat", emoji: "🛋️", g: "linear-gradient(135deg,#1b1a17,#413f42,#1b1a17)" },
    { url: "", label: "Outdoor", desc: "Fresh air & coffee", emoji: "🌿", g: "linear-gradient(135deg,#064635,#519259,#064635)" },
  ],
  contact: { address: "Freedom Cafe & Gaming Zone, Lucknow, UP, India", phone: "+911234567890", hours: "Mon – Sun: 11:00 AM – 11:00 PM", social: "@freedomcafe on Instagram", email: "hello@freedomcafe.in", mapsLink: "https://maps.app.goo.gl/Mn7hRDnJLV4ZkzqLA" },
};
const DEF_REVIEWS = [
  { name: "Rahul S.", r: 5, text: "Best place to chill! Cold coffee is amazing, pool tables are well maintained.", date: "March 2026" },
  { name: "Priya M.", r: 5, text: "Board games + coffee = perfect weekend. Staff is super friendly!", date: "Feb 2026" },
  { name: "Arjun K.", r: 4, text: "Great ambience, good snacks. Pool table is top notch!", date: "Jan 2026" },
];

/* ═══ STYLES ═══ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
:root{--c:#00f0ff;--m:#ff00e5;--g:#39ff14;--y:#ffe600;--bg:#0a0a0f;--cd:#12121c;--sf:#1a1a2e;--tx:#e8e8f0;--mt:#8888aa}
*{margin:0;padding:0;box-sizing:border-box}html{scroll-behavior:smooth}
body,#root{background:var(--bg);color:var(--tx);font-family:'Rajdhani',sans-serif;overflow-x:hidden;-webkit-tap-highlight-color:transparent}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--c);border-radius:3px}

.nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0.7rem 1.2rem;display:flex;justify-content:space-between;align-items:center;background:rgba(10,10,15,0.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,240,255,0.1)}
.nav-logo{font-family:'Orbitron';font-weight:800;font-size:1.1rem;letter-spacing:2px;background:linear-gradient(135deg,var(--c),var(--m));-webkit-background-clip:text;-webkit-text-fill-color:transparent;cursor:pointer}
.ham{display:flex;flex-direction:column;gap:4px;cursor:pointer;background:none;border:none;padding:8px;z-index:1001}
.ham span{width:24px;height:2px;background:var(--c);transition:0.3s;display:block}
.ham.open span:nth-child(1){transform:rotate(45deg) translate(4px,4px)}.ham.open span:nth-child(2){opacity:0}.ham.open span:nth-child(3){transform:rotate(-45deg) translate(4px,-4px)}
.mob-menu{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(10,10,15,0.98);z-index:999;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1.8rem;transform:translateX(100%);transition:transform 0.4s cubic-bezier(0.16,1,0.3,1)}
.mob-menu.open{transform:translateX(0)}
.mob-menu a,.mob-menu button{text-decoration:none;color:var(--tx);font-family:'Orbitron';font-weight:600;font-size:1rem;letter-spacing:3px;text-transform:uppercase;background:none;border:none;cursor:pointer;transition:color 0.3s;padding:0.5rem}
.mob-menu a:hover,.mob-menu button:hover{color:var(--c)}
.dl{display:none;gap:1.3rem;list-style:none;align-items:center}
.dl a,.dl button{text-decoration:none;color:var(--mt);font-family:'Rajdhani';font-weight:600;font-size:0.82rem;letter-spacing:2px;text-transform:uppercase;background:none;border:none;cursor:pointer;transition:color 0.3s;white-space:nowrap}
.dl a:hover,.dl button:hover{color:var(--c)}
.ab{color:var(--m)!important;border:1px solid rgba(255,0,229,0.3)!important;padding:0.2rem 0.6rem!important;font-size:0.68rem!important;border-radius:2px}
@media(min-width:769px){.ham{display:none}.dl{display:flex}}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:0.4rem;padding:0.7rem 1.6rem;font-family:'Orbitron';font-weight:700;font-size:0.68rem;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border:2px solid var(--c);color:var(--c);background:transparent;cursor:pointer;transition:all 0.3s;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))}
.btn:hover{background:var(--c);color:var(--bg);box-shadow:0 0 15px #00f0ff44}
.btn.mg{border-color:var(--m);color:var(--m)}.btn.mg:hover{background:var(--m);color:var(--bg);box-shadow:0 0 15px #ff00e544}
.btn.gn{border-color:var(--g);color:var(--g)}.btn.gn:hover{background:var(--g);color:var(--bg)}
.btn.yl{border-color:var(--y);color:var(--y)}.btn.yl:hover{background:var(--y);color:var(--bg)}

.hero{min-height:100vh;min-height:100svh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;position:relative;padding:5rem 1.2rem 2rem;overflow:hidden}
.hero-bg{position:absolute;top:0;left:0;width:100%;height:100%;z-index:0}
.hero-bg::before{content:'';position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(0,240,255,0.14),transparent 70%);top:10%;left:-15%;animation:f1 8s ease-in-out infinite}
.hero-bg::after{content:'';position:absolute;width:350px;height:350px;border-radius:50%;background:radial-gradient(circle,rgba(255,0,229,0.11),transparent 70%);bottom:10%;right:-10%;animation:f2 10s ease-in-out infinite}
@keyframes f1{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,20px)}}
@keyframes f2{0%,100%{transform:translate(0,0)}50%{transform:translate(-20px,-30px)}}
.gov{position:absolute;top:0;left:0;width:100%;height:100%;background-image:linear-gradient(rgba(0,240,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.03) 1px,transparent 1px);background-size:50px 50px}
.hero-c{position:relative;z-index:1;max-width:700px}
.hb{display:inline-block;font-family:'Space Mono';font-size:0.65rem;letter-spacing:3px;text-transform:uppercase;color:var(--g);border:1px solid var(--g);padding:0.3rem 1rem;margin-bottom:1.5rem;animation:fu .8s ease-out .2s both}
.hero h1{font-family:'Orbitron';font-weight:900;font-size:clamp(2rem,8vw,5.2rem);line-height:1.05;text-transform:uppercase;letter-spacing:2px;margin-bottom:1rem;animation:fu .8s ease-out .4s both}
.l1{display:block;color:var(--tx)}.l2{display:block;background:linear-gradient(90deg,var(--c),var(--m),var(--c));background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:sh 3s linear infinite}
@keyframes sh{0%{background-position:0% center}100%{background-position:200% center}}
.hs{font-size:1rem;color:var(--mt);max-width:460px;margin:0 auto 1.8rem;line-height:1.6;animation:fu .8s ease-out .6s both}
.hbtns{display:flex;gap:0.7rem;justify-content:center;flex-wrap:wrap;animation:fu .8s ease-out .8s both}
@keyframes fu{from{opacity:0;transform:translateY(25px)}to{opacity:1;transform:translateY(0)}}

section{padding:4rem 1.2rem}
.wrap{max-width:1100px;margin:0 auto}
.shdr{text-align:center;margin-bottom:2.5rem}
.stag{font-family:'Space Mono';font-size:0.62rem;letter-spacing:4px;text-transform:uppercase;color:var(--m);margin-bottom:0.5rem}
.sttl{font-family:'Orbitron';font-size:clamp(1.4rem,4vw,2.4rem);font-weight:800;text-transform:uppercase;letter-spacing:2px}
.nln{width:50px;height:3px;background:linear-gradient(90deg,var(--c),var(--m));margin:0.7rem auto 0;box-shadow:0 0 8px var(--c)}
@media(min-width:769px){section{padding:5rem 2rem}}

#about{background:linear-gradient(180deg,var(--bg),var(--sf),var(--bg))}
.abg{display:grid;grid-template-columns:1fr;gap:2rem}
@media(min-width:769px){.abg{grid-template-columns:1fr 1fr;gap:3.5rem;align-items:center}}
.abv{height:260px;border:1px solid rgba(0,240,255,0.15);clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px));background:linear-gradient(135deg,rgba(0,240,255,0.06),rgba(255,0,229,0.06)),var(--cd);display:flex;flex-direction:column;justify-content:center;align-items:center;gap:1rem}
@media(min-width:769px){.abv{height:380px}}
.ir{display:flex;gap:1.2rem}
.fi{width:60px;height:60px;border:1px solid rgba(0,240,255,0.25);display:flex;align-items:center;justify-content:center;font-size:1.5rem;transition:all 0.4s;background:rgba(0,240,255,0.03)}
.fi:hover{border-color:var(--c);box-shadow:0 0 12px #00f0ff44;transform:translateY(-4px)}
@media(min-width:769px){.fi{width:75px;height:75px;font-size:1.8rem}}
.abt h3{font-family:'Orbitron';font-size:1.1rem;font-weight:700;margin-bottom:0.7rem;color:var(--c)}
.abt p{color:var(--mt);font-size:0.95rem;line-height:1.7;margin-bottom:0.7rem}
.sr{display:flex;gap:1.5rem;margin-top:1rem;flex-wrap:wrap}
.sn{font-family:'Orbitron';font-size:1.5rem;font-weight:900;color:var(--m);text-shadow:0 0 10px #ff00e544}
.sl{font-size:0.68rem;letter-spacing:2px;text-transform:uppercase;color:var(--mt)}

#menu{background:var(--bg)}
.mg{display:grid;grid-template-columns:1fr;gap:1.2rem}
@media(min-width:600px){.mg{grid-template-columns:1fr 1fr}}
.mc{background:var(--cd);border:1px solid rgba(0,240,255,0.08);padding:1.3rem;position:relative;overflow:hidden;transition:border-color 0.3s}
.mc:hover{border-color:rgba(0,240,255,0.25)}
.mc::before{content:'';position:absolute;top:0;left:0;width:100%;height:3px;background:linear-gradient(90deg,var(--c),var(--m))}
.ci{font-size:1.4rem;margin-bottom:0.5rem}.ct{font-family:'Orbitron';font-size:0.78rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:1rem;color:var(--c)}
.mi{display:flex;justify-content:space-between;align-items:baseline;padding:0.5rem 0;border-bottom:1px solid rgba(255,255,255,0.03)}
.mi:last-child{border-bottom:none}
.mn{font-weight:500;font-size:0.92rem}.md{font-size:0.75rem;color:var(--mt);margin-top:1px}
.mp{font-family:'Space Mono';font-weight:700;font-size:0.82rem;color:var(--g);white-space:nowrap;margin-left:0.6rem}

#gallery{background:linear-gradient(180deg,var(--bg),var(--sf),var(--bg))}
.gal{display:grid;grid-template-columns:repeat(2,1fr);gap:0.6rem}
@media(min-width:550px){.gal{grid-template-columns:repeat(3,1fr)}}
@media(min-width:800px){.gal{grid-template-columns:repeat(4,1fr);gap:0.8rem}}
@media(min-width:1050px){.gal{grid-template-columns:repeat(5,1fr)}}
.gi{position:relative;overflow:hidden;border:1px solid rgba(0,240,255,0.06);cursor:pointer;transition:all 0.4s;aspect-ratio:1}
.gi:hover{border-color:var(--c);box-shadow:0 0 12px #00f0ff33}
.gi-bg{width:100%;height:100%;object-fit:cover;transition:transform 0.5s;display:block}
.gi:hover .gi-bg{transform:scale(1.06)}
.gi-em{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:2.2rem;opacity:0.2;transition:opacity 0.4s;pointer-events:none}
.gi:hover .gi-em{opacity:0.55}
.gi-ov{position:absolute;bottom:0;left:0;right:0;padding:0.7rem;background:linear-gradient(to top,rgba(10,10,15,0.95),transparent);transform:translateY(100%);transition:transform 0.4s}
.gi:hover .gi-ov{transform:translateY(0)}
.gi-ov h4{font-family:'Orbitron';font-size:0.6rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--c)}
.gi-ov p{font-size:0.68rem;color:var(--mt);margin-top:0.15rem}

#reviews{background:var(--bg)}
.rvs{display:flex;gap:1rem;overflow-x:auto;padding-bottom:0.8rem;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.rvs::-webkit-scrollbar{height:3px}.rvs::-webkit-scrollbar-thumb{background:var(--c);border-radius:2px}
.rc{flex:0 0 82%;max-width:340px;scroll-snap-align:start;background:var(--cd);border:1px solid rgba(0,240,255,0.06);padding:1.3rem;position:relative;transition:all 0.3s}
@media(min-width:600px){.rc{flex:0 0 44%}}
@media(min-width:900px){.rc{flex:0 0 30%}}
.rc:hover{border-color:rgba(0,240,255,0.2);transform:translateY(-3px)}
.rc::before{content:'"';position:absolute;top:6px;right:14px;font-family:'Orbitron';font-size:3rem;color:rgba(0,240,255,0.05)}
.rs{color:var(--y);font-size:0.85rem;margin-bottom:0.5rem;letter-spacing:1px}
.rt{color:var(--mt);font-size:0.88rem;line-height:1.6;margin-bottom:0.8rem;font-style:italic}
.ra{font-family:'Orbitron';font-size:0.62rem;font-weight:700;color:var(--c);letter-spacing:2px}
.rd{font-size:0.6rem;color:var(--mt);margin-top:0.15rem;font-family:'Space Mono'}

#feedback{background:linear-gradient(180deg,var(--bg),var(--sf),var(--bg))}
.fbw{max-width:560px;margin:0 auto;background:var(--cd);border:1px solid rgba(0,240,255,0.08);padding:1.5rem}

#contact{background:var(--bg)}
.cg{display:grid;grid-template-columns:1fr;gap:1rem}
@media(min-width:769px){.cg{grid-template-columns:1fr 1fr;gap:1.5rem}}
.cc{background:var(--cd);border:1px solid rgba(0,240,255,0.08);transition:all 0.3s;cursor:pointer;overflow:hidden}
.cc:hover{border-color:rgba(0,240,255,0.25)}
.cch{display:flex;gap:0.8rem;align-items:center;padding:1rem}
.cci{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;border:1px solid var(--c);flex-shrink:0}
.cch h4{font-family:'Orbitron';font-size:0.68rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--c)}
.cch p{color:var(--mt);font-size:0.85rem;line-height:1.4;margin-top:0.15rem}
.chv{margin-left:auto;color:var(--c);transition:transform 0.3s;font-size:0.7rem;flex-shrink:0}
.chv.open{transform:rotate(180deg)}
.cce{max-height:0;overflow:hidden;transition:max-height 0.4s ease,padding 0.4s ease;padding:0 1rem}
.cce.open{max-height:250px;padding:0 1rem 1rem}
.mb{background:var(--cd);border:1px solid rgba(0,240,255,0.1);min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:2rem;grid-column:1/-1}
.mb::before{content:'';position:absolute;width:100%;height:100%;background-image:linear-gradient(rgba(0,240,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.03) 1px,transparent 1px);background-size:30px 30px}
.mpin{font-size:2.2rem;margin-bottom:0.6rem;animation:pb 2s ease-in-out infinite;position:relative;z-index:1}
@keyframes pb{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.hbar{background:var(--cd);border:1px solid rgba(57,255,20,0.15);padding:0.8rem 1.2rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.6rem;margin-top:1.2rem}
.pd{width:8px;height:8px;background:var(--g);border-radius:50%;box-shadow:0 0 8px #39ff14;animation:pu 1.5s infinite;display:inline-block;margin-right:5px}
@keyframes pu{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
.stx{font-family:'Orbitron';font-size:0.72rem;font-weight:700;letter-spacing:2px}
.htx{font-family:'Space Mono';font-size:0.72rem;color:var(--mt)}


.field{margin-bottom:0.9rem}
.field label{display:block;font-family:'Orbitron';font-size:0.58rem;font-weight:700;letter-spacing:2px;color:var(--c);margin-bottom:0.3rem;text-transform:uppercase}
.field input,.field textarea,.field select{width:100%;padding:0.6rem 0.8rem;background:var(--cd);border:1px solid rgba(0,240,255,0.12);color:var(--tx);font-family:'Rajdhani';font-size:0.92rem;outline:none;transition:border-color 0.3s;border-radius:0}
.field input:focus,.field textarea:focus{border-color:var(--c)}
.field textarea{resize:vertical;min-height:60px}
.smsg{color:var(--g);text-align:center;padding:0.8rem;font-family:'Orbitron';font-size:0.7rem;letter-spacing:2px}

.footer{padding:2rem 1.2rem;text-align:center;border-top:1px solid rgba(0,240,255,0.08);background:var(--bg)}
.flogo{font-family:'Orbitron';font-weight:800;font-size:0.95rem;letter-spacing:3px;background:linear-gradient(135deg,var(--c),var(--m));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:0.4rem}
.fcopy{font-family:'Space Mono';font-size:0.6rem;color:var(--mt);letter-spacing:1px}

.adov{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:rgba(10,10,15,0.97);backdrop-filter:blur(10px);overflow-y:auto;-webkit-overflow-scrolling:touch}
.adp{max-width:720px;margin:1.5rem auto;padding:1.5rem}
.adh{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;padding-bottom:0.7rem;border-bottom:1px solid rgba(0,240,255,0.1);flex-wrap:wrap;gap:0.5rem}
.adh h2{font-family:'Orbitron';font-size:1rem;color:var(--c);letter-spacing:3px}
.ats{display:flex;gap:0.3rem;flex-wrap:wrap;margin-bottom:1.2rem}
.at{padding:0.35rem 0.7rem;font-family:'Rajdhani';font-weight:600;font-size:0.72rem;letter-spacing:1px;text-transform:uppercase;background:var(--cd);border:1px solid rgba(0,240,255,0.08);color:var(--mt);cursor:pointer;transition:all 0.3s}
.at.act{border-color:var(--c);color:var(--c);background:rgba(0,240,255,0.04)}
.acd{background:var(--cd);border:1px solid rgba(0,240,255,0.08);padding:1rem;margin-bottom:0.7rem}
.ach{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.7rem;flex-wrap:wrap;gap:0.4rem}
.ach h4{font-family:'Orbitron';font-size:0.65rem;color:var(--m);letter-spacing:2px}
.bs{padding:0.3rem 0.7rem;font-family:'Rajdhani';font-weight:700;font-size:0.72rem;letter-spacing:1px;cursor:pointer;border:1px solid;transition:all 0.3s;background:transparent}
.ba{border-color:var(--g);color:var(--g)}.ba:hover{background:var(--g);color:var(--bg)}
.bd{border-color:#ff4444;color:#ff4444}.bd:hover{background:#ff4444;color:var(--bg)}
.bsv{border-color:var(--c);color:var(--c);padding:0.45rem 1.2rem;font-family:'Orbitron';font-size:0.62rem;letter-spacing:2px}
.bsv:hover{background:var(--c);color:var(--bg);box-shadow:0 0 12px #00f0ff44}
.lbox{max-width:400px;margin:6vh auto;padding:2rem;background:var(--cd);border:1px solid rgba(0,240,255,0.12);text-align:center}
.lbox h3{font-family:'Orbitron';color:var(--c);margin-bottom:0.4rem;letter-spacing:3px;font-size:0.9rem}
.lbox p{color:var(--mt);font-size:0.8rem;margin-bottom:1rem}
.lerr{color:#ff4444;font-size:0.75rem;margin-top:0.4rem}
.toast{position:fixed;bottom:1.2rem;left:50%;transform:translateX(-50%);background:var(--g);color:var(--bg);padding:0.6rem 1.3rem;font-family:'Orbitron';font-size:0.62rem;font-weight:700;letter-spacing:2px;z-index:3000;animation:fu 0.4s ease-out;white-space:nowrap;border-radius:2px}
.img-up{display:flex;align-items:center;gap:0.5rem;margin-top:0.3rem;flex-wrap:wrap}
.img-up-btn{display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.8rem;font-family:'Rajdhani';font-weight:700;font-size:0.75rem;cursor:pointer;border:1px dashed var(--c);color:var(--c);background:transparent;transition:0.3s}
.img-up-btn:hover{background:rgba(0,240,255,0.05)}
.img-prev{width:50px;height:50px;object-fit:cover;border:1px solid rgba(0,240,255,0.2)}
.uploading{color:var(--y);font-family:'Space Mono';font-size:0.7rem;animation:pu 1s infinite}

.forgot-link{background:none;border:none;color:var(--m);cursor:pointer;font-family:'Rajdhani';font-weight:600;font-size:0.82rem;letter-spacing:1px;margin-top:0.6rem;transition:color 0.3s;text-decoration:underline;text-underline-offset:3px}
.forgot-link:hover{color:var(--c)}
.recovery-tabs{display:flex;gap:0;margin-bottom:1rem;border:1px solid rgba(0,240,255,0.12)}
.recovery-tab{flex:1;padding:0.5rem;font-family:'Orbitron';font-size:0.58rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:transparent;border:none;color:var(--mt);cursor:pointer;transition:all 0.3s;border-bottom:2px solid transparent}
.recovery-tab.act{color:var(--c);background:rgba(0,240,255,0.04);border-bottom-color:var(--c)}
.rk-display{background:rgba(0,240,255,0.04);border:2px dashed var(--c);padding:1rem;margin:1rem 0;text-align:center;position:relative}
.rk-display code{font-family:'Space Mono';font-size:1.3rem;font-weight:700;color:var(--y);letter-spacing:4px;display:block;margin-bottom:0.5rem}
.rk-display p{color:var(--mt);font-size:0.72rem;line-height:1.5}
.rk-copy{background:none;border:1px solid var(--c);color:var(--c);font-family:'Orbitron';font-size:0.58rem;letter-spacing:2px;padding:0.3rem 0.8rem;cursor:pointer;transition:all 0.3s;margin-top:0.4rem}
.rk-copy:hover{background:var(--c);color:var(--bg)}
.rk-masked{font-family:'Space Mono';font-size:0.85rem;color:var(--y);letter-spacing:2px;padding:0.3rem 0.6rem;background:rgba(255,230,0,0.04);border:1px solid rgba(255,230,0,0.15);display:inline-block;margin:0.3rem 0}
.rk-warning{display:flex;align-items:flex-start;gap:0.5rem;background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.15);padding:0.7rem;margin-top:0.6rem;text-align:left}
.rk-warning p{color:#ff8888;font-size:0.72rem;line-height:1.5}

.lightbox{position:fixed;top:0;left:0;right:0;bottom:0;z-index:3000;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;cursor:zoom-out;animation:lbIn 0.3s ease-out}
@keyframes lbIn{from{opacity:0}to{opacity:1}}
.lightbox img{max-width:92vw;max-height:90vh;object-fit:contain;border:1px solid rgba(0,240,255,0.15);box-shadow:0 0 40px rgba(0,240,255,0.1)}
.lb-close{position:absolute;top:1rem;right:1.2rem;background:none;border:1px solid rgba(255,255,255,0.2);color:white;font-size:1.2rem;width:40px;height:40px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.3s;font-family:'Orbitron'}
.lb-close:hover{border-color:var(--c);color:var(--c)}
`;

/* ═══ APP ═══ */
export default function App() {
  const [data, setData] = useState(DEF);
  const [reviews, setReviews] = useState(DEF_REVIEWS);
  const [fb, setFb] = useState([]);
  const [auth, setAuth] = useState(undefined); // undefined=loading, null=no account, object=exists
  const [showAdmin, setShowAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [toast, setToast] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    (async () => {
      const [s, r, f, a] = await Promise.all([DB.get("fc3-site"), DB.get("fc3-reviews"), DB.get("fc3-feedback"), DB.get("fc3-auth")]);
      if (s) setData(s);
      if (r) setReviews(r);
      if (f) setFb(f);
      setAuth(a);
    })();
  }, []);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const saveSite = useCallback(async (d) => { setData(d); await DB.set("fc3-site", d); flash("✓ Saved!"); }, []);
  const saveRevs = useCallback(async (r) => { setReviews(r); await DB.set("fc3-reviews", r); }, []);
  const saveFb = useCallback(async (f) => { setFb(f); await DB.set("fc3-feedback", f); }, []);
  const saveAuth = useCallback(async (a) => { setAuth(a); await DB.set("fc3-auth", a); }, []);

  const closeMenu = () => setMenuOpen(false);
  const navTo = (id) => { closeMenu(); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  const isOpen = (() => { const h = new Date().getHours(); return h >= 11 && h < 23; })();
  const ph = `tel:${data.hero.phone || data.contact.phone}`;


  return (<>
    <style>{CSS}</style>

    {/* NAV */}
    <nav className="nav">
      <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>FREEDOM</div>
      <ul className="dl">
        <li><a href="#about">About</a></li><li><a href="#menu">Menu</a></li><li><a href="#gallery">Gallery</a></li>
        <li><a href="#reviews">Reviews</a></li><li><a href="#feedback">Feedback</a></li><li><a href="#contact">Contact</a></li>
        <li><button className="ab" onClick={() => setShowAdmin(true)}>⚙ Admin</button></li>
      </ul>
      <button className={`ham${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu"><span /><span /><span /></button>
    </nav>

    <div className={`mob-menu${menuOpen ? " open" : ""}`}>
      <a onClick={() => navTo("about")}>About</a><a onClick={() => navTo("menu")}>Menu</a>
      <a onClick={() => navTo("gallery")}>Gallery</a><a onClick={() => navTo("reviews")}>Reviews</a>
      <a onClick={() => navTo("feedback")}>Feedback</a><a onClick={() => navTo("contact")}>Contact</a>
      <button onClick={() => { closeMenu(); setShowAdmin(true); }} style={{ color: "#ff00e5" }}>⚙ Admin</button>
    </div>

    {/* HERO */}
    <section className="hero">
      <div className="hero-bg" /><div className="gov" />
      <div className="hero-c">
        <div className="hb">{data.hero.badge}</div>
        <h1><span className="l1">{data.hero.t1}</span><span className="l2">{data.hero.t2}</span></h1>
        <p className="hs">{data.hero.sub}</p>
        <div className="hbtns">
          <a href="#menu" className="btn">View Menu</a>
          <a href="#contact" className="btn mg">Find Us</a>
          <a href={ph} className="btn yl">📞 Enquire Now</a>
        </div>
      </div>
    </section>

    {/* ABOUT */}
    <section id="about"><div className="wrap">
      <div className="shdr"><p className="stag">// Who We Are</p><h2 className="sttl">About Us</h2><div className="nln" /></div>
      <div className="abg">
        <div className="abv" style={{ flexWrap: "wrap", padding: "1.5rem" }}>{data.about.stats.map((s, i) => <div className="fi" key={i} style={{ flexDirection: "column", gap: "0.2rem", width: "auto", height: "auto", padding: "0.8rem" }}><span style={{ fontSize: "1.3rem" }}>{s.n}</span><span style={{ fontSize: "0.55rem", letterSpacing: 1, color: "var(--mt)", textTransform: "uppercase" }}>{s.l}</span></div>)}</div>
        <div className="abt">
          <h3>{data.about.heading}</h3><p>{data.about.p1}</p><p>{data.about.p2}</p>
          <div className="sr">{data.about.stats.map((s, i) => <div key={i} style={{ textAlign: "center" }}><div className="sn">{s.n}</div><div className="sl">{s.l}</div></div>)}</div>
        </div>
      </div>
    </div></section>

    {/* MENU */}
    <section id="menu"><div className="wrap">
      <div className="shdr"><p className="stag">// What We Serve</p><h2 className="sttl">Menu & Pricing</h2><div className="nln" /></div>
      <div className="mg">{data.menu.map((c, i) => <div className="mc" key={i}><div className="ci">{c.icon}</div><h3 className="ct">{c.title}</h3>
        {c.items.map((t, j) => <div className="mi" key={j}><div><div className="mn">{t.n}</div><div className="md">{t.d}</div></div><div className="mp">{t.p}</div></div>)}
      </div>)}</div>
    </div></section>

    {/* GALLERY */}
    <section id="gallery"><div className="wrap">
      <div className="shdr"><p className="stag">// Our Space</p><h2 className="sttl">Gallery</h2><div className="nln" /></div>
      <div className="gal">{data.gallery.map((g, i) => <div className="gi" key={i} onClick={() => g.url && setLightbox(g.url)} style={g.url ? { cursor: "zoom-in" } : {}}>
        {g.url ? <img src={g.url} alt={g.label} className="gi-bg" /> : <div className="gi-bg" style={{ background: g.g || "linear-gradient(135deg,#1a1a2e,#16213e)" }} />}
        <div className="gi-em">{g.emoji}</div>
      </div>)}</div>
    </div></section>

    {lightbox && <div className="lightbox" onClick={() => setLightbox(null)}>
      <button className="lb-close" onClick={() => setLightbox(null)}>✕</button>
      <img src={lightbox} alt="Preview" onClick={e => e.stopPropagation()} style={{ cursor: "default" }} />
    </div>}

    {/* REVIEWS */}
    <section id="reviews"><div className="wrap">
      <div className="shdr"><p className="stag">// What People Say</p><h2 className="sttl">Reviews</h2><div className="nln" /></div>
      <div className="rvs">{reviews.map((r, i) => <div className="rc" key={i}><div className="rs">{"★".repeat(r.r)}{"☆".repeat(5 - r.r)}</div><p className="rt">"{r.text}"</p><div className="ra">{r.name}</div><div className="rd">{r.date}</div></div>)}</div>
      <PublicReviewForm reviews={reviews} save={saveRevs} flash={flash} />
    </div></section>

    {/* FEEDBACK */}
    <section id="feedback"><div className="wrap">
      <div className="shdr"><p className="stag">// Help Us Improve</p><h2 className="sttl">Feedback</h2><div className="nln" /></div>
      <PublicFeedbackForm fb={fb} save={saveFb} flash={flash} />
    </div></section>

    {/* CONTACT */}
    <section id="contact"><div className="wrap">
      <div className="shdr"><p className="stag">// Get In Touch</p><h2 className="sttl">Contact & Location</h2><div className="nln" /></div>
      <div className="cg">
        <CC icon="📍" title="Location" sum={data.contact.address} exp={<a href={data.contact.mapsLink} target="_blank" rel="noreferrer" className="btn" style={{ fontSize: "0.6rem", padding: "0.4rem 0.8rem", marginTop: "0.3rem" }}>Open in Maps →</a>} />
        <CC icon="📞" title="Phone" sum={data.contact.phone} exp={<a href={`tel:${data.contact.phone}`} className="btn gn" style={{ fontSize: "0.6rem", padding: "0.4rem 0.8rem", marginTop: "0.3rem" }}>📞 Call Now</a>} />
        <CC icon="🕐" title="Hours" sum={data.contact.hours} exp={<div style={{ color: isOpen ? "var(--g)" : "#ff4444", fontFamily: "Orbitron", fontSize: "0.75rem", fontWeight: 700, marginTop: "0.3rem" }}>{isOpen ? "✓ We're currently OPEN" : "✕ Currently CLOSED"}</div>} />
        <CC icon="✉️" title="Email" sum={data.contact.email} exp={<a href={`mailto:${data.contact.email}`} className="btn mg" style={{ fontSize: "0.6rem", padding: "0.4rem 0.8rem", marginTop: "0.3rem" }}>Send Email →</a>} />
        <CC icon="📸" title="Social" sum={data.contact.social} exp={<p style={{ color: "var(--mt)", fontSize: "0.82rem", marginTop: "0.3rem" }}>Follow us for updates, events & special offers!</p>} />
        <div className="mb"><div className="mpin">📍</div><div style={{ fontFamily: "Orbitron", fontSize: "0.68rem", letterSpacing: 2, color: "var(--mt)", position: "relative", zIndex: 1 }}>Freedom Cafe — Lucknow</div><a href={data.contact.mapsLink} target="_blank" rel="noreferrer" style={{ marginTop: "0.6rem", position: "relative", zIndex: 1 }}><button className="btn" style={{ fontSize: "0.6rem", padding: "0.4rem 1rem" }}>Open in Maps →</button></a></div>
      </div>
      <div className="hbar"><div style={{ display: "flex", alignItems: "center" }}><span className="pd" style={!isOpen ? { background: "#ff4444", boxShadow: "0 0 8px #ff4444" } : {}} /><span className="stx" style={{ color: isOpen ? "var(--g)" : "#ff4444" }}>{isOpen ? "We're Open" : "Currently Closed"}</span></div><div className="htx">{data.contact.hours}</div></div>
    </div></section>

    <footer className="footer"><div className="flogo">FREEDOM CAFE</div><p className="fcopy">© 2026 Freedom Cafe & Gaming Zone</p></footer>



    {showAdmin && <Admin data={data} saveSite={saveSite} reviews={reviews} saveRevs={saveRevs} fb={fb} saveFb={saveFb} auth={auth} saveAuth={saveAuth} loggedIn={loggedIn} setLoggedIn={setLoggedIn} onClose={() => setShowAdmin(false)} flash={flash} />}
    {toast && <div className="toast">{toast}</div>}
  </>);
}

/* ═══ CONTACT CARD ═══ */
function CC({ icon, title, sum, exp }) {
  const [o, setO] = useState(false);
  return <div className="cc" onClick={() => setO(!o)}><div className="cch"><div className="cci">{icon}</div><div style={{ flex: 1 }}><h4>{title}</h4><p>{sum}</p></div><div className={`chv${o ? " open" : ""}`}>▼</div></div><div className={`cce${o ? " open" : ""}`} onClick={e => e.stopPropagation()}>{exp}</div></div>;
}

/* ═══ PUBLIC REVIEW FORM ═══ */
function PublicReviewForm({ reviews, save, flash }) {
  const [n, setN] = useState(""); const [r, setR] = useState(5); const [t, setT] = useState(""); const [done, setDone] = useState(false);
  const submit = async () => {
    if (!n.trim() || !t.trim()) { flash("Please fill all fields"); return; }
    await save([...reviews, { name: n.trim(), r, text: t.trim(), date: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }) }]);
    setN(""); setT(""); setR(5); setDone(true); flash("Review submitted!"); setTimeout(() => setDone(false), 4000);
  };
  return <div style={{ maxWidth: 520, margin: "2rem auto 0", background: "var(--cd)", border: "1px solid rgba(0,240,255,0.08)", padding: "1.3rem" }}>
    <h4 style={{ fontFamily: "Orbitron", fontSize: "0.72rem", color: "var(--c)", letterSpacing: 2, textAlign: "center", marginBottom: "1rem" }}>✍️ LEAVE A REVIEW</h4>
    {done && <div className="smsg">Thank you for your review!</div>}
    <div className="field"><label>Your Name</label><input value={n} onChange={e => setN(e.target.value)} placeholder="e.g. Rahul S." /></div>
    <div className="field"><label>Rating</label><div style={{ display: "flex", gap: "0.3rem" }}>{[1,2,3,4,5].map(x => <span key={x} onClick={() => setR(x)} style={{ cursor: "pointer", fontSize: "1.3rem", color: x <= r ? "var(--y)" : "var(--mt)" }}>★</span>)}</div></div>
    <div className="field"><label>Your Review</label><textarea value={t} onChange={e => setT(e.target.value)} placeholder="Tell us about your experience..." rows={3} /></div>
    <button className="btn gn" onClick={submit} style={{ width: "100%" }}>Submit Review</button>
  </div>;
}

/* ═══ PUBLIC FEEDBACK FORM ═══ */
function PublicFeedbackForm({ fb, save, flash }) {
  const [n, setN] = useState(""); const [tp, setTp] = useState("suggestion"); const [m, setM] = useState(""); const [done, setDone] = useState(false);
  const submit = async () => {
    if (!m.trim()) { flash("Please write your feedback"); return; }
    await save([...fb, { name: n.trim() || "Anonymous", type: tp, msg: m.trim(), date: new Date().toISOString() }]);
    setN(""); setM(""); setDone(true); flash("Feedback submitted!"); setTimeout(() => setDone(false), 4000);
  };
  return <div className="fbw">
    <h4 style={{ fontFamily: "Orbitron", fontSize: "0.72rem", color: "var(--c)", letterSpacing: 2, textAlign: "center", marginBottom: "1rem" }}>💬 WE VALUE YOUR FEEDBACK</h4>
    {done && <div className="smsg">Thank you for your feedback!</div>}
    <div className="field"><label>Name (optional)</label><input value={n} onChange={e => setN(e.target.value)} placeholder="Anonymous" /></div>
    <div className="field"><label>Type</label><select value={tp} onChange={e => setTp(e.target.value)} style={{ background: "var(--cd)", border: "1px solid rgba(0,240,255,0.12)", color: "var(--tx)", padding: "0.6rem", fontFamily: "Rajdhani", fontSize: "0.92rem", width: "100%" }}>
      <option value="suggestion">💡 Suggestion</option><option value="complaint">⚠️ Complaint</option><option value="praise">🌟 Praise</option><option value="other">📝 Other</option>
    </select></div>
    <div className="field"><label>Message</label><textarea value={m} onChange={e => setM(e.target.value)} placeholder="Tell us what you think..." rows={4} /></div>
    <button className="btn mg" onClick={submit} style={{ width: "100%" }}>Send Feedback</button>
  </div>;
}

/* ═══ ADMIN PANEL ═══ */
function Admin({ data, saveSite, reviews, saveRevs, fb, saveFb, auth, saveAuth, loggedIn, setLoggedIn, onClose, flash }) {
  const [tab, setTab] = useState("hero");
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(data)));
  const [lu, setLu] = useState(""); const [lp, setLp] = useState("");
  const [su, setSu] = useState(""); const [sp, setSp] = useState(""); const [sc, setSc] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { setDraft(JSON.parse(JSON.stringify(data))); }, [data]);

  const [setupSQ, setSetupSQ] = useState(SECURITY_QUESTIONS[0]);
  const [setupSA, setSetupSA] = useState("");
  const [showRKModal, setShowRKModal] = useState(false);
  const [generatedRK, setGeneratedRK] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState("question");
  const [recAnswer, setRecAnswer] = useState("");
  const [recKey, setRecKey] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwC, setNewPwC] = useState("");
  const [resetVerified, setResetVerified] = useState(false);

  // FIRST-TIME SETUP
  if (!auth && !loggedIn) {
    const setup = async () => {
      if (!su.trim() || !sp.trim()) { setErr("Both fields required"); return; }
      if (sp.length < 4) { setErr("Min 4 characters for password"); return; }
      if (sp !== sc) { setErr("Passwords don't match"); return; }
      if (!setupSA.trim()) { setErr("Security answer required"); return; }
      const rk = generateRecoveryKey();
      await saveAuth({ u: su.trim(), p: sp, sq: setupSQ, sa: setupSA.trim().toLowerCase(), rk });
      setGeneratedRK(rk); setShowRKModal(true); setErr("");
    };

    if (showRKModal) {
      const copyKey = () => { navigator.clipboard.writeText(generatedRK).then(() => flash("Key copied!")).catch(() => {}); };
      return <div className="adov"><div className="lbox">
        <h3>🔑 RECOVERY KEY</h3>
        <p>Save this key somewhere safe. You'll need it if you forget your password.</p>
        <div className="rk-display">
          <code>{generatedRK}</code>
          <button className="rk-copy" onClick={copyKey}>📋 Copy Key</button>
        </div>
        <div className="rk-warning"><span>⚠️</span><p>This key is shown <strong>only once</strong>. Write it down or take a screenshot. It cannot be recovered later.</p></div>
        <button className="btn gn" onClick={() => { setShowRKModal(false); setLoggedIn(true); flash("Admin account created!"); }} style={{ width: "100%", marginTop: "1rem" }}>I've Saved It — Continue</button>
      </div></div>;
    }

    return <div className="adov"><div className="lbox">
      <h3>🔐 SETUP ADMIN</h3><p>Create your admin login credentials</p>
      <div className="field"><label>Username</label><input value={su} onChange={e => setSu(e.target.value)} placeholder="e.g. owner" /></div>
      <div className="field"><label>Password</label><input type="password" value={sp} onChange={e => setSp(e.target.value)} placeholder="Min 4 chars" /></div>
      <div className="field"><label>Confirm Password</label><input type="password" value={sc} onChange={e => setSc(e.target.value)} placeholder="Re-enter" /></div>
      <div style={{ borderTop: "1px solid rgba(0,240,255,0.08)", marginTop: "0.6rem", paddingTop: "0.8rem" }}>
        <p style={{ color: "var(--m)", fontFamily: "Orbitron", fontSize: "0.58rem", letterSpacing: 2, marginBottom: "0.6rem" }}>🛡️ ACCOUNT RECOVERY SETUP</p>
        <div className="field"><label>Security Question</label>
          <select value={setupSQ} onChange={e => setSetupSQ(e.target.value)} style={{ background: "var(--cd)", border: "1px solid rgba(0,240,255,0.12)", color: "var(--tx)", padding: "0.6rem", fontFamily: "Rajdhani", fontSize: "0.92rem", width: "100%" }}>
            {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div className="field"><label>Your Answer</label><input value={setupSA} onChange={e => setSetupSA(e.target.value)} placeholder="Your answer (case-insensitive)" onKeyDown={e => e.key === "Enter" && setup()} /></div>
      </div>
      <button className="btn" onClick={setup} style={{ width: "100%" }}>Create Account</button>
      {err && <p className="lerr">{err}</p>}
      <button onClick={onClose} style={{ marginTop: "0.8rem", background: "none", border: "none", color: "var(--mt)", cursor: "pointer", fontSize: "0.8rem" }}>← Back</button>
    </div></div>;
  }

  // LOGIN + FORGOT PASSWORD
  if (!loggedIn) {
    const login = () => {
      if (lu === auth.u && lp === auth.p) { setLoggedIn(true); setErr(""); setForgotMode(false); }
      else setErr("Invalid credentials");
    };

    const verifyRecovery = () => {
      if (recoveryTab === "question") {
        if (!recAnswer.trim()) { setErr("Please enter your answer"); return; }
        if (recAnswer.trim().toLowerCase() === auth.sa) { setResetVerified(true); setErr(""); }
        else setErr("Incorrect answer");
      } else {
        if (!recKey.trim()) { setErr("Please enter your recovery key"); return; }
        if (recKey.trim().toUpperCase() === auth.rk) { setResetVerified(true); setErr(""); }
        else setErr("Invalid recovery key");
      }
    };

    const resetPassword = async () => {
      if (!newPw.trim()) { setErr("Password required"); return; }
      if (newPw.length < 4) { setErr("Min 4 characters"); return; }
      if (newPw !== newPwC) { setErr("Passwords don't match"); return; }
      await saveAuth({ ...auth, p: newPw });
      setForgotMode(false); setResetVerified(false); setNewPw(""); setNewPwC(""); setRecAnswer(""); setRecKey(""); setErr("");
      flash("Password reset successful!");
    };

    const exitForgot = () => { setForgotMode(false); setResetVerified(false); setErr(""); setRecAnswer(""); setRecKey(""); setNewPw(""); setNewPwC(""); };

    // Forgot Password UI
    if (forgotMode) {
      // If recovery is verified, show new password form
      if (resetVerified) {
        return <div className="adov"><div className="lbox">
          <h3>🔓 NEW PASSWORD</h3><p>Set your new admin password</p>
          <div className="field"><label>New Password</label><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 4 chars" /></div>
          <div className="field"><label>Confirm Password</label><input type="password" value={newPwC} onChange={e => setNewPwC(e.target.value)} placeholder="Re-enter" onKeyDown={e => e.key === "Enter" && resetPassword()} /></div>
          <button className="btn gn" onClick={resetPassword} style={{ width: "100%" }}>Reset Password</button>
          {err && <p className="lerr">{err}</p>}
          <button onClick={exitForgot} className="forgot-link" style={{ marginTop: "0.8rem" }}>← Cancel</button>
        </div></div>;
      }

      // Check if auth has recovery data
      const hasRecovery = auth.sq && auth.sa;
      const hasKey = !!auth.rk;

      if (!hasRecovery && !hasKey) {
        return <div className="adov"><div className="lbox">
          <h3>😔 NO RECOVERY</h3>
          <p>No recovery options were set up for this account. You'll need to reset the entire admin account.</p>
          <button className="btn" onClick={async () => { await saveAuth(null); setForgotMode(false); setErr(""); flash("Account reset — set up a new one"); }} style={{ width: "100%", marginTop: "0.5rem" }}>Reset Account</button>
          <button onClick={exitForgot} className="forgot-link" style={{ marginTop: "0.8rem" }}>← Back to Login</button>
        </div></div>;
      }

      return <div className="adov"><div className="lbox">
        <h3>🔑 RECOVER ACCESS</h3><p>Choose a recovery method</p>
        <div className="recovery-tabs">
          {hasRecovery && <button className={`recovery-tab${recoveryTab === "question" ? " act" : ""}`} onClick={() => { setRecoveryTab("question"); setErr(""); }}>🛡️ Question</button>}
          {hasKey && <button className={`recovery-tab${recoveryTab === "key" ? " act" : ""}`} onClick={() => { setRecoveryTab("key"); setErr(""); }}>🔑 Key</button>}
        </div>

        {recoveryTab === "question" && hasRecovery && <>
          <p style={{ color: "var(--y)", fontFamily: "Space Mono", fontSize: "0.72rem", textAlign: "left", marginBottom: "0.6rem", lineHeight: 1.5 }}>{auth.sq}</p>
          <div className="field"><label>Your Answer</label><input value={recAnswer} onChange={e => setRecAnswer(e.target.value)} placeholder="Answer (case-insensitive)" onKeyDown={e => e.key === "Enter" && verifyRecovery()} /></div>
        </>}

        {recoveryTab === "key" && hasKey && <>
          <div className="field"><label>Recovery Key</label><input value={recKey} onChange={e => setRecKey(e.target.value)} placeholder="XXXX-XXXX-XXXX" style={{ fontFamily: "Space Mono", letterSpacing: 2, textTransform: "uppercase" }} onKeyDown={e => e.key === "Enter" && verifyRecovery()} /></div>
        </>}

        <button className="btn mg" onClick={verifyRecovery} style={{ width: "100%" }}>Verify</button>
        {err && <p className="lerr">{err}</p>}
        <button onClick={exitForgot} className="forgot-link" style={{ marginTop: "0.8rem" }}>← Back to Login</button>
      </div></div>;
    }

    // Normal Login UI
    return <div className="adov"><div className="lbox">
      <h3>🔒 ADMIN LOGIN</h3><p>Enter credentials to manage your site</p>
      <div className="field"><label>Username</label><input value={lu} onChange={e => setLu(e.target.value)} placeholder="Username" /></div>
      <div className="field"><label>Password</label><input type="password" value={lp} onChange={e => setLp(e.target.value)} placeholder="Password" onKeyDown={e => e.key === "Enter" && login()} /></div>
      <button className="btn" onClick={login} style={{ width: "100%" }}>Login</button>
      {err && <p className="lerr">{err}</p>}
      <button onClick={() => { setForgotMode(true); setErr(""); }} className="forgot-link">Forgot Password?</button>
      <br />
      <button onClick={onClose} style={{ marginTop: "0.6rem", background: "none", border: "none", color: "var(--mt)", cursor: "pointer", fontSize: "0.8rem" }}>← Back</button>
    </div></div>;
  }

  // DASHBOARD
  const tabs = ["hero", "about", "menu", "gallery", "reviews", "feedback", "contact", "account"];
  const save = () => saveSite(draft);
  const ud = (path, val) => { const d = JSON.parse(JSON.stringify(draft)); const k = path.split("."); let o = d; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = val; setDraft(d); };

  return <div className="adov"><div className="adp">
    <div className="adh"><h2>⚙ ADMIN</h2><div style={{ display: "flex", gap: "0.4rem" }}><button className="bsv" onClick={save}>💾 Save</button><button className="btn" onClick={onClose} style={{ fontSize: "0.6rem", padding: "0.35rem 0.7rem" }}>✕</button></div></div>
    <div className="ats">{tabs.map(t => <button key={t} className={`at${tab === t ? " act" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>

    {tab === "hero" && <>
      <div className="field"><label>Badge</label><input value={draft.hero.badge} onChange={e => ud("hero.badge", e.target.value)} /></div>
      <div className="field"><label>Title Line 1</label><input value={draft.hero.t1} onChange={e => ud("hero.t1", e.target.value)} /></div>
      <div className="field"><label>Title Line 2</label><input value={draft.hero.t2} onChange={e => ud("hero.t2", e.target.value)} /></div>
      <div className="field"><label>Subtitle</label><textarea value={draft.hero.sub} onChange={e => ud("hero.sub", e.target.value)} /></div>
      <div className="field"><label>Enquire Phone</label><input value={draft.hero.phone} onChange={e => ud("hero.phone", e.target.value)} placeholder="+911234567890" /></div>
    </>}

    {tab === "about" && <>
      <div className="field"><label>Heading</label><input value={draft.about.heading} onChange={e => ud("about.heading", e.target.value)} /></div>
      <div className="field"><label>Paragraph 1</label><textarea value={draft.about.p1} onChange={e => ud("about.p1", e.target.value)} /></div>
      <div className="field"><label>Paragraph 2</label><textarea value={draft.about.p2} onChange={e => ud("about.p2", e.target.value)} /></div>
      {draft.about.stats.map((s, i) => <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Num</label><input value={s.n} onChange={e => { const st = [...draft.about.stats]; st[i] = { ...st[i], n: e.target.value }; ud("about.stats", st); }} /></div>
        <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Label</label><input value={s.l} onChange={e => { const st = [...draft.about.stats]; st[i] = { ...st[i], l: e.target.value }; ud("about.stats", st); }} /></div>
        <button className="bs bd" onClick={() => { const st = [...draft.about.stats]; st.splice(i, 1); ud("about.stats", st); }} style={{ marginBottom: "1px" }}>✕</button>
      </div>)}
      <button className="bs ba" onClick={() => ud("about.stats", [...draft.about.stats, { n: "0", l: "New Stat" }])}>+ Add Stat</button>
    </>}

    {tab === "menu" && <>
      {draft.menu.map((c, ci) => <div className="acd" key={ci}>
        <div className="ach"><h4>{c.icon} {c.title}</h4><button className="bs bd" onClick={() => { const m = [...draft.menu]; m.splice(ci, 1); setDraft({ ...draft, menu: m }); }}>Remove</button></div>
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
          <div className="field" style={{ flex: "0 0 45px", marginBottom: 0 }}><label>Icon</label><input value={c.icon} onChange={e => { const m = [...draft.menu]; m[ci] = { ...m[ci], icon: e.target.value }; setDraft({ ...draft, menu: m }); }} /></div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Name</label><input value={c.title} onChange={e => { const m = [...draft.menu]; m[ci] = { ...m[ci], title: e.target.value }; setDraft({ ...draft, menu: m }); }} /></div>
        </div>
        {c.items.map((t, ii) => <div key={ii} style={{ display: "flex", gap: "0.3rem", marginBottom: "0.3rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}><label>Name</label><input value={t.n} onChange={e => { const m = [...draft.menu]; m[ci].items[ii] = { ...t, n: e.target.value }; setDraft({ ...draft, menu: m }); }} /></div>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}><label>Desc</label><input value={t.d} onChange={e => { const m = [...draft.menu]; m[ci].items[ii] = { ...t, d: e.target.value }; setDraft({ ...draft, menu: m }); }} /></div>
          <div className="field" style={{ flex: "0 0 60px", marginBottom: 0 }}><label>Price</label><input value={t.p} onChange={e => { const m = [...draft.menu]; m[ci].items[ii] = { ...t, p: e.target.value }; setDraft({ ...draft, menu: m }); }} /></div>
          <button className="bs bd" onClick={() => { const m = [...draft.menu]; m[ci].items.splice(ii, 1); setDraft({ ...draft, menu: m }); }}>✕</button>
        </div>)}
        <button className="bs ba" style={{ marginTop: "0.4rem" }} onClick={() => { const m = [...draft.menu]; m[ci].items.push({ n: "New Item", d: "Description", p: "₹0" }); setDraft({ ...draft, menu: m }); }}>+ Item</button>
      </div>)}
      <button className="bs ba" onClick={() => setDraft({ ...draft, menu: [...draft.menu, { icon: "🍽️", title: "New Category", items: [{ n: "Item", d: "Desc", p: "₹0" }] }] })}>+ Category</button>
    </>}

    {tab === "gallery" && <>
      <p style={{ color: "var(--mt)", fontSize: "0.78rem", marginBottom: "1rem" }}>
        {CONFIG.IMGBB_API_KEY ? "✅ ImgBB connected — you can upload images directly!" : "📋 Paste image URLs below. To enable drag-and-drop upload, add your ImgBB API key in CONFIG."}
        &nbsp;Gallery auto-fits: 2 cols on mobile → 3 tablet → 4 desktop → 5 wide.
      </p>
      {draft.gallery.map((g, i) => <div className="acd" key={i}>
        <div className="ach"><h4>{g.emoji} {g.label}</h4><button className="bs bd" onClick={() => { const gl = [...draft.gallery]; gl.splice(i, 1); setDraft({ ...draft, gallery: gl }); }}>Remove</button></div>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "0 0 45px", marginBottom: 0 }}><label>Emoji</label><input value={g.emoji} onChange={e => { const gl = [...draft.gallery]; gl[i] = { ...gl[i], emoji: e.target.value }; setDraft({ ...draft, gallery: gl }); }} /></div>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}><label>Label</label><input value={g.label} onChange={e => { const gl = [...draft.gallery]; gl[i] = { ...gl[i], label: e.target.value }; setDraft({ ...draft, gallery: gl }); }} /></div>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}><label>Desc</label><input value={g.desc} onChange={e => { const gl = [...draft.gallery]; gl[i] = { ...gl[i], desc: e.target.value }; setDraft({ ...draft, gallery: gl }); }} /></div>
        </div>
        <div className="field" style={{ marginTop: "0.3rem" }}><label>Image URL</label><input value={g.url} onChange={e => { const gl = [...draft.gallery]; gl[i] = { ...gl[i], url: e.target.value }; setDraft({ ...draft, gallery: gl }); }} placeholder="https://..." /></div>
        <GalleryUpload onUploaded={(url) => { const gl = [...draft.gallery]; gl[i] = { ...gl[i], url }; setDraft({ ...draft, gallery: gl }); }} currentUrl={g.url} />
      </div>)}
      <button className="bs ba" onClick={() => setDraft({ ...draft, gallery: [...draft.gallery, { url: "", label: "New Photo", desc: "Description", emoji: "📸", g: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)" }] })}>+ Add Photo</button>
    </>}

    {tab === "reviews" && <>
      <p style={{ color: "var(--mt)", fontSize: "0.78rem", marginBottom: "1rem" }}>Manage customer reviews ({reviews.length} total). Visitors can also submit from the site.</p>
      {reviews.map((r, i) => <div className="acd" key={i}>
        <div className="ach"><h4>{"★".repeat(r.r)} {r.name}</h4><button className="bs bd" onClick={async () => { const rv = [...reviews]; rv.splice(i, 1); await saveRevs(rv); flash("Removed"); }}>Remove</button></div>
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 100px", marginBottom: 0 }}><label>Name</label><input value={r.name} onChange={async e => { const rv = [...reviews]; rv[i] = { ...rv[i], name: e.target.value }; await saveRevs(rv); }} /></div>
          <div className="field" style={{ flex: "0 0 50px", marginBottom: 0 }}><label>★</label><input type="number" min={1} max={5} value={r.r} onChange={async e => { const rv = [...reviews]; rv[i] = { ...rv[i], r: parseInt(e.target.value) || 1 }; await saveRevs(rv); }} /></div>
          <div className="field" style={{ flex: "0 0 90px", marginBottom: 0 }}><label>Date</label><input value={r.date} onChange={async e => { const rv = [...reviews]; rv[i] = { ...rv[i], date: e.target.value }; await saveRevs(rv); }} /></div>
        </div>
        <div className="field" style={{ marginTop: "0.3rem" }}><label>Text</label><textarea value={r.text} onChange={async e => { const rv = [...reviews]; rv[i] = { ...rv[i], text: e.target.value }; await saveRevs(rv); }} /></div>
      </div>)}
    </>}

    {tab === "feedback" && <>
      <p style={{ color: "var(--mt)", fontSize: "0.78rem", marginBottom: "1rem" }}>Customer feedback ({fb.length} total)</p>
      {fb.length === 0 && <p style={{ color: "var(--mt)", textAlign: "center", padding: "2rem" }}>No feedback yet.</p>}
      {fb.map((f, i) => <div className="acd" key={i}>
        <div className="ach"><h4>{f.type === "suggestion" ? "💡" : f.type === "complaint" ? "⚠️" : f.type === "praise" ? "🌟" : "📝"} {f.name}</h4><button className="bs bd" onClick={async () => { const x = [...fb]; x.splice(i, 1); await saveFb(x); flash("Removed"); }}>Remove</button></div>
        <p style={{ color: "var(--mt)", fontSize: "0.88rem", lineHeight: 1.6 }}>{f.msg}</p>
        <p style={{ fontFamily: "Space Mono", fontSize: "0.6rem", color: "var(--mt)", marginTop: "0.3rem" }}>{new Date(f.date).toLocaleString()}</p>
      </div>)}
    </>}

    {tab === "contact" && <>
      <div className="field"><label>Address</label><textarea value={draft.contact.address} onChange={e => ud("contact.address", e.target.value)} /></div>
      <div className="field"><label>Phone</label><input value={draft.contact.phone} onChange={e => ud("contact.phone", e.target.value)} /></div>
      <div className="field"><label>Email</label><input value={draft.contact.email} onChange={e => ud("contact.email", e.target.value)} /></div>
      <div className="field"><label>Hours</label><input value={draft.contact.hours} onChange={e => ud("contact.hours", e.target.value)} /></div>
      <div className="field"><label>Social</label><input value={draft.contact.social} onChange={e => ud("contact.social", e.target.value)} /></div>
      <div className="field"><label>Maps Link</label><input value={draft.contact.mapsLink} onChange={e => ud("contact.mapsLink", e.target.value)} /></div>
    </>}

    {tab === "account" && <AccountTab auth={auth} saveAuth={saveAuth} flash={flash} setLoggedIn={setLoggedIn} />}

    <div style={{ marginTop: "1.2rem", display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}><button className="bsv" onClick={save}>💾 Save All</button></div>
  </div></div>;
}

/* ═══ GALLERY UPLOAD ═══ */
function GalleryUpload({ onUploaded, currentUrl }) {
  const [uploading, setUploading] = useState(false);
  const galRef = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!CONFIG.IMGBB_API_KEY) return;
    setUploading(true);
    const url = await uploadToImgBB(file);
    setUploading(false);
    if (url) onUploaded(url);
  };
  return <div className="img-up">
    {currentUrl && <img src={currentUrl} alt="preview" className="img-prev" />}
    {CONFIG.IMGBB_API_KEY && <>
      <input ref={galRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <button className="img-up-btn" onClick={() => galRef.current?.click()}>📤 Upload Image</button>
    </>}
    {uploading && <span className="uploading">Uploading...</span>}
  </div>;
}

/* ═══ ACCOUNT TAB ═══ */
function AccountTab({ auth, saveAuth, flash, setLoggedIn }) {
  const [nu, setNu] = useState(auth?.u || "");
  const [np, setNp] = useState(""); const [nc, setNc] = useState("");
  const [sq, setSQ] = useState(auth?.sq || SECURITY_QUESTIONS[0]);
  const [sa, setSA] = useState(auth?.sa || "");
  const [err, setErr] = useState("");
  const [showNewRK, setShowNewRK] = useState(false);
  const [newRK, setNewRK] = useState("");

  const maskedKey = auth?.rk ? `${auth.rk.slice(0, 4)}••••••${auth.rk.slice(-3)}` : "Not set";

  const update = async () => {
    if (!nu.trim()) { setErr("Username required"); return; }
    if (np && np.length < 4) { setErr("Min 4 chars"); return; }
    if (np && np !== nc) { setErr("Passwords don't match"); return; }
    if (!sa.trim()) { setErr("Security answer required"); return; }
    await saveAuth({ ...auth, u: nu.trim(), p: np || auth.p, sq, sa: sa.trim().toLowerCase() });
    setNp(""); setNc(""); setErr(""); flash("Account updated!");
  };

  const regenKey = async () => {
    const rk = generateRecoveryKey();
    await saveAuth({ ...auth, rk });
    setNewRK(rk); setShowNewRK(true); flash("New recovery key generated!");
  };

  const copyKey = () => { navigator.clipboard.writeText(newRK).then(() => flash("Key copied!")).catch(() => {}); };

  return <>
    <p style={{ color: "var(--mt)", fontSize: "0.82rem", marginBottom: "1rem" }}>Credentials stored in Google Sheets.</p>

    {/* Credentials */}
    <div className="acd">
      <div className="ach"><h4>🔐 CREDENTIALS</h4></div>
      <div className="field"><label>Username</label><input value={nu} onChange={e => setNu(e.target.value)} /></div>
      <div className="field"><label>New Password (blank = keep current)</label><input type="password" value={np} onChange={e => setNp(e.target.value)} /></div>
      {np && <div className="field"><label>Confirm</label><input type="password" value={nc} onChange={e => setNc(e.target.value)} /></div>}
    </div>

    {/* Security Question */}
    <div className="acd">
      <div className="ach"><h4>🛡️ SECURITY QUESTION</h4></div>
      <div className="field"><label>Question</label>
        <select value={sq} onChange={e => setSQ(e.target.value)} style={{ background: "var(--cd)", border: "1px solid rgba(0,240,255,0.12)", color: "var(--tx)", padding: "0.6rem", fontFamily: "Rajdhani", fontSize: "0.92rem", width: "100%" }}>
          {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>
      <div className="field"><label>Answer</label><input value={sa} onChange={e => setSA(e.target.value)} placeholder="Case-insensitive" /></div>
    </div>

    {/* Recovery Key */}
    <div className="acd">
      <div className="ach"><h4>🔑 RECOVERY KEY</h4></div>
      {showNewRK ? <>
        <p style={{ color: "var(--mt)", fontSize: "0.78rem", marginBottom: "0.5rem" }}>Your new recovery key:</p>
        <div className="rk-display">
          <code>{newRK}</code>
          <button className="rk-copy" onClick={copyKey}>📋 Copy Key</button>
        </div>
        <div className="rk-warning"><span>⚠️</span><p>Save this key now. It will be hidden when you leave this page.</p></div>
        <button className="bs ba" style={{ marginTop: "0.6rem" }} onClick={() => setShowNewRK(false)}>Done</button>
      </> : <>
        <p style={{ color: "var(--mt)", fontSize: "0.78rem", marginBottom: "0.4rem" }}>Current key: <span className="rk-masked">{maskedKey}</span></p>
        <button className="bs bd" onClick={() => { if (window.confirm("Generate a new recovery key? The old one will stop working.")) regenKey(); }}>🔄 Regenerate Key</button>
      </>}
    </div>

    <button className="btn mg" onClick={update} style={{ marginTop: "0.5rem" }}>Save Account Settings</button>
    {err && <p className="lerr">{err}</p>}

    <div style={{ marginTop: "1.5rem", paddingTop: "0.8rem", borderTop: "1px solid rgba(255,0,229,0.12)" }}>
      <button className="btn" onClick={() => setLoggedIn(false)} style={{ fontSize: "0.6rem", padding: "0.4rem 0.8rem" }}>🚪 Logout</button>
    </div>
  </>;
}
