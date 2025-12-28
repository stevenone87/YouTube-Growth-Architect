
import React, { useState, useCallback } from 'react';
import { StrategicBrief, PublishingKit, LoadingState, CategoryWeights } from './types';
import { generatePublishingKit, analyzeSourceForBrief, generateImageFromPrompt, evaluatePublishingKit, refinePublishingKit, suggestWeights } from './services/geminiService';
import LoadingIndicator from './components/LoadingIndicator';
import { CopyIcon, CheckIcon, RefreshCwIcon, SparklesIcon } from './components/Icons';
import RadarChartComponent from './components/RadarChart';
import WeightSliders from './components/WeightSliders';

const CopyableBlock: React.FC<{ title: string; content: string; isMono?: boolean; children?: React.ReactNode }> = ({ title, content, isMono = false, children }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <div className="bg-slate-900 p-4 rounded-xl relative group border border-slate-800/50">
      <h4 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">{title}</h4>
      {children || <p className={`whitespace-pre-wrap ${isMono ? 'font-mono text-xs' : 'text-slate-200 text-sm leading-relaxed'}`}>{content}</p>}
      <button onClick={handleCopy} className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all opacity-0 group-hover:opacity-100">
        {isCopied ? <CheckIcon className="h-4 w-4 text-emerald-400" /> : <CopyIcon className="h-4 w-4 text-slate-400" />}
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [brief, setBrief] = useState<StrategicBrief>({ topic: '', audience: '', outcome: '' });
  const [kit, setKit] = useState<PublishingKit | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [tutorialText, setTutorialText] = useState('');
  const [thumbnailImages, setThumbnailImages] = useState<(string | null)[]>([null, null, null]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [categoryWeights, setCategoryWeights] = useState<CategoryWeights | null>(null);
  const [activeTab, setActiveTab] = useState<'distribution' | 'production' | 'strategy'>('distribution');
  const [generationPhase, setGenerationPhase] = useState<'initial' | 'refined'>('initial');

  const handleBriefChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBrief(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyzeSource = async () => {
    if (!tutorialText.trim()) {
      setError('Please provide source text for analysis.');
      return;
    }
    setError(null);
    setLoadingState(LoadingState.ANALYZING_SOURCE);
    try {
      const result = await analyzeSourceForBrief(tutorialText);
      setBrief(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };
  
  const handleGenerate = async () => {
    if (!brief.topic.trim()) {
      setError('Please provide a core topic.');
      return;
    }
    setError(null);
    setKit(null);
    setLoadingState(LoadingState.GENERATING_KIT);
    try {
      const kitResult = await generatePublishingKit(brief);
      setKit(kitResult);
      setLoadingState(LoadingState.EVALUATING_KIT);
      const evalResult = await evaluatePublishingKit(kitResult);
      setCategoryWeights(evalResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const handleRefine = async () => {
    if (!kit || !selectedTitle || !categoryWeights) return;
    setLoadingState(LoadingState.REFINING_KIT);
    setThumbnailImages([null, null, null]);
    setGenerationPhase('refined');
    try {
      const refinedKit = await refinePublishingKit(brief, kit, selectedTitle, categoryWeights);
      setKit(refinedKit);
      setLoadingState(LoadingState.GENERATING_IMAGES);
      const imagePromises = refinedKit.thumbnails.map(thumb => generateImageFromPrompt(thumb.aiImagePrompt));
      const images = await Promise.all(imagePromises);
      setThumbnailImages(images.map(data => `data:image/png;base64,${data}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed.');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const handleStartOver = useCallback(() => {
    setBrief({ topic: '', audience: '', outcome: '' });
    setKit(null);
    setLoadingState(LoadingState.IDLE);
    setError(null);
    setThumbnailImages([null, null, null]);
    setSelectedTitle(null);
    setCategoryWeights(null);
    setGenerationPhase('initial');
  }, []);

  const radarChartData = categoryWeights ? Object.entries(categoryWeights).map(([key, value]) => ({ category: key, weight: value })) : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-teal-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-slate-900 pb-12">
          <div>
            <h1 className="text-6xl font-black tracking-tighter text-white">ARCHITECT<span className="text-teal-500">.</span></h1>
            <p className="text-slate-500 font-mono text-xs uppercase mt-2 tracking-widest">YouTube Content Intelligence & Production Engine</p>
          </div>
          {kit && (
            <button onClick={handleStartOver} className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-xs font-bold uppercase tracking-widest transition-all">
              <RefreshCwIcon className="w-4 h-4" /> Reset Blueprint
            </button>
          )}
        </header>

        <main>
          {error && <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm font-bold uppercase">{error}</div>}

          {loadingState !== LoadingState.IDLE ? (
            <LoadingIndicator state={loadingState} />
          ) : kit ? (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {/* Refinement Sidebar Logic integrated */}
              {generationPhase === 'initial' && categoryWeights && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-8 bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8">
                     <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">Strategy Selection</h2>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {Object.entries(kit.titles).map(([key, val]) => (
                          <button key={key} onClick={() => setSelectedTitle(val)} className={`p-6 rounded-2xl text-left border-2 transition-all ${selectedTitle === val ? 'bg-teal-500/10 border-teal-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-2">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-sm font-bold text-slate-200">{val}</span>
                          </button>
                        ))}
                     </div>
                     <p className="text-xs text-slate-500 italic">Select the title strategy that fits your vision to proceed with high-fidelity production generation.</p>
                  </div>
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-8">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Strategic Calibration</h3>
                      <div className="h-48 mb-8"><RadarChartComponent data={radarChartData} /></div>
                      <WeightSliders weights={categoryWeights} setWeights={setCategoryWeights} />
                      <button onClick={handleRefine} disabled={!selectedTitle} className="w-full mt-8 bg-teal-500 text-black font-black py-5 rounded-2xl hover:bg-teal-400 disabled:opacity-50 transition-all uppercase tracking-widest text-xs shadow-xl shadow-teal-500/20">
                        Synthesize Production Kit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {generationPhase === 'refined' && (
                <div className="space-y-8">
                  {/* Tabs */}
                  <div className="flex border-b border-slate-800 gap-8">
                    {['distribution', 'production', 'strategy'].map((t) => (
                      <button 
                        key={t}
                        onClick={() => setActiveTab(t as any)} 
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === t ? 'text-teal-500' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {t}
                        {activeTab === t && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-500 rounded-t-full"></div>}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {activeTab === 'distribution' && (
                      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
                        <div className="md:col-span-2 space-y-6">
                          <CopyableBlock title="Optimized Metadata" content={kit.description} />
                          <CopyableBlock title="Search Vectors (Tags)" content={kit.tags} isMono />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <CopyableBlock title="Benefit Title" content={kit.titles.benefitDriven} />
                             <CopyableBlock title="Intrigue Title" content={kit.titles.intrigueDriven} />
                          </div>
                        </div>
                        <div className="space-y-6">
                          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Visual Direction</h3>
                          {kit.thumbnails.map((thumb, idx) => (
                            <div key={idx} className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-4 space-y-4">
                              <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
                                {thumbnailImages[idx] ? <img src={thumbnailImages[idx]!} className="w-full h-full object-cover" /> : <SparklesIcon className="w-6 h-6 text-slate-800" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-200">{thumb.conceptName}</h4>
                                <p className="text-[10px] text-slate-500 mt-1 italic leading-relaxed">{thumb.psychology}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'production' && (
                      <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
                        <div className="lg:col-span-1 space-y-4">
                          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">Hook Lab</h3>
                          {kit.hooks.map((hook, i) => (
                            <div key={i} className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-2xl space-y-3">
                              <span className="text-[10px] font-bold text-teal-500 uppercase">{hook.style}</span>
                              <p className="text-xs font-mono text-slate-300 leading-relaxed italic">"{hook.script}"</p>
                              <p className="text-[10px] text-slate-500">{hook.psychology}</p>
                            </div>
                          ))}
                        </div>
                        <div className="lg:col-span-3 bg-slate-900/30 border border-slate-800/50 rounded-3xl overflow-hidden">
                           <div className="p-6 border-b border-slate-800/50 bg-slate-900/20">
                              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Scene Breakdown</h3>
                           </div>
                           <div className="divide-y divide-slate-800/50">
                             {kit.scenes.map((scene) => (
                               <div key={scene.sceneNumber} className="p-6 grid grid-cols-12 gap-6 hover:bg-white/5 transition-colors">
                                 <div className="col-span-1 flex flex-col items-center">
                                   <span className="text-xs font-black text-slate-600">#{scene.sceneNumber}</span>
                                   <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded mt-1">{scene.duration}</span>
                                 </div>
                                 <div className="col-span-4">
                                   <span className="text-[9px] font-black text-slate-500 uppercase block mb-2">Visual</span>
                                   <p className="text-xs text-slate-400 italic leading-relaxed">{scene.visual}</p>
                                 </div>
                                 <div className="col-span-5">
                                   <span className="text-[9px] font-black text-slate-500 uppercase block mb-2">Audio / Narrative</span>
                                   <p className="text-xs text-slate-200 font-mono leading-relaxed">{scene.audio}</p>
                                 </div>
                                 <div className="col-span-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase block mb-2">Retention</span>
                                    <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tighter">{scene.retentionTactic}</span>
                                 </div>
                               </div>
                             ))}
                           </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'strategy' && (
                      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                         <div className="bg-slate-900/30 border border-slate-800/50 p-10 rounded-3xl space-y-8">
                            <div>
                               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Viewer Persona</h3>
                               <p className="text-2xl font-black text-white">{kit.persona.name}</p>
                               <p className="text-sm text-slate-400 mt-2">{kit.persona.motivations}</p>
                            </div>
                            <div className="space-y-4">
                               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Core Frustrations</h4>
                               <div className="flex flex-wrap gap-2">
                                  {kit.persona.painPoints.map((p, i) => (
                                    <span key={i} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full font-bold">{p}</span>
                                  ))}
                               </div>
                            </div>
                         </div>
                         <div className="bg-slate-900/30 border border-slate-800/50 p-10 rounded-3xl space-y-6">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Competitive Advantage</h3>
                            <p className="text-lg text-slate-200 leading-relaxed font-serif italic">"{kit.competitorGap}"</p>
                            <div className="pt-6 border-t border-slate-800">
                               <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Strategic Pillar Ratings</p>
                               <div className="h-64"><RadarChartComponent data={radarChartData} /></div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Input Section */
            <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-1000">
              <div className="bg-slate-900/20 border border-slate-800/50 rounded-3xl p-10 backdrop-blur-xl">
                 <div className="flex gap-4 mb-10">
                    <button onClick={() => setMode('manual')} className={`flex-1 py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all ${mode === 'manual' ? 'bg-white text-black shadow-2xl shadow-white/10' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}>Manual Brief</button>
                    <button onClick={() => setMode('ai')} className={`flex-1 py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all ${mode === 'ai' ? 'bg-white text-black shadow-2xl shadow-white/10' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}>AI Automation</button>
                 </div>

                 {mode === 'ai' ? (
                   <div className="space-y-6">
                      <textarea 
                        value={tutorialText} 
                        onChange={(e) => setTutorialText(e.target.value)} 
                        placeholder="Paste your rough script, article, or video notes here for strategic extraction..." 
                        className="w-full h-56 bg-slate-950 border border-slate-800/50 rounded-2xl p-6 text-sm font-mono text-slate-300 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all placeholder:text-slate-700"
                      />
                      <button onClick={handleAnalyzeSource} className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all">
                        Deep Source Analysis
                      </button>
                   </div>
                 ) : (
                   <div className="grid gap-8">
                     <div>
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Video Topic / Core Thesis</label>
                       <input name="topic" value={brief.topic} onChange={handleBriefChange} placeholder="e.g. How to scale a Shopify store in 2025" className="w-full bg-slate-950 border border-slate-800/50 rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-teal-500/50 outline-none transition-all" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Target Demographic</label>
                          <input name="audience" value={brief.audience} onChange={handleBriefChange} placeholder="e.g. Ecommerce beginners" className="w-full bg-slate-950 border border-slate-800/50 rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-teal-500/50 outline-none transition-all" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block">Desired Transformation</label>
                          <input name="outcome" value={brief.outcome} onChange={handleBriefChange} placeholder="e.g. First sale in 30 days" className="w-full bg-slate-950 border border-slate-800/50 rounded-2xl p-5 text-sm font-bold focus:ring-2 focus:ring-teal-500/50 outline-none transition-all" />
                        </div>
                     </div>
                   </div>
                 )}

                 <button 
                  onClick={handleGenerate} 
                  disabled={!brief.topic} 
                  className="w-full mt-12 bg-teal-500 text-black py-7 rounded-3xl font-black text-xl uppercase tracking-widest hover:scale-[1.01] hover:bg-teal-400 active:scale-95 transition-all disabled:opacity-30 shadow-2xl shadow-teal-500/20"
                 >
                   Architect Strategy
                 </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
