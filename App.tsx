
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StrategicBrief, PublishingKit, LoadingState, CategoryWeights } from './types';
import { generatePublishingKit, analyzeSourceForBrief, generateImageFromPrompt, evaluatePublishingKit, refinePublishingKit, suggestWeights } from './services/geminiService';
import LoadingIndicator from './components/LoadingIndicator';
import { CopyIcon, CheckIcon, RefreshCwIcon, DownloadIcon, SparklesIcon } from './components/Icons';
import RadarChartComponent from './components/RadarChart';
import WeightSliders from './components/WeightSliders';

// Fix: Use the AIStudio interface to avoid type conflicts with existing window.aistudio declaration.
// This ensures that all declarations of 'aistudio' on the Window interface use the same named type.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio: AIStudio;
  }
}

const CopyableBlock: React.FC<{ title: string; content: string; isMono?: boolean; children?: React.ReactNode }> = ({ title, content, isMono = false, children }) => {
  const [isCopied, setIsCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  return (
    <div className="bg-slate-900 p-4 rounded-md relative group border border-slate-800">
      <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">{title}</h4>
      {children || <p className={`whitespace-pre-wrap ${isMono ? 'font-mono text-xs' : 'text-gray-200 text-sm'}`}>{content}</p>}
      <button onClick={handleCopy} className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
        {isCopied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4 text-gray-400" />}
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
  const [generationPhase, setGenerationPhase] = useState<'initial' | 'refined'>('initial');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success after triggering selection to avoid race condition as per guidelines
      setHasApiKey(true);
    }
  };

  const handleBriefChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBrief(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBrief(prev => ({ ...prev, imageData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeSource = async () => {
    if (!tutorialText.trim() && !brief.imageData) {
      setError('Please provide a script or an image for AI analysis.');
      return;
    }
    setError(null);
    setLoadingState(LoadingState.ANALYZING_SOURCE);
    try {
      const result = await analyzeSourceForBrief(tutorialText, brief.imageData);
      setBrief(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };
  
  const handleGenerate = async () => {
    if (!brief.topic.trim()) {
      setError('Strategic brief is incomplete.');
      return;
    }
    setError(null);
    setKit(null);
    setLoadingState(LoadingState.GENERATING_KIT);
    try {
      const publishingKitResult = await generatePublishingKit(brief);
      setKit(publishingKitResult);
      setLoadingState(LoadingState.EVALUATING_KIT);
      const evaluation = await evaluatePublishingKit(publishingKitResult);
      setCategoryWeights(evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const handleRefine = async () => {
    if (!kit || !selectedTitle || !categoryWeights) return;
    
    // Check for API key before refinement as it uses Pro models
    if (!hasApiKey) {
      const selected = await window.aistudio.hasSelectedApiKey();
      if (!selected) {
        await handleSelectKey();
      }
    }

    setError(null);
    setLoadingState(LoadingState.REFINING_KIT);
    setThumbnailImages([null, null, null]);
    setGenerationPhase('refined');
    try {
      const refinedKitResult = await refinePublishingKit(brief, kit, selectedTitle, categoryWeights);
      setKit(refinedKitResult);
      setLoadingState(LoadingState.GENERATING_IMAGES);
      
      const imagePromises = refinedKitResult.thumbnails.map(thumb => 
        generateImageFromPrompt(thumb.aiImagePrompt, selectedTitle)
      );
      
      const generatedImages = await Promise.all(imagePromises);
      setThumbnailImages(generatedImages.map(data => `data:image/png;base64,${data}`));
    } catch (err: any) {
       console.error(err);
       // Handle specific API key error by resetting state and prompting for re-selection
       if (err.message?.includes("Requested entity was not found")) {
         setError("Project not found. Please re-select a paid API key.");
         setHasApiKey(false);
         if (window.aistudio) {
           await window.aistudio.openSelectKey();
           setHasApiKey(true);
         }
       } else {
         setError(err instanceof Error ? err.message : 'An unknown error occurred during visual synthesis.');
       }
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
    <div className="min-h-screen bg-slate-950 text-gray-200 p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-5xl font-black bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text">YOUTUBE ARCHITECT</h1>
          <p className="text-gray-500 font-mono tracking-tighter uppercase text-xs mt-2">Visual Strategy & Production Blueprint Engine</p>
        </header>

        {(kit || loadingState !== LoadingState.IDLE) && (
          <button onClick={handleStartOver} className="fixed bottom-8 right-8 z-50 bg-white text-black p-4 rounded-full shadow-2xl hover:scale-110 transition-transform">
            <RefreshCwIcon className="w-6 h-6" />
          </button>
        )}

        <main className="space-y-10">
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl text-red-400 text-sm font-bold flex justify-between items-center">
              <span>{error}</span>
              {error.includes("API key") && (
                <button onClick={handleSelectKey} className="bg-red-500 text-white px-3 py-1 rounded text-xs">Select Key</button>
              )}
            </div>
          )}

          {!hasApiKey && generationPhase === 'initial' && kit && (
            <div className="bg-teal-900/20 border border-teal-500/50 p-6 rounded-2xl text-teal-100 mb-6">
              <h3 className="font-bold mb-2">Professional Imaging Required</h3>
              <p className="text-sm mb-4">To generate high-impact professional thumbnails, a paid project API key is required. Visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline font-bold">Billing Docs</a> for more info.</p>
              <button onClick={handleSelectKey} className="bg-teal-500 text-black px-6 py-2 rounded-xl font-bold uppercase text-xs tracking-widest">Select Paid API Key</button>
            </div>
          )}

          {loadingState !== LoadingState.IDLE ? (
            <LoadingIndicator state={loadingState} />
          ) : kit ? (
            <div className="space-y-12 animate-in fade-in duration-700">
              {/* SEO & Strategy Bento Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-teal-400">01</span> SEO & METADATA</h2>
                    <div className="space-y-4">
                      {generationPhase === 'initial' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {Object.entries(kit.titles).map(([key, val]) => (
                            <button key={key} onClick={() => setSelectedTitle(val)} className={`p-4 rounded-xl text-left text-xs font-bold border-2 transition-all ${selectedTitle === val ? 'bg-teal-500/10 border-teal-500' : 'bg-slate-950 border-slate-800'}`}>
                              <span className="block opacity-50 mb-1">{key}</span> {val}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <CopyableBlock title="Benefit" content={kit.titles.benefitDriven} />
                          <CopyableBlock title="Intrigue" content={kit.titles.intrigueDriven} />
                          <CopyableBlock title="SEO" content={kit.titles.keywordFocused} />
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CopyableBlock title="Description Template" content={kit.description} />
                        <div className="space-y-4">
                           <CopyableBlock title="#Hashtags" content={kit.hashtags} />
                           <CopyableBlock title="Search Tags" content={kit.tags} isMono={true} />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Script of Scenes Section */}
                  <section className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><span className="text-blue-400">02</span> PRODUCTION BLUEPRINT</h2>
                    <div className="space-y-1">
                      {kit.scenes.map((scene) => (
                        <div key={scene.sceneNumber} className="grid grid-cols-12 gap-4 p-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <div className="col-span-1 text-[10px] font-mono text-slate-600 flex flex-col items-center">
                            <span>#{scene.sceneNumber}</span>
                            <span className="bg-slate-800 px-1 rounded mt-1">{scene.duration}</span>
                          </div>
                          <div className="col-span-5 text-xs text-teal-200 italic leading-relaxed">
                             <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Visual</span>
                             {scene.visual}
                          </div>
                          <div className="col-span-6 text-xs text-gray-300 leading-relaxed font-mono">
                             <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Audio/Dialogue</span>
                             {scene.audio}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* Strategy Tuning Sidebar */}
                <div className="space-y-6">
                  {generationPhase === 'initial' && categoryWeights && (
                    <section className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl sticky top-6">
                      <h2 className="text-xl font-bold mb-4">REFINEMENT</h2>
                      <div className="h-48 mb-6"><RadarChartComponent data={radarChartData} /></div>
                      <WeightSliders weights={categoryWeights} setWeights={setCategoryWeights} onAiSuggest={() => suggestWeights(brief).then(setCategoryWeights)} />
                      <button onClick={handleRefine} disabled={!selectedTitle} className="w-full mt-6 bg-teal-500 text-black font-black py-4 rounded-xl hover:bg-teal-400 transition-all uppercase tracking-widest text-xs disabled:opacity-50">
                        Execute High-Fidelity Synthesis
                      </button>
                    </section>
                  )}
                  
                  {/* Visual Concepts Bento */}
                  <section className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-bold mb-6 uppercase tracking-tight">Visual Assets</h2>
                    <div className="space-y-8">
                      {kit.thumbnails.map((thumb, idx) => (
                        <div key={idx} className="space-y-4 pb-6 border-b border-slate-800 last:border-0">
                          <div className="aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
                            {thumbnailImages[idx] ? (
                              <img src={thumbnailImages[idx]!} className="w-full h-full object-cover" />
                            ) : (
                              <SparklesIcon className="w-6 h-6 text-slate-800 animate-pulse" />
                            )}
                          </div>
                          <div className="space-y-2">
                            <div className="text-[10px] font-black text-teal-500 uppercase tracking-widest">{thumb.conceptName}</div>
                            <p className="text-xs text-gray-400 italic leading-relaxed">{thumb.psychology}</p>
                            <div className="pt-2">
                               <CopyableBlock title="AI Generation Prompt" content={thumb.aiImagePrompt} isMono />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : (
            /* Input Section */
            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-3xl max-w-3xl mx-auto backdrop-blur-xl">
               <div className="flex gap-4 mb-8">
                <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'manual' ? 'bg-teal-500 text-black' : 'bg-slate-800 text-gray-500'}`}>MANUAL BRIEF</button>
                <button onClick={() => setMode('ai')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === 'ai' ? 'bg-teal-500 text-black' : 'bg-slate-800 text-gray-500'}`}>AI AUTOMATION</button>
              </div>

              {mode === 'ai' && (
                <div className="mb-8 space-y-4">
                  <textarea value={tutorialText} onChange={(e) => setTutorialText(e.target.value)} placeholder="Paste script or rough notes here..." className="w-full h-40 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-mono focus:ring-2 focus:ring-teal-500 transition-all" />
                  <div className="flex items-center gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-800 py-4 rounded-xl border border-slate-700 hover:border-teal-500 transition-all text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      <DownloadIcon className="w-4 h-4 -rotate-180" /> {brief.imageData ? 'Image Ready' : 'Upload Visual Reference'}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} hidden accept="image/*" />
                    <button onClick={handleAnalyzeSource} className="flex-1 bg-indigo-600 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all">Extract Strategic DNA</button>
                  </div>
                  {brief.imageData && <img src={brief.imageData} className="h-20 w-32 object-cover rounded-lg border border-slate-700 ml-auto" />}
                </div>
              )}

              <div className="grid gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Core Topic</label>
                  <input name="topic" value={brief.topic} onChange={handleBriefChange} placeholder="e.g. Building a SaaS with AI" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Target Audience</label>
                    <input name="audience" value={brief.audience} onChange={handleBriefChange} placeholder="e.g. Solo Developers" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Primary Outcome</label>
                    <input name="outcome" value={brief.outcome} onChange={handleBriefChange} placeholder="e.g. Deployment readiness" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold" />
                  </div>
                </div>
              </div>

              <button onClick={handleGenerate} disabled={!brief.topic} className="w-full mt-10 bg-teal-500 text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30">
                Architect Production Kit
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
