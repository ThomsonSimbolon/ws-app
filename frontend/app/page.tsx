import Link from 'next/link';
import { ArrowRight, ShieldCheck, TerminalSquare } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6">
      <div className="w-full max-w-2xl space-y-12 text-center">
        
        {/* Header */}
        <header className="space-y-4">
          <div className="flex justify-center mb-6">
             <div className="p-3 bg-zinc-200 dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-800">
                <TerminalSquare className="w-8 h-8 text-zinc-700 dark:text-zinc-300" />
             </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            WhatsApp Multi-Device Service
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Internal System Gateway
          </p>
        </header>

        {/* Main Section */}
        <section className="space-y-4">
          <p className="text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xl mx-auto">
            This system is used to manage WhatsApp devices, messaging, and real-time operations. 
            Access is restricted to authorized personnel only.
          </p>
        </section>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            href="/auth/login" 
            className="group flex items-center justify-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium transition-all hover:bg-zinc-800 dark:hover:bg-zinc-100 hover:shadow-lg hover:shadow-zinc-500/10 dark:hover:shadow-zinc-900/10"
          >
            Masuk ke Sistem
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          
          <Link 
            href="/docs"
            className="px-8 py-3 text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Dokumentasi
          </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="fixed bottom-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
           <ShieldCheck className="w-3 h-3" />
           <span>Secure Verification Required</span>
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          &copy; {new Date().getFullYear()} WhatsApp Multi-Device Service. Internal System.
        </p>
      </footer>
    </main>
  );
}
