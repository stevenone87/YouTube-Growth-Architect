// Fix: Add missing React imports
import React, { useState, useCallback } from 'react';
// Fix: Correctly import all necessary types from the now-fixed types.ts
import { StrategicBrief, PublishingKit, LoadingState, CategoryWeights } from './types';
// Fix: Import all necessary service functions, including the new ones for evaluation and refinement
import { generatePublishingKit, analyzeScriptForBrief, generateImageFromPrompt, evaluatePublishingKit, refinePublishingKit } from './services/geminiService';
import LoadingIndicator from './components/LoadingIndicator';
import { CopyIcon, CheckIcon, RefreshCwIcon, DownloadIcon, SparklesIcon } from './components/Icons';
import RadarChartComponent from './components/RadarChart';
import WeightSliders from './components/WeightSliders';


// Helper component for repeatable copyable text blocks
const CopyableBlock: React.FC<{ title: string; content: string; isMono?: boolean; children?: React.ReactNode }> = ({ title, content, isMono = false, children }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 p-4 rounded-md relative group">
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
      setError(err instanceof Error ? err.message : 'An unknown error occurred during script analysis.');
      console.error(err);
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };
  
  const handleGenerate = async () => {
    if (!isFormValid) {
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
      setError(err instanceof Error ? err.message : 'An unknown error occurred during generation.');
      console.error(err);
    } finally {
      setLoadingState(LoadingState.IDLE);
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
       setError(err instanceof Error ? err.message : 'An unknown error occurred during refinement.');
       console.error(err);
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
    <div className="min-h-screen bg-slate-900 text-gray-200 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3">
             <svg className="w-10 h-10 text-teal-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.623 8.364L12.981 3.52a2.321 2.321 0 00-3.962 0l-3.642 4.844a2.215 2.215 0 00-.002 2.14l5.346 7.128a2.321 2.321 0 003.963 0l5.346-7.128a2.215 2.215 0 00-.007-2.14zM12 21.818V19.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 21.818V19.5M8.25 21.818h7.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path></svg>
             <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 text-transparent bg-clip-text pb-2">
                YouTube Growth Architect
             </h1>
          </div>
          <p className="text-gray-400 mt-2">Generate and refine a complete publishing kit from a single idea or script.</p>
        </header>

        {(kit || isLoading) && (
          <button
            onClick={handleStartOver}
            className="fixed top-4 right-4 z-10 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-full flex items-center transition-colors shadow-lg"
            aria-label="Start Over"
          >
            <RefreshCwIcon className="h-5 w-5" />
          </button>
        )}

        <main className="space-y-8">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {isLoading ? (
            <LoadingIndicator state={loadingState} />
          ) : kit ? (
            // Results View
            <div className="space-y-8 animate-fade-in">
              <section className="bg-slate-800/50 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-semibold mb-4 text-gray-300 border-b border-slate-700 pb-3">Part 1: SEO Elements {generationPhase === 'refined' && <span className="text-teal-400 font-bold text-lg">(Refined)</span>}</h2>
                 <div className="space-y-4 mt-4">
                    {generationPhase === 'initial' ? (
                        <>
                           <h3 className="text-lg font-semibold text-gray-300">Choose Your Primary Title:</h3>
                           <div className="grid sm:grid-cols-3 gap-4">
                              {(Object.keys(kit.titles) as Array<keyof typeof kit.titles>).map(key => {
                                const title = kit.titles[key];
                                return (
                                  <button key={key} onClick={() => setSelectedTitle(title)} className={`p-4 rounded-lg text-left transition-all duration-200 border-2 ${selectedTitle === title ? 'bg-teal-900/50 border-teal-500 scale-105 shadow-lg' : 'bg-slate-800 border-slate-700 hover:border-teal-600 hover:bg-slate-700'}`}>
                                    <span className="block text-xs font-semibold uppercase text-gray-400">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    <p className="mt-1 font-semibold text-gray-200">{title}</p>
                                  </button>
                                );
                              })}
                           </div>
                        </>
                    ) : (
                       <div className="grid md:grid-cols-3 gap-4">
                           <CopyableBlock title="Benefit-Driven Title" content={kit.titles.benefitDriven} />
                           <CopyableBlock title="Intrigue-Driven Title" content={kit.titles.intrigueDriven} />
                           <CopyableBlock title="Keyword-Focused Title" content={kit.titles.keywordFocused} />
                       </div>
                    )}
                    <CopyableBlock title="Optimized Description" content={kit.description} />
                    <CopyableBlock title="Tags" content={kit.tags} isMono={true} />
                 </div>
              </section>

              {generationPhase === 'initial' && categoryWeights && (
                <section className="bg-slate-800/50 p-6 rounded-lg shadow-xl">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-300 border-b border-slate-700 pb-3">AI Performance Analysis & Refinement</h2>
                  <p className="text-gray-400 mt-2 mb-4">The AI has analyzed its own work. Adjust these sliders to guide the next-level refinement.</p>
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                     <div className="h-64 md:h-80">
                       <RadarChartComponent data={radarChartData} />
                     </div>
                     <div>
                       <WeightSliders weights={categoryWeights} setWeights={setCategoryWeights} />
                     </div>
                  </div>
                  <button onClick={handleRefine} disabled={!selectedTitle || isLoading} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-all duration-300 transform hover:scale-105 text-lg">
                      Generate Next Level Kit
                  </button>
                </section>
              )}


              <section className="bg-slate-800/50 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-semibold mb-4 text-gray-300 border-b border-slate-700 pb-3">Part 2: High-CTR Thumbnail Concepts {generationPhase === 'refined' && <span className="text-teal-400 font-bold text-lg">(Refined Images)</span>}</h2>
                 <div className="space-y-6 mt-4">
                    {kit.thumbnails.map((thumb, index) => (
                      <div key={index} className="bg-slate-800 p-4 rounded-lg grid md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-3">
                          <h3 className="text-lg font-bold text-teal-300">{thumb.conceptName}</h3>
                          <p className="text-sm italic text-gray-400 mb-3">{thumb.psychology}</p>
                          <CopyableBlock title="Visual Description" content={thumb.visualDescription}>
                              <p className="text-gray-300">{thumb.visualDescription}</p>
                          </CopyableBlock>
                          <CopyableBlock title="AI Image Prompt" content={thumb.aiImagePrompt} isMono={true} />
                        </div>
                        <div className="flex flex-col items-center justify-center bg-slate-900 rounded-md p-3 min-h-[250px]">
                          {generationPhase === 'refined' && thumbnailImages[index] ? (
                            <>
                              <img src={thumbnailImages[index]!} alt={`Generated image for ${thumb.conceptName}`} className="rounded-md w-full aspect-video object-cover"/>
                              <a
                                href={thumbnailImages[index]!}
                                download={`${thumb.conceptName.replace(/\s+/g, '_')}.png`}
                                className="mt-3 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                              >
                                <DownloadIcon className="h-4 w-4" />
                                Download
                              </a>
                            </>
                          ) : (
                             <div className="w-full aspect-video flex items-center justify-center bg-slate-700 rounded-md">
                               <p className="text-gray-400 text-center px-4">{generationPhase === 'refined' && !thumbnailImages[index] ? "Error generating image." : "Image will be generated after refinement."}</p>
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
            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl space-y-6">
              <div className="flex bg-slate-800 p-1 rounded-lg">
                <button onClick={() => setMode('manual')} className={`w-1/2 py-2 rounded-md font-semibold transition-colors ${mode === 'manual' ? 'bg-teal-600 text-white' : 'hover:bg-slate-700 text-gray-300'}`}>Manual Brief</button>
                <button onClick={() => setMode('ai')} className={`w-1/2 py-2 rounded-md font-semibold transition-colors ${mode === 'ai' ? 'bg-teal-600 text-white' : 'hover:bg-slate-700 text-gray-300'}`}>AI-Assisted Brief</button>
              </div>

              {mode === 'ai' && (
                <div className="space-y-3 p-4 border border-slate-700 rounded-md">
                  <label htmlFor="tutorialText" className="block text-lg font-semibold mb-2 text-gray-300">Paste Your Full Script or Tutorial Text</label>
                  <textarea
                    id="tutorialText"
                    name="tutorialText"
                    value={tutorialText}
                    onChange={(e) => setTutorialText(e.target.value)}
                    placeholder="Paste your entire video script, tutorial steps, or a detailed outline here..."
                    className="w-full p-3 h-48 bg-slate-900 border-2 border-slate-700 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition font-sans text-gray-200"
                  />
                  <button onClick={handleAnalyzeScript} disabled={isLoading || !tutorialText.trim()} className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    <SparklesIcon className="h-5 w-5"/>
                    Analyze Script & Create Brief
                  </button>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="topic" className="block text-lg font-semibold mb-2 text-gray-300">1. Video Topic</label>
                  <input id="topic" name="topic" type="text" value={brief.topic} onChange={handleBriefChange} placeholder="e.g., A tutorial on how to use the new n8n AI feature" className="w-full p-3 bg-slate-900 border-2 border-slate-700 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition font-sans text-gray-200"/>
                </div>
                <div>
                  <label htmlFor="audience" className="block text-lg font-semibold mb-2 text-gray-300">2. Target Audience</label>
                  <input id="audience" name="audience" type="text" value={brief.audience} onChange={handleBriefChange} placeholder="e.g., Beginner to intermediate n8n users who want to save time" className="w-full p-3 bg-slate-900 border-2 border-slate-700 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition font-sans text-gray-200"/>
                </div>
                <div>
                  <label htmlFor="outcome" className="block text-lg font-semibold mb-2 text-gray-300">3. Key Outcome for Viewer</label>
                  <input id="outcome" name="outcome" type="text" value={brief.outcome} onChange={handleBriefChange} placeholder="e.g., They will build a complete workflow from a single sentence" className="w-full p-3 bg-slate-900 border-2 border-slate-700 rounded-md focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition font-sans text-gray-200"/>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!isFormValid || isLoading}
                className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-all duration-300 transform hover:scale-105 text-lg"
              >
                Generate My Publishing Kit
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
