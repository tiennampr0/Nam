import React, { useState, useRef, useEffect } from 'react';
import * as mammoth from 'mammoth';
import { Genre, AuthorStyle, ActionType, GenerationConfig, ContentLength, ReasoningMode, Pacing } from './types';
import { generateNovelContentStream } from './services/geminiService';
import { FeatherIcon, ScrollIcon, MagicWandIcon, CopyIcon, SettingsIcon, ChevronDownIcon, BookOpenIcon, UploadIcon, GlobeIcon } from './components/Icons';
import { Button } from './components/Button';

// --- Shared Types & Components ---

type AppMode = 'PLANNING' | 'WRITING';

interface SidebarSectionProps {
  title: string;
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, icon: Icon, children }) => (
  <div className="mb-6 group">
    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 group-hover:text-cyan-500 transition-colors">
      <Icon className="w-3 h-3" /> {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </div>
);

interface SelectInputProps {
  label: string;
  value: string;
  options: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
    <div className="relative group">
      <select 
        className="w-full p-2 bg-[#020617] border border-slate-700 rounded-sm text-xs text-slate-300 font-medium focus:border-cyan-500/50 focus:shadow-[0_0_10px_rgba(6,182,212,0.2)] outline-none appearance-none cursor-pointer transition-all"
        value={value}
        onChange={onChange}
      >
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDownIcon className="absolute right-3 top-2.5 w-3 h-3 text-slate-500 pointer-events-none group-hover:text-cyan-500 transition-colors" />
    </div>
  </div>
);

interface TextAreaInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  height?: string;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TextAreaInput: React.FC<TextAreaInputProps> = ({ label, value, onChange, placeholder, height = "h-20", onUpload }) => (
  <div className="relative">
    <div className="flex justify-between items-end mb-1">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      {onUpload && (
        <label className="cursor-pointer text-[9px] text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-1">
          <UploadIcon className="w-3 h-3" /> Tải lên
          <input type="file" className="hidden" onChange={onUpload} accept=".txt,.docx" />
        </label>
      )}
    </div>
    <textarea 
      className={`w-full ${height} p-3 ue5-input rounded-sm text-[11px] text-slate-300 placeholder-slate-600 outline-none resize-none custom-scrollbar font-mono leading-relaxed`}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  </div>
);

const App: React.FC = () => {
  // --- App State ---
  const [mode, setMode] = useState<AppMode>('PLANNING');
  const [inputText, setInputText] = useState(''); // For Writing Mode
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettingsMobile, setShowSettingsMobile] = useState(false);

  // --- Planning Mode Specific State ---
  const [planGoal, setPlanGoal] = useState('');
  const [planSystem, setPlanSystem] = useState('');
  const [planCharacter, setPlanCharacter] = useState('');
  
  // --- Configuration ---
  const [config, setConfig] = useState<GenerationConfig>({
    genre: Genre.XIANXIA,
    authorStyle: AuthorStyle.VONG_NGU,
    creativity: 0.9,
    action: ActionType.PLANNING, // Default to PLANNING
    useDeepThinking: true,
    thinkingBudget: 16384, // Higher budget for complex tasks
    reasoningMode: ReasoningMode.LOGIC,
    length: ContentLength.LONG, 
    pacing: Pacing.MODERATE,
    model: 'gemini-3-pro-preview', // Default to Pro for smarts
    previousEnding: '',
    outline: '',
    worldSettings: ''
  });

  const outputEndRef = useRef<HTMLDivElement>(null);
  const outputContainerRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const wordCount = generatedText ? generatedText.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (isGenerating && outputContainerRef.current) {
       const container = outputContainerRef.current;
       if (container.scrollHeight - container.scrollTop - container.clientHeight < 300) {
         outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
       }
    }
  }, [generatedText, isGenerating]);

  // Update action type based on Mode Switch
  useEffect(() => {
    if (mode === 'PLANNING') {
      setConfig(prev => ({ ...prev, action: ActionType.PLANNING, model: 'gemini-3-pro-preview', thinkingBudget: 16384 }));
    } else {
      setConfig(prev => ({ ...prev, action: ActionType.REWRITE, thinkingBudget: 4096 }));
    }
  }, [mode]);

  const handleGenerate = async () => {
    setError(null);
    setGeneratedText('');
    setShowSettingsMobile(false);

    let finalInput = inputText;

    // Construct input for Planning Mode
    if (mode === 'PLANNING') {
      if (!planGoal.trim()) {
        setError("Cần nhập ý tưởng cốt lõi để kiến trúc đại cương.");
        return;
      }
      // Combine fields into a structured prompt
      finalInput = `
        [DỮ LIỆU KIẾN TRÚC ĐẠI CƯƠNG]
        1. Ý TƯỞNG CỐT LÕI & MỤC TIÊU: ${planGoal}
        2. HỆ THỐNG TU LUYỆN & THẾ GIỚI: ${planSystem || config.worldSettings || "Tự thiết lập theo chuẩn Tiên Hiệp"}
        3. NHÂN VẬT CHÍNH & TUYẾN NHÂN VẬT: ${planCharacter}
        
        YÊU CẦU: Xây dựng đại cương chi tiết 1000-5000 chương, chia thành các Quyển, đặt tên chương 100 chương đầu.
      `;
    } else {
      // Writing Mode Check
      if (!inputText.trim()) {
        setError("Chưa có nội dung để sáng tác/nhuận sắc.");
        return;
      }
    }

    setIsGenerating(true);

    try {
      await generateNovelContentStream(finalInput, config, (chunk) => {
        setGeneratedText(prev => prev + chunk);
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'outline' | 'worldSettings') => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      let content = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        content = result.value;
      } else {
        content = await file.text();
      }
      setConfig(prev => ({ ...prev, [field]: content }));
      // Auto-fill planning fields if in planning mode
      if (mode === 'PLANNING' && field === 'worldSettings') {
         setPlanSystem(content);
      }
    } catch (err) {
      console.error("File upload error:", err);
      setError("Lỗi đọc file.");
    }
    event.target.value = '';
  };

  const copyToClipboard = () => navigator.clipboard.writeText(generatedText);

  // --- Rendering Text ---
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((paragraph, idx) => {
      let trimP = paragraph.trim();
      const isSceneBreak = trimP === '***' || trimP === '---' || trimP === '❖';
      if (isSceneBreak) return <div key={idx} className="text-center text-cyan-500/50 my-8 text-xl animate-pulse">❖</div>;

      trimP = trimP.replace(/\*+/g, '');
      if (!trimP) return <div key={idx} className="h-4" />;

      // Header detection
      const isHeader = trimP.startsWith('Quyển') || trimP.startsWith('Chương') || trimP.startsWith('Hồi') || /^#+\s/.test(trimP);
      
      if (isHeader) {
        return (
          <h3 key={idx} className="font-heading text-2xl md:text-3xl font-bold text-amber-500 text-center mt-12 mb-6 uppercase tracking-widest border-b border-amber-900/30 pb-4">
            {trimP.replace(/^#+\s/, '')}
          </h3>
        );
      }
      
      // Planning Mode Bullet points
      if (mode === 'PLANNING' && (trimP.startsWith('-') || trimP.startsWith('•'))) {
         return <li key={idx} className="ml-4 mb-2 text-slate-300 font-sans list-none text-sm leading-relaxed">{trimP}</li>;
      }

      return (
        <p key={idx} className={`mb-4 text-slate-300 leading-relaxed text-lg text-justify font-serif-text ${idx === 0 && mode === 'WRITING' ? 'drop-cap' : ''}`}>
          {trimP}
        </p>
      );
    });
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 overflow-hidden font-sans selection:bg-cyan-900/50 selection:text-cyan-100">
      
      {/* --- TOP BAR: MODE SWITCHER --- */}
      <div className="absolute top-0 left-0 w-full h-14 bg-[#020617]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-4">
             <div className="bg-gradient-to-br from-cyan-500 to-blue-600 w-8 h-8 rounded flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
               <FeatherIcon className="text-white w-5 h-5" />
             </div>
             <div>
                <h1 className="font-heading font-bold text-slate-100 tracking-wider">Lạc Nam Tử</h1>
                <p className="text-[9px] text-cyan-500 uppercase tracking-[0.2em] animate-pulse">Hệ Thống Phụ Trợ V1.2</p>
             </div>
          </div>
          
          {/* Mode Tabs */}
          <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-800">
             <button 
               onClick={() => setMode('PLANNING')}
               className={`px-6 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${mode === 'PLANNING' ? 'bg-amber-900/40 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Kiến Trúc Đại Cương
             </button>
             <button 
               onClick={() => setMode('WRITING')}
               className={`px-6 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${mode === 'WRITING' ? 'bg-cyan-900/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
             >
               Sáng Tác / Nhuận Sắc
             </button>
          </div>

          <div className="hidden md:block w-32"></div> {/* Spacer */}
      </div>

      {/* --- LEFT SIDEBAR: CONTEXT SETTINGS --- */}
      <aside className={`
        ue5-panel mt-14 flex-shrink-0 w-80 border-r-0 border-r-slate-800/50 flex flex-col z-40 transition-transform duration-300 absolute md:relative h-[calc(100%-3.5rem)]
        ${showSettingsMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          <div className={`p-3 rounded mb-6 border ${mode === 'PLANNING' ? 'bg-amber-950/20 border-amber-900/50' : 'bg-cyan-950/20 border-cyan-900/50'}`}>
            <h4 className={`text-xs font-bold uppercase tracking-widest mb-1 ${mode === 'PLANNING' ? 'text-amber-500' : 'text-cyan-500'}`}>
               {mode === 'PLANNING' ? 'Chế độ: Kiến Trúc Sư' : 'Chế độ: Tác Giả'}
            </h4>
            <p className="text-[10px] text-slate-400">
              {mode === 'PLANNING' ? 'Tối ưu hóa logic, xây dựng thế giới và bố cục dài hạn.' : 'Tối ưu hóa văn phong, miêu tả và hội thoại.'}
            </p>
          </div>

          <SidebarSection title="Thông Số AI" icon={SettingsIcon}>
            <div className="grid grid-cols-2 gap-2 mb-4">
               {/* Model Selection based on Mode priority */}
               <div className={`col-span-2 p-2 rounded border text-[10px] font-bold uppercase flex justify-between items-center ${config.model === 'gemini-3-pro-preview' ? 'bg-purple-900/20 border-purple-500/30 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                 <span>Gemini 3.0 Pro</span>
                 <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
               </div>
            </div>
             <SelectInput 
                 label="Chế Độ Tư Duy"
                 value={config.reasoningMode}
                 options={Object.values(ReasoningMode)}
                 onChange={(e: any) => setConfig({...config, reasoningMode: e.target.value})}
               />
          </SidebarSection>

          <SidebarSection title="Thiết Lập" icon={GlobeIcon}>
             <SelectInput label="Thể Loại" value={config.genre} options={Object.values(Genre)} onChange={(e:any) => setConfig({...config, genre: e.target.value})} />
             <div className="h-4" />
             {mode === 'WRITING' && (
               <>
                <SelectInput label="Văn Phong" value={config.authorStyle} options={Object.values(AuthorStyle)} onChange={(e:any) => setConfig({...config, authorStyle: e.target.value})} />
                <div className="h-4" />
                <div className="grid grid-cols-2 gap-3">
                  <SelectInput label="Nhịp Độ" value={config.pacing} options={Object.values(Pacing)} onChange={(e:any) => setConfig({...config, pacing: e.target.value})} />
                  <SelectInput label="Độ Dài" value={config.length} options={Object.values(ContentLength)} onChange={(e:any) => setConfig({...config, length: e.target.value})} />
                </div>
               </>
             )}
          </SidebarSection>

          {mode === 'WRITING' && (
            <SidebarSection title="Bối Cảnh" icon={BookOpenIcon}>
              <TextAreaInput 
                label="Quy Tắc Thế Giới (Tóm tắt)" 
                placeholder="Cấp bậc, địa danh..." 
                value={config.worldSettings} 
                onChange={(e:any) => setConfig({...config, worldSettings: e.target.value})}
                onUpload={(e:any) => handleFileUpload(e, 'worldSettings')}
                height="h-24"
              />
              <div className="h-4"/>
              <TextAreaInput 
                label="Bối Cảnh Trước Đó" 
                placeholder="Chương trước kết thúc thế nào?" 
                value={config.previousEnding} 
                onChange={(e:any) => setConfig({...config, previousEnding: e.target.value})}
              />
            </SidebarSection>
          )}

          {mode === 'PLANNING' && (
             <div className="text-[10px] text-slate-500 italic border-t border-slate-800 pt-4 mt-8">
               * Mẹo: Ở chế độ này, AI sẽ đóng vai trò Tổng Kiến Trúc Sư, tự động rà soát logic và đề xuất cấu trúc chia quyển hợp lý nhất cho 1000+ chương.
             </div>
          )}

        </div>
      </aside>

      {/* --- CENTER MAIN: WORKSPACE --- */}
      <main className="flex-1 flex flex-col relative mt-14">
        
        {/* CANVAS (OUTPUT) */}
        <div 
          ref={outputContainerRef}
          className="flex-1 overflow-y-auto relative p-4 md:p-8 lg:p-12 scroll-smooth"
        >
          <div className="max-w-4xl mx-auto pb-64">
            
            {/* The Output Container */}
            <div className={`
              min-h-[800px] p-12 md:p-16 rounded shadow-2xl transition-all duration-500 relative overflow-hidden
              ${mode === 'PLANNING' 
                ? 'bg-[#0f172a]/80 border border-amber-900/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]' 
                : 'bg-[#020617]/90 border border-cyan-900/30 shadow-[0_0_50px_rgba(0,0,0,0.8)]'
              }
            `}>
              {/* Background Effects */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-20" />
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]" />

              {!generatedText && !isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-700 mt-32 select-none">
                  <div className={`border rounded-full p-8 mb-6 bg-slate-900/50 backdrop-blur ${mode === 'PLANNING' ? 'border-amber-900/50 text-amber-900' : 'border-cyan-900/50 text-cyan-900'}`}>
                     {mode === 'PLANNING' ? <GlobeIcon className="w-16 h-16 animate-pulse" /> : <ScrollIcon className="w-16 h-16 animate-pulse" />}
                  </div>
                  <h2 className="text-3xl font-heading font-bold mb-3 uppercase tracking-[0.3em] text-slate-600">
                    {mode === 'PLANNING' ? 'Kiến Trúc Đại Cương' : 'Sáng Tác Thiên Thư'}
                  </h2>
                  <p className="font-serif-text italic text-sm text-slate-500">
                    {mode === 'PLANNING' ? 'Thiết lập thế giới • Phân chia bố cục • Định hình nhân vật' : 'Nhuận sắc văn phong • Diễn hóa tình tiết'}
                  </p>
                </div>
              ) : (
                <article className="animate-fade-in relative z-10 prose-content">
                   <div className="absolute -top-6 right-0 text-[9px] font-bold text-slate-600 uppercase tracking-widest flex gap-4">
                      <span>{wordCount} Tự</span>
                      <span>{config.model}</span>
                   </div>
                   {renderFormattedText(generatedText)}
                </article>
              )}

              {isGenerating && (
                 <div className="mt-8 flex justify-center">
                   <div className={`flex gap-2 items-center text-xs uppercase tracking-widest ${mode === 'PLANNING' ? 'text-amber-500' : 'text-cyan-500'}`}>
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      <span className="ml-2">Đang Diễn Hóa Thiên Cơ...</span>
                   </div>
                 </div>
              )}
              <div ref={outputEndRef} />
            </div>

          </div>
        </div>

        {/* INPUT DOCK - The Control Panel */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto bg-[#020617]/80 backdrop-blur-xl border-t border-slate-700/50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] rounded-t-xl overflow-hidden transition-all duration-300">
            
            {/* --- PLANNING INPUT UI --- */}
            {mode === 'PLANNING' && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="col-span-1 md:col-span-2">
                   <TextAreaInput 
                      label="1. Ý Tưởng Cốt Lõi & Mục Tiêu (Core Concept)" 
                      placeholder="VD: Một phàm nhân có bình nhỏ màu xanh muốn tu luyện thành tiên..."
                      value={planGoal} 
                      onChange={(e:any) => setPlanGoal(e.target.value)}
                      height="h-16"
                   />
                </div>
                <div className="col-span-1">
                   <TextAreaInput 
                      label="2. Hệ Thống Tu Luyện (World Rules)" 
                      placeholder="Cảnh giới: Luyện Khí -> Trúc Cơ..."
                      value={planSystem} 
                      onChange={(e:any) => setPlanSystem(e.target.value)}
                      onUpload={(e:any) => handleFileUpload(e, 'worldSettings')}
                      height="h-24"
                   />
                </div>
                <div className="col-span-1">
                   <TextAreaInput 
                      label="3. Nhân Vật Chính & Tuyến Phụ" 
                      placeholder="Tính cách, bàn tay vàng, kẻ thù..."
                      value={planCharacter} 
                      onChange={(e:any) => setPlanCharacter(e.target.value)}
                      height="h-24"
                   />
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-2 border-t border-slate-800 pt-4">
                  <Button variant="ghost" onClick={() => {setPlanGoal(''); setPlanSystem(''); setPlanCharacter('')}}>Xóa</Button>
                  <Button variant="gold" onClick={handleGenerate} isLoading={isGenerating}>Khởi Tạo Đại Cương</Button>
                </div>
              </div>
            )}

            {/* --- WRITING INPUT UI --- */}
            {mode === 'WRITING' && (
              <div className="p-4 animate-fade-in">
                {/* Actions Tabs */}
                <div className="flex gap-1 mb-3 overflow-x-auto pb-1 no-scrollbar">
                   {/* Map specific actions for writing */}
                   {[ActionType.REWRITE, ActionType.EXPAND, ActionType.SCENE_CRAFTING, ActionType.CRITIQUE].map((act) => (
                     <button 
                        key={act}
                        onClick={() => setConfig({...config, action: act})}
                        className={`px-4 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap
                          ${config.action === act 
                            ? 'bg-cyan-900/40 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                            : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-600'
                          }`}
                     >
                       {act}
                     </button>
                   ))}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1 relative group">
                    <textarea 
                      className="w-full h-24 p-4 bg-[#0f172a] border border-slate-700 rounded-sm text-base text-slate-300 placeholder-slate-600 focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] outline-none resize-none font-serif-text custom-scrollbar transition-all"
                      placeholder="Nhập đoạn văn thô, ý tưởng cảnh quay, hoặc thoại nhân vật..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                      }}
                    />
                    {/* Glowing corner accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  
                  <div className="flex flex-col gap-2 justify-between">
                     <Button variant="icon" onClick={copyToClipboard} title="Sao chép">
                       <CopyIcon className="w-5 h-5" />
                     </Button>
                     <Button 
                      variant="cyan" 
                      onClick={handleGenerate} 
                      isLoading={isGenerating}
                      disabled={!inputText.trim()}
                      className="h-full !px-8 text-lg"
                      title="Khai bút (Ctrl + Enter)"
                    >
                       <MagicWandIcon className="w-6 h-6" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error Message */}
            {error && (
              <div className="absolute top-0 left-0 w-full bg-red-900/90 text-red-200 text-xs py-1 text-center border-b border-red-500 animate-fade-in">
                {error}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;