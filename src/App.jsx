/*
DynamicPlayground.jsx

使い方:
1) Vite + React + Tailwind のプロジェクトを用意
2) このファイルを src/App.jsx として保存
3) framer-motion を追加: `npm install framer-motion`
4) Tailwind をセットアップしておく
5) `npm run dev` で起動

このコンポーネントは以下の仕掛けを1ファイルで示します:
- リアルタイム時計と自動更新フィード（擬似WebSocket）
- デバウンス検索とフィルタリング
- ドラッグ&ドロップで並べ替えできるカード群
- ローカルストレージに保存される TODO リスト
- 画像プレビュー付きファイルアップロード
- アニメーション付きモーダル、テーマ切替
- 入力バリデーション、簡単なフォーム

必要な依存: react, framer-motion, tailwindcss (スタイルはTailwind依存)
*/

import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function DynamicPlayground() {
  // Theme
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("dp:theme") === "dark"; } catch { return false; }
  });
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); localStorage.setItem("dp:theme", dark?"dark":"light"); }, [dark]);

  // Clock
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setNow(new Date()), 1000); return ()=>clearInterval(t); }, []);

  // Simulated real-time feed (擬似WebSocket)
  const [feed, setFeed] = useState(()=>[]);
  useEffect(() => {
    let i = 1;
    const id = setInterval(()=>{
      setFeed(prev => [{id: Date.now(), text: `サーバー通知メッセージ #${i++}`, time: new Date()}, ...prev].slice(0, 50));
    }, 4500);
    return ()=>clearInterval(id);
  }, []);

  // Debounced search
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(()=>{
    const id = setTimeout(()=>setDebounced(query), 300);
    return ()=>clearTimeout(id);
  }, [query]);

  // Sample items to filter
  const sampleItems = useMemo(()=>Array.from({length:20}).map((_,i)=>({id:i+1, name:`アイテム ${i+1}`})),[]);
  const filtered = sampleItems.filter(it => it.name.includes(debounced) || String(it.id).includes(debounced));

  // Drag & drop cards
  const [cards, setCards] = useState(()=>["赤いカード","青いカード","緑のカード","黄色いカード"].map((t,i)=>({id:i+1,title:t})));
  const dragIndex = useRef(null);

  function onDragStart(e, index){ dragIndex.current = index; e.dataTransfer.effectAllowed = 'move'; }
  function onDragOver(e, index){ e.preventDefault(); }
  function onDrop(e, index){
    e.preventDefault();
    const from = dragIndex.current; const to = index;
    if(from===null) return;
    setCards(prev=>{
      const next = [...prev];
      const [item] = next.splice(from,1);
      next.splice(to,0,item);
      return next;
    });
    dragIndex.current = null;
  }

  // TODO list with localStorage
  const [todos, setTodos] = useState(()=>{ try{ return JSON.parse(localStorage.getItem('dp:todos')||'[]'); }catch{ return []; }});
  useEffect(()=>{ localStorage.setItem('dp:todos', JSON.stringify(todos)); }, [todos]);
  function addTodo(text){ if(!text.trim()) return; setTodos(prev=>[{id:Date.now(),text,done:false}, ...prev]); }
  function toggleTodo(id){ setTodos(prev=>prev.map(t=>t.id===id?{...t,done:!t.done}:t)); }
  function removeTodo(id){ setTodos(prev=>prev.filter(t=>t.id!==id)); }

  // File upload preview
  const [imagePreview, setImagePreview] = useState(null);
  function onFileChange(e){ const f = e.target.files?.[0]; if(!f) return; const url = URL.createObjectURL(f); setImagePreview({name:f.name, url}); }

  // Modal
  const [openModal, setOpenModal] = useState(false);

  // Simple form with validation
  const [form, setForm] = useState({name:'', email:''});
  const [formMsg, setFormMsg] = useState('');
  function submitForm(e){ e.preventDefault(); setFormMsg(''); if(form.name.length<2){ setFormMsg('名前は2文字以上必要です'); return; } if(!/.+@.+\..+/.test(form.email)){ setFormMsg('有効なメールアドレスを入力してください'); return; } setFormMsg('送信しました！ありがとう'); }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">動的サイトサンプル</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">いろいろな仕掛けを1ファイルで試せます</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">現在時刻</div>
              <div className="font-mono">{now.toLocaleString()}</div>
            </div>
            <button className="px-3 py-2 rounded-2xl shadow-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600" onClick={()=>setDark(d=>!d)}>
              {dark? 'ライト' : 'ダーク'} モード
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: feed + upload + form */}
          <section className="col-span-1 lg:col-span-2 space-y-6">
            <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-slate-700">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold">リアルタイムフィード</h2>
                <button className="text-sm" onClick={()=>setFeed([])}>クリア</button>
              </div>
              <div className="max-h-48 overflow-auto space-y-2">
                {feed.map(item=> (
                  <motion.div key={item.id} initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="p-2 rounded-lg border border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-800">
                    <div className="text-sm font-medium">{item.text}</div>
                    <div className="text-xs text-slate-500">{item.time.toLocaleTimeString()}</div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-slate-700 space-y-4">
              <h2 className="text-lg font-semibold">画像アップロード (プレビュー)</h2>
              <input type="file" accept="image/*" onChange={onFileChange} />
              {imagePreview && (
                <div className="mt-2">
                  <img src={imagePreview.url} alt={imagePreview.name} className="max-h-40 rounded-lg shadow" />
                  <div className="text-xs mt-1">{imagePreview.name}</div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-slate-700">
              <h2 className="text-lg font-semibold mb-2">サンプルフォーム</h2>
              <form onSubmit={submitForm} className="space-y-3">
                <div>
                  <label className="text-sm">名前</label>
                  <input className="w-full mt-1 p-2 rounded-lg border dark:bg-slate-800" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
                <div>
                  <label className="text-sm">メール</label>
                  <input className="w-full mt-1 p-2 rounded-lg border dark:bg-slate-800" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-xl shadow bg-indigo-500 text-white" type="submit">送信</button>
                  <button type="button" className="px-3 py-2 rounded-xl shadow bg-slate-100" onClick={()=>setOpenModal(true)}>モーダルを開く</button>
                </div>
                {formMsg && <div className="text-sm text-green-600 dark:text-green-300">{formMsg}</div>}
              </form>
            </div>
          </section>

          {/* Right column: search, cards, todos */}
          <aside className="space-y-6">
            <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-slate-700">
              <h3 className="font-semibold mb-2">検索 (デバウンス)</h3>
              <input placeholder="アイテム名 or id" value={query} onChange={e=>setQuery(e.target.value)} className="w-full p-2 rounded-lg border dark:bg-slate-800" />
              <div className="mt-3 space-y-1 max-h-40 overflow-auto">
                {filtered.map(it=> <div key={it.id} className="text-sm p-1">{it.name}</div>)}
                {filtered.length===0 && <div className="text-sm text-slate-400">一致なし</div>}
              </div>
            </div>

            <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-slate-700">
              <h3 className="font-semibold mb-2">ドラッグで並べ替え</h3>
              <div className="space-y-2">
                {cards.map((c, idx)=> (
                  <div key={c.id} draggable onDragStart={(e)=>onDragStart(e, idx)} onDragOver={(e)=>onDragOver(e, idx)} onDrop={(e)=>onDrop(e, idx)} className="p-3 rounded-xl shadow-sm bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-700 border">
                    {c.title}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl shadow-md bg-white dark:bg-slate-700">
              <h3 className="font-semibold mb-2">TODO (ローカルに保存)</h3>
              <TodoBox todos={todos} addTodo={addTodo} toggleTodo={toggleTodo} removeTodo={removeTodo} />
            </div>
          </aside>
        </main>

        {/* Modal */}
        <AnimatePresence>
          {openModal && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="w-full max-w-lg p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
                <h3 className="text-xl font-bold">アニメーションモーダル</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">このモーダルは framer-motion でアニメーションしています。</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button className="px-4 py-2 rounded-xl bg-slate-100" onClick={()=>setOpenModal(false)}>閉じる</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </div>
  );
}

function TodoBox({todos, addTodo, toggleTodo, removeTodo}){
  const [text, setText] = useState('');
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 p-2 rounded-lg border dark:bg-slate-800" placeholder="新しいTODO" />
        <button className="px-3 py-2 rounded-xl bg-green-500 text-white" onClick={()=>{ addTodo(text); setText(''); }}>追加</button>
      </div>
      <div className="space-y-2 max-h-40 overflow-auto">
        {todos.map(t=> (
          <div key={t.id} className={`p-2 rounded-lg border flex items-center justify-between ${t.done? 'opacity-60 line-through':''}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={t.done} onChange={()=>toggleTodo(t.id)} />
              <div className="text-sm">{t.text}</div>
            </div>
            <div>
              <button className="text-xs px-2 py-1 rounded bg-red-100" onClick={()=>removeTodo(t.id)}>削除</button>
            </div>
          </div>
        ))}
        {todos.length===0 && <div className="text-sm text-slate-400">TODO はまだありません</div>}
      </div>
    </div>
  );
}
