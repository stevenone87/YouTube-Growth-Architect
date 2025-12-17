
import React, { useState, useCallback } from 'react';
import { StrategicBrief, PublishingKit, LoadingState, CategoryWeights } from './types';
import { generatePublishingKit, analyzeScriptForBrief, generateImageFromPrompt, evaluatePublishingKit, refinePublishingKit, suggestWeights } from './services/geminiService';
import LoadingIndicator from './components/LoadingIndicator';
import { CopyIcon, CheckIcon, RefreshCwIcon, DownloadIcon, SparklesIcon } from './components/Icons';
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
    <div className="bg-slate-900 p-4 rounded-md relative group border border-slate-800">
      <h4 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">{title}</h4>
      {children || <p className={`whitespace-pre-wrap ${isMono ? 'font-mono' : 'text-gray-200'}`}>{content}</p>}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label={`Copy ${title}`}
      >
        {isCopied ? <CheckIcon className="h-5 w-5 text-green-400" /> : <CopyIcon className="h-5 w-5 text-gray-400" />}
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
  const [isSuggesting, setIsSuggesting] = useState(false);


  const handleBriefChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBrief(prev => ({ ...prev, [name]: value }));
  };

  const handleAnalyzeScript = async () => {
    if (!tutorialText.trim()) {
      setError('Please paste your script or tutorial text first.');
      return;
    }
    setError(null);
    setLoadingState(LoadingState.ANALYZING_SCRIPT);
    try {
      const result = await analyzeScriptForBrief(tutorialText);
      setBrief(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };
  
  const handleGenerate = async () => {
    if (!brief.topic.trim()) {
      setError('Please fill out all fields in the strategic brief.');
      return;
    }
    setError(null);
    setKit(null);
    setThumbnailImages([null, null, null]);
    setSelectedTitle(null);
    setCategoryWeights(null);
    setGenerationPhase('initial');
    
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

  const handleAiSuggestWeights = async () => {
    if (!kit) return;
    setIsSuggesting(true);
    try {
      const suggestion = await suggestWeights(brief, kit);
      setCategoryWeights(suggestion);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleRefine = async () => {
    if (!kit || !selectedTitle || !categoryWeights) {
      setError('Cannot refine without an initial kit, a selected title, and performance weights.');
      return;
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
        generateImageFromPrompt(thumb.aiImagePrompt)
      );
      
      const generatedImages = await Promise.all(imagePromises);
      const imageUrls = generatedImages.map(base64Data => `data:image/png;base64,${base64Data}`);
      setThumbnailImages(imageUrls);

    } catch (err) {
       setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
       setLoadingState(LoadingState.IDLE);
    }
  };

  const handleStartOver = useCallback(() => {
    setBrief({ topic: '', audience: '', outcome: '' });
    setKit(null);
    setLoadingState(LoadingState.IDLE);
    setError(null);
    setMode('manual');
    setTutorialText('');
    setThumbnailImages([null, null, null]);
    setSelectedTitle(null);
    setCategoryWeights(null);
    setGenerationPhase('initial');
  }, []);

  const isFormValid = brief.topic.trim() && brief.audience.trim() && brief.outcome.trim();
  const isLoading = loadingState !== LoadingState.IDLE;

  const radarChartData = categoryWeights 
    ? Object.entries(categoryWeights).map(([key, value]) => ({ category: key, weight: value }))
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
             <svg className="w-12 h-12 text-teal-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
             <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-white via-teal-200 to-blue-400 text-transparent bg-clip-text pb-1">
                YouTube Architect
             </h1>
          </div>
          <p className="text-gray-400 mt-2 font-medium">Precision-engineered publishing kits for strategic growth.</p>
        </header>

        {(kit || isLoading) && (
          <button
            onClick={handleStartOver}
            className="fixed top-4 right-4 z-20 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full flex items-center transition-all border border-slate-700 shadow-2xl"
            aria-label="Start Over"
          >
            <RefreshCwIcon className="h-6 w-6" />
          </button>
        )}

        <main className="space-y-8 pb-12">
          {error && (
            <div className="bg-red-950/40 border border-red-900/50 text-red-200 px-4 py-3 rounded-md animate-shake" role="alert">
              <strong className="font-bold">System Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {isLoading ? (
            <LoadingIndicator state={loadingState} />
          ) : kit ? (
            // Results View
            <div className="space-y-8 animate-fade-in">
              <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-2xl backdrop-blur-sm">
                 <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
                      <span className="text-teal-500">01</span> SEO Elements
                    </h2>
                    {generationPhase === 'refined' && <span className="px-3 py-1 bg-teal-500/10 text-teal-400 rounded-full text-xs font-bold border border-teal-500/30 uppercase tracking-widest">Refined Engine</span>}
                 </div>
                 
                 <div className="space-y-6">
                    {generationPhase === 'initial' ? (
                        <>
                           <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Pick a Strategy Driver (Selected Title):</h3>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {(Object.keys(kit.titles) as Array<keyof typeof kit.titles>).map(key => {
                                const title = kit.titles[key];
                                return (
                                  <button 
                                    key={key} 
                                    onClick={() => setSelectedTitle(title)} 
                                    className={`p-4 rounded-xl text-left transition-all duration-300 border-2 flex flex-col justify-between h-full ${selectedTitle === title ? 'bg-teal-900/20 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)]' : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'}`}
                                  >
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-2 w-fit ${key === 'benefitDriven' ? 'bg-blue-900 text-blue-200' : key === 'intrigueDriven' ? 'bg-purple-900 text-purple-200' : 'bg-amber-900 text-amber-200'}`}>
                                      {/* Fix: Explicitly cast key to String to avoid property 'replace' does not exist error on string | number | symbol union */}
                                      {String(key).replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <p className="font-bold text-sm leading-tight text-gray-100">{title}</p>
                                  </button>
                                );
                              })}
                           </div>
                        </>
                    ) : (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <CopyableBlock title="Benefit Title" content={kit.titles.benefitDriven} />
                           <CopyableBlock title="Intrigue Title" content={kit.titles.intrigueDriven} />
                           <CopyableBlock title="SEO Title" content={kit.titles.keywordFocused} />
                       </div>
                    )}
                    <CopyableBlock title="Architectural Description" content={kit.description} />
                    <CopyableBlock title="System Tags" content={kit.tags} isMono={true} />
                 </div>
              </section>

              {generationPhase === 'initial' && categoryWeights && (
                <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                     <SparklesIcon className="w-24 h-24 text-teal-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-100 flex items-center gap-2">
                    <span className="text-blue-500">02</span> Strategic Tuning
                  </h2>
                  <p className="text-sm text-gray-400 mb-8 max-w-lg">The AI has scored its draft. Use the controls below to shift focus categories before the final high-fidelity generation.</p>
                  
                  <div className="grid lg:grid-cols-2 gap-12 items-center">
                     <div className="h-64 sm:h-80 w-full">
                       <RadarChartComponent data={radarChartData} />
                     </div>
                     <div className="bg-slate-950/50 p-6 rounded-xl border border-slate-800">
                       <WeightSliders 
                        weights={categoryWeights} 
                        setWeights={setCategoryWeights} 
                        onAiSuggest={handleAiSuggestWeights}
                        isSuggesting={isSuggesting}
                       />
                       <button 
                        onClick={handleRefine} 
                        disabled={!selectedTitle || isLoading} 
                        className="mt-8 w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-black py-4 px-6 rounded-xl transition-all shadow-xl uppercase tracking-widest text-sm flex items-center justify-center gap-2"
                       >
                          <SparklesIcon className="w-5 h-5" />
                          Execute Refinement
                       </button>
                     </div>
                  </div>
                </section>
              )}


              <section className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-2xl">
                 <h2 className="text-2xl font-bold mb-6 text-gray-100 flex items-center gap-2">
                    <span className="text-purple-500">03</span> Visual Concepts
                 </h2>
                 <div className="grid gap-8">
                    {kit.thumbnails.map((thumb, index) => (
                      <div key={index} className="bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden grid lg:grid-cols-2 shadow-inner">
                        <div className="p-6 flex flex-col h-full">
                          <div className="mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-900/50 mb-1 inline-block">Concept {index + 1}</span>
                            <h3 className="text-xl font-bold text-gray-100">{thumb.conceptName}</h3>
                          </div>
                          <div className="flex-grow space-y-4">
                            <p className="text-sm text-gray-400 italic leading-relaxed">"{thumb.psychology}"</p>
                            <div className="text-sm text-gray-300 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                                {thumb.visualDescription}
                            </div>
                            <CopyableBlock title="AI Generation Prompt" content={thumb.aiImagePrompt} isMono={true} />
                          </div>
                        </div>
                        <div className="bg-black/40 flex flex-col items-center justify-center p-4 min-h-[300px] border-l border-slate-800">
                          {generationPhase === 'refined' && thumbnailImages[index] ? (
                            <>
                              <img src={thumbnailImages[index]!} alt={thumb.conceptName} className="rounded-lg shadow-2xl w-full aspect-video object-cover"/>
                              <a
                                href={thumbnailImages[index]!}
                                download={`${thumb.conceptName.replace(/\s+/g, '_')}.png`}
                                className="mt-4 inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-6 rounded-lg transition-all text-xs uppercase tracking-widest border border-slate-700"
                              >
                                <DownloadIcon className="h-4 w-4" />
                                Export Visual
                              </a>
                            </>
                          ) : (
                             <div className="w-full aspect-video flex flex-col items-center justify-center bg-slate-900/80 rounded-lg border-2 border-dashed border-slate-800 p-8 text-center">
                               <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                 <SparklesIcon className="w-6 h-6 text-slate-600" />
                               </div>
                               <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-loose">
                                 {generationPhase === 'refined' && !thumbnailImages[index] ? "Visual Synthesis Failed" : "Awaiting Refinement Phase"}
                               </p>
                             </div>
                          )}
                        </div>
                      </div>
                    ))}
                 </div>
              </section>
            </div>
          ) : (
            // Form View
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-8 backdrop-blur-md">
              <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-inner">
                <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all ${mode === 'manual' ? 'bg-slate-800 text-teal-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Manual Brief</button>
                <button onClick={() => setMode('ai')} className={`flex-1 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all ${mode === 'ai' ? 'bg-slate-800 text-teal-400 shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>AI Analysis</button>
              </div>

              {mode === 'ai' && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label htmlFor="tutorialText" className="block text-sm font-bold uppercase tracking-widest text-gray-500">Source Material (Script/Outline)</label>
                    <textarea
                      id="tutorialText"
                      name="tutorialText"
                      value={tutorialText}
                      onChange={(e) => setTutorialText(e.target.value)}
                      placeholder="Paste your script here. Our AI will extract the strategic pillars..."
                      className="w-full p-4 h-64 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all font-mono text-sm text-gray-300 resize-none shadow-inner"
                    />
                  </div>
                  <button onClick={handleAnalyzeScript} disabled={isLoading || !tutorialText.trim()} className="flex items-center justify-center gap-3 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black py-4 px-6 rounded-xl transition-all shadow-xl uppercase tracking-widest text-xs">
                    <SparklesIcon className="h-5 w-5"/>
                    Automate Strategic Brief
                  </button>
                </div>
              )}
              
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label htmlFor="topic" className="block text-sm font-bold uppercase tracking-widest text-gray-500">Video Focus</label>
                  <input id="topic" name="topic" type="text" value={brief.topic} onChange={handleBriefChange} placeholder="Main subject of the video..." className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all text-gray-200 shadow-inner"/>
                </div>
                <div className="space-y-2">
                  <label htmlFor="audience" className="block text-sm font-bold uppercase tracking-widest text-gray-500">Target Persona</label>
                  <input id="audience" name="audience" type="text" value={brief.audience} onChange={handleBriefChange} placeholder="Who needs to see this?" className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all text-gray-200 shadow-inner"/>
                </div>
                <div className="space-y-2">
                  <label htmlFor="outcome" className="block text-sm font-bold uppercase tracking-widest text-gray-500">Value Proposition</label>
                  <input id="outcome" name="outcome" type="text" value={brief.outcome} onChange={handleBriefChange} placeholder="What is the key takeaway?" className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all text-gray-200 shadow-inner"/>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!isFormValid || isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-black py-5 px-8 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-[0_0_30px_rgba(20,184,166,0.2)] uppercase tracking-widest text-base"
              >
                Synthesize Publishing Kit
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
