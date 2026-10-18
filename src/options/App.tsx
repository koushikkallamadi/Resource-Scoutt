import React, { useEffect, useState } from 'react';
import { ExtensionSettings } from '../shared/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants';
import { Shield, Save, RotateCcw, Check, Sliders } from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (res) => {
      if (res[STORAGE_KEYS.SETTINGS]) {
        setSettings(res[STORAGE_KEYS.SETTINGS]);
      }
    });
  }, []);

  const handleWeightChange = (key: keyof ExtensionSettings['scoringRubric']['weights'], val: number) => {
    setSettings((prev) => ({
      ...prev,
      scoringRubric: {
        ...prev.scoringRubric,
        weights: {
          ...prev.scoringRubric.weights,
          [key]: val,
        },
      },
    }));
  };

  const handleSave = () => {
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ResourceScout Configuration</h1>
            <p className="text-xs text-slate-400">Configure strictness scoring rubric weights & download options</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved!' : 'Save Settings'}</span>
          </button>
        </div>
      </header>

      {/* Rubric Weights Section */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-200">Scoring Rubric Category Weights</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          {Object.entries(settings.scoringRubric.weights).map(([key, weight]) => (
            <div key={key} className="space-y-1.5 p-3 bg-slate-950/60 border border-slate-800/60 rounded-lg">
              <div className="flex items-center justify-between font-medium capitalize text-slate-300">
                <span>{key.replace(/([AZ])/g, ' $1')}</span>
                <span className="font-mono text-brand-400 font-bold">{weight} pts</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={weight}
                onChange={(e) => handleWeightChange(key as any, parseInt(e.target.value, 10))}
                className="w-full accent-brand-500 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Exporter Options */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h2 className="text-sm font-semibold text-slate-200 border-b border-slate-800 pb-3">
          Download & Filtering Defaults
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Filename Template</label>
            <input
              type="text"
              value={settings.filenameTemplate}
              onChange={(e) => setSettings({ ...settings, filenameTemplate: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Placeholders: &#123;title&#125;, &#123;type&#125;, &#123;index&#125;, &#123;ext&#125;</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Min Image Width (px)</label>
              <input
                type="number"
                value={settings.minImageWidth}
                onChange={(e) => setSettings({ ...settings, minImageWidth: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Min Image Height (px)</label>
              <input
                type="number"
                value={settings.minImageHeight}
                onChange={(e) => setSettings({ ...settings, minImageHeight: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
