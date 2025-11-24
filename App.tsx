import React, { useState, useEffect, useRef } from 'react';
import { Pharmacy, MessageStatus, InquiryConfig, ResponseStatus } from './types';
import PharmacyCard from './components/PharmacyCard';
import { generatePharmacyMessage, batchGenerateMessages } from './services/geminiService';
import { savePharmacies, loadPharmacies } from './services/storageService';
import { parseCSV, exportToCSV, downloadCSV } from './services/csvService';
import { Stats } from './components/Stats';
import { 
    Plus, 
    Sparkles, 
    Upload, 
    Trash2, 
    Pill,
    Play,
    Database,
    Filter,
    FileUp,
    Download
} from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'AVAILABLE'>('ALL');
  
  const [newPharmacyName, setNewPharmacyName] = useState('');
  const [newPharmacyPhone, setNewPharmacyPhone] = useState('');
  
  const [config, setConfig] = useState<InquiryConfig>({
    productName: '',
    additionalNotes: '',
    tone: 'professional'
  });

  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [sendingProgress, setSendingProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    const loaded = loadPharmacies();
    setPharmacies(loaded);
  }, []);

  useEffect(() => {
    savePharmacies(pharmacies);
  }, [pharmacies]);

  // --- Handlers ---

  const addPharmacy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPharmacyName || !newPharmacyPhone) return;

    const newPharmacy: Pharmacy = {
      id: crypto.randomUUID(),
      name: newPharmacyName,
      phone: newPharmacyPhone,
      status: MessageStatus.IDLE,
      responseStatus: ResponseStatus.UNKNOWN,
      message: '',
      lastUpdated: Date.now()
    };

    setPharmacies(prev => [newPharmacy, ...prev]);
    setNewPharmacyName('');
    setNewPharmacyPhone('');
  };

  const removePharmacy = (id: string) => {
    setPharmacies(prev => prev.filter(p => p.id !== id));
  };

  const updateMessage = (id: string, message: string) => {
    setPharmacies(prev => prev.map(p => 
      p.id === id ? { ...p, message } : p
    ));
  };

  const updateStatus = (id: string, status: MessageStatus) => {
    setPharmacies(prev => prev.map(p => 
      p.id === id ? { ...p, status, lastUpdated: Date.now() } : p
    ));
  };

  const updateResponseStatus = (id: string, responseStatus: ResponseStatus) => {
    setPharmacies(prev => prev.map(p => 
      p.id === id ? { ...p, responseStatus, lastUpdated: Date.now() } : p
    ));
  };

  const handleRegenerateSingle = async (id: string) => {
    const pharmacy = pharmacies.find(p => p.id === id);
    if (!pharmacy || !config.productName) return;

    updateStatus(id, MessageStatus.GENERATING);
    const message = await generatePharmacyMessage(pharmacy.name, config);
    
    setPharmacies(prev => prev.map(p => 
      p.id === id ? { ...p, message, status: MessageStatus.READY } : p
    ));
  };

  const handleBulkGenerate = async () => {
    if (!config.productName || pharmacies.length === 0) return;

    setIsBulkGenerating(true);
    setPharmacies(prev => prev.map(p => ({ ...p, status: MessageStatus.GENERATING })));

    const messages = await batchGenerateMessages(
        pharmacies.map(p => ({ name: p.name })),
        config
    );

    setPharmacies(prev => prev.map((p, index) => ({
        ...p,
        message: messages[index] || p.message,
        status: MessageStatus.READY
    })));

    setIsBulkGenerating(false);
  };

  // Automated Sending Simulation
  const handleAutoSend = async () => {
    const targets = pharmacies.filter(p => p.status !== MessageStatus.SENT && p.message);
    if (targets.length === 0) return;

    setIsAutoSending(true);
    setSendingProgress(0);

    for (let i = 0; i < targets.length; i++) {
        const p = targets[i];
        
        // Update current one to indicate processing
        setPharmacies(prev => prev.map(pharm => 
            pharm.id === p.id ? { ...pharm, status: MessageStatus.GENERATING } : pharm
        ));

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mark as Sent and Pending Reply
        setPharmacies(prev => prev.map(pharm => 
            pharm.id === p.id ? { 
                ...pharm, 
                status: MessageStatus.SENT, 
                responseStatus: ResponseStatus.PENDING 
            } : pharm
        ));
        
        setSendingProgress(Math.round(((i + 1) / targets.length) * 100));
    }

    setIsAutoSending(false);
  };

  const clearAll = () => {
    if (window.confirm("Are you sure you want to clear the database? This cannot be undone.")) {
        setPharmacies([]);
    }
  };

  // CSV Import Handler
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const importedPharmacies = await parseCSV(file);
        
        if (importedPharmacies.length === 0) {
            alert("No valid pharmacies found in CSV.");
            return;
        }

        // Avoid duplicates based on normalized phone number
        const existingPhones = new Set(pharmacies.map(p => p.phone.replace(/\D/g, '')));
        const uniqueNew = importedPharmacies.filter(p => {
            const rawPhone = p.phone.replace(/\D/g, '');
            return rawPhone.length > 5 && !existingPhones.has(rawPhone);
        });

        if (uniqueNew.length > 0) {
            setPharmacies(prev => [...uniqueNew, ...prev]);
            alert(`Successfully imported ${uniqueNew.length} new pharmacies. (${importedPharmacies.length - uniqueNew.length} duplicates skipped)`);
        } else {
            alert("All pharmacies in the file already exist in your database.");
        }
    } catch (error) {
        console.error("Import failed", error);
        alert("Failed to parse CSV file. Please check the format.");
    } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // CSV Export Handler
  const handleExport = () => {
    const csvContent = exportToCSV(pharmacies);
    const filename = `pharmacy_inquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(csvContent, filename);
  };

  // Filtering
  const filteredPharmacies = pharmacies.filter(p => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return p.responseStatus === ResponseStatus.PENDING;
    if (activeTab === 'AVAILABLE') return p.responseStatus === ResponseStatus.AVAILABLE;
    return true;
  });

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".csv,.txt" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Database size={24} />
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">PharmaConnect CRM</h1>
                <p className="text-xs text-gray-500">Automated Pharmacy Inquiry System</p>
            </div>
          </div>
          <div className="flex gap-2">
              <button 
                onClick={handleExport}
                disabled={pharmacies.length === 0}
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                title="Export Database to CSV"
              >
                  <Download size={16} />
                  <span className="hidden sm:inline">Export Data</span>
              </button>
              <button 
                onClick={handleImportClick}
                className="flex items-center gap-2 text-xs font-medium px-3 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
                title="Import Pharmacies from CSV"
              >
                  <FileUp size={16} />
                  <span className="hidden sm:inline">Import CSV</span>
              </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Control Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-28">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Pill className="text-indigo-500" size={20} />
                    Campaign Settings
                </h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product to Find</label>
                        <input 
                            type="text" 
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border"
                            placeholder="e.g., Ozempic 1mg"
                            value={config.productName}
                            onChange={(e) => setConfig({...config, productName: e.target.value})}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes for AI</label>
                        <textarea 
                            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border text-sm"
                            rows={2}
                            placeholder="e.g., Any generic alternative is fine."
                            value={config.additionalNotes}
                            onChange={(e) => setConfig({...config, additionalNotes: e.target.value})}
                        />
                    </div>

                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
                         <div className="flex gap-2">
                             {(['professional', 'casual', 'urgent'] as const).map(t => (
                                 <button
                                     key={t}
                                     onClick={() => setConfig({...config, tone: t})}
                                     className={`px-3 py-1 text-xs rounded-full border ${config.tone === t ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-600'}`}
                                 >
                                     {t.charAt(0).toUpperCase() + t.slice(1)}
                                 </button>
                             ))}
                         </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <button 
                            onClick={handleBulkGenerate}
                            disabled={!config.productName || pharmacies.length === 0 || isBulkGenerating}
                            className="w-full bg-white border border-indigo-200 text-indigo-700 py-2.5 rounded-lg font-medium hover:bg-indigo-50 disabled:opacity-50 flex justify-center items-center gap-2 transition-all text-sm"
                        >
                            {isBulkGenerating ? <Sparkles size={16} className="animate-spin"/> : <Sparkles size={16} />}
                            1. Draft Messages
                        </button>

                        <button 
                            onClick={handleAutoSend}
                            disabled={isAutoSending || pharmacies.filter(p => p.message && p.status !== MessageStatus.SENT).length === 0}
                            className={`w-full py-3 rounded-lg font-medium shadow-md flex justify-center items-center gap-2 transition-all
                                ${isAutoSending 
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {isAutoSending ? (
                                <span className="flex items-center gap-2">
                                    Sending {sendingProgress}%...
                                </span>
                            ) : (
                                <>
                                    <Play size={18} fill="currentColor" /> 
                                    2. Auto-Send Campaign
                                </>
                            )}
                        </button>
                        
                        {isAutoSending && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${sendingProgress}%`}}></div>
                            </div>
                        )}

                        <p className="text-[10px] text-gray-400 text-center">
                            *Auto-Send simulates API delivery for CRM tracking. Use Manual Send for real device sending without API keys.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Database & List */}
        <div className="lg:col-span-8 space-y-6">
            
            <Stats pharmacies={pharmacies} />

            {/* Database Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                 
                 {/* Tabs */}
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('ALL')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setActiveTab('PENDING')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'PENDING' ? 'bg-white text-yellow-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pending
                    </button>
                    <button 
                        onClick={() => setActiveTab('AVAILABLE')}
                        className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === 'AVAILABLE' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Available
                    </button>
                 </div>

                 <button onClick={clearAll} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-50" title="Clear Database">
                    <Trash2 size={18} />
                 </button>
            </div>

            {/* List Header */}
            <div className="flex justify-between items-center px-1">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Filter size={16} />
                    {activeTab === 'ALL' ? 'Full Database' : `${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} List`}
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{filteredPharmacies.length}</span>
                </h3>
            </div>

            {/* Add New Form (Compact) */}
            <form onSubmit={addPharmacy} className="flex gap-2 items-center">
                <input 
                    type="text" 
                    placeholder="New Pharmacy Name" 
                    className="flex-1 bg-white border-gray-300 rounded-lg text-sm px-3 py-2 border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    value={newPharmacyName}
                    onChange={(e) => setNewPharmacyName(e.target.value)}
                    required
                />
                <input 
                    type="tel" 
                    placeholder="Phone" 
                    className="w-32 sm:w-48 bg-white border-gray-300 rounded-lg text-sm px-3 py-2 border focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    value={newPharmacyPhone}
                    onChange={(e) => setNewPharmacyPhone(e.target.value)}
                    required
                />
                <button 
                    type="submit"
                    className="bg-gray-900 text-white p-2 rounded-lg hover:bg-black transition-colors"
                    title="Add to Database"
                >
                    <Plus size={20} />
                </button>
            </form>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 gap-4">
                {filteredPharmacies.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                        <Upload size={32} className="mx-auto text-gray-300 mb-2"/>
                        <p className="text-gray-500 text-sm">No pharmacies found in this view.</p>
                        {activeTab === 'ALL' && (
                            <button 
                                onClick={handleImportClick}
                                className="mt-4 text-indigo-600 text-xs font-medium hover:underline"
                            >
                                Import from CSV to get started
                            </button>
                        )}
                    </div>
                ) : (
                    filteredPharmacies.map(pharmacy => (
                        <PharmacyCard 
                            key={pharmacy.id}
                            pharmacy={pharmacy}
                            onDelete={removePharmacy}
                            onUpdateMessage={updateMessage}
                            onRegenerateSingle={handleRegenerateSingle}
                            onStatusChange={updateStatus}
                            onResponseChange={updateResponseStatus}
                        />
                    ))
                )}
            </div>

        </div>

      </main>
    </div>
  );
};

export default App;