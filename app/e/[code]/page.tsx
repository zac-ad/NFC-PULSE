'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface EnterpriseCardData {
  id: string;
  card_code: string;
  employee_name: string;
  employee_title: string;
  email: string;
  status: 'ACTIVE' | 'LOCKED' | 'UNASSIGNED';
}

export default function EnterpriseEmployeeProfilePage() {
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase();

  const [cardData, setCardData] = useState<EnterpriseCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      fetchEnterpriseCard();
      logTapEvent();
    }
  }, [code]);

  const fetchEnterpriseCard = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hardware_cards')
      .select('*')
      .eq('card_code', code)
      .maybeSingle();

    if (!error && data) {
      setCardData(data);
      document.title = `PULSE | ${data.employee_name || 'Corporate Pass'}`;
    }
    setLoading(false);
  };

  const logTapEvent = async () => {
    // Optional telemetry logging for enterprise taps
    try {
      await supabase.from('card_taps').insert({
        card_code: code,
      });
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800/50 rounded-3xl p-8 space-y-6 animate-pulse">
          <div className="w-20 h-20 bg-neutral-900 rounded-full mx-auto" />
          <div className="space-y-3 text-center">
            <div className="h-5 bg-neutral-900 rounded-md w-1/2 mx-auto" />
            <div className="h-4 bg-neutral-900 rounded-md w-1/3 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!cardData || cardData.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800/80 rounded-3xl p-8 text-center space-y-3 shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
            🔒
          </div>
          <h1 className="text-lg font-bold text-white">Badge Inactive or Locked</h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            This corporate pass has been locked or is currently unassigned by organization administration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black text-white p-4 flex justify-center font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full space-y-5 my-auto py-4">

        {/* Corporate Hero Card */}
        <div className="bg-neutral-950/90 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl relative text-center p-8 space-y-6">
          
          {/* Organization Badge Header */}
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-wider rounded-full">
              Acme Corporation Verified
            </span>
            <span className="text-xs font-mono text-neutral-500">{cardData.card_code}</span>
          </div>

          {/* Employee Avatar / Initials */}
          <div className="w-24 h-24 rounded-full border-4 border-neutral-900 overflow-hidden bg-neutral-900 shadow-2xl mx-auto flex items-center justify-center text-3xl font-bold text-neutral-300">
            {cardData.employee_name ? cardData.employee_name[0] : '⚡'}
          </div>

          {/* Employee Name & Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{cardData.employee_name}</h1>
              <span className="w-4 h-4 bg-sky-500 text-black rounded-full flex items-center justify-center shadow-sm">
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-medium">{cardData.employee_title}</p>
          </div>

          {/* Direct Corporate Email Action */}
          {cardData.email && (
            <div className="w-full pt-2">
              <a
                href={`mailto:${cardData.email}`}
                className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-neutral-200 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                Email Corporate Office
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center pt-4 pb-2 space-y-2">
          <p className="text-[10px] font-bold tracking-widest text-neutral-600 uppercase">
            POWERED BY PULSE ENTERPRISE FLEET
          </p>
        </footer>

      </div>
    </main>
  );
}