import Link from 'next/link';
import { Shield, Users, HelpCircle, FileText, ChevronRight, AlertTriangle, Book, Terminal } from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Navigation / Breadcrumb */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center text-sm">
          <Link href="/" className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 mx-2 text-zinc-400" />
          <span className="font-medium text-zinc-900 dark:text-white">Documentation</span>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* 1. Page Header */}
        <header className="space-y-4 border-b border-zinc-200 dark:border-zinc-800 pb-12">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800">
            <Book className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            System Documentation
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400">
            WhatsApp Multi-Device Service — Internal Guide
          </p>
        </header>

        {/* 2. System Overview */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-zinc-500" />
            System Overview
          </h2>
          <div className="prose dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-400 leading-relaxed text-base">
            <p className="mb-4">
              The WhatsApp Multi-Device Service is a centralized internal platform designed to manage messaging devices, monitor real-time message flows, and ensure operational readiness across the organization. It allows authorized personnel to securely connect and oversee WhatsApp instances without relying on physical phones.
            </p>
            <p>
              This system is strictly for <strong>internal use only</strong>. Access is restricted to authorized employees and system operators. It is not intended for public customer access or marketing purposes.
            </p>
          </div>
        </section>

        {/* 3. Role Overview */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-500" />
            Role Overview
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100"></span>
                Admin
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                <li>Manages users and devices system-wide</li>
                <li>Monitors overall system health and nodes</li>
                <li>Controls bulk messaging and job operations</li>
              </ul>
            </div>
            <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600"></span>
                User
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                <li>Manages their own assigned WhatsApp devices</li>
                <li>Sends messages and handles responses</li>
                <li>Monitors status of personal devices</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. Basic Usage Flow */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-zinc-500" />
            Basic Usage Flow
          </h2>
          <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl p-8 border border-zinc-200 dark:border-zinc-800">
            <ol className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-3 space-y-10">
              {[
                "Login to the system using your secure credentials.",
                "Access your designated dashboard based on your assigned role.",
                "Navigate to 'Devices' and connect a WhatsApp instance via QR scan.",
                "Monitor the device card to ensure status shows 'Connected'.",
                "Use the 'Send Message' feature to dispatch communications.",
                "Receive real-time updates on message states and delivery."
              ].map((step, index) => (
                <li key={index} className="ml-8 relative">
                  <span className="absolute -left-[41px] top-0 flex items-center justify-center w-8 h-8 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-full text-sm font-bold text-zinc-700 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium leading-tight">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 5. Common Issues & Troubleshooting */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-zinc-500" />
            Common Issues & Troubleshooting
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { 
                title: "QR code not appearing", 
                action: "Refresh the page. Check your internet connection. If persisting, wait 30 seconds." 
              },
              { 
                title: "Device disconnected unexpectedly", 
                action: "Check the physical phone's internet. Ensure WhatsApp is active. Click 'Reconnect'." 
              },
              { 
                title: "Message not delivered", 
                action: "Verify number format (use country code). Check if device status is 'Connected'." 
              },
              { 
                title: "Real-time updates not received", 
                action: "Ensure your browser supports WebSocket. Refresh the dashboard to reconnect." 
              }
            ].map((item, idx) => (
              <div key={idx} className="p-5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 mb-2">{item.title}</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">Try: {item.action}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Security & Usage Notice */}
        <section className="space-y-6">
          <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-6 flex flex-col sm:flex-row gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg w-fit h-fit">
               <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-400">
                Security & Usage Notice
              </h2>
              <ul className="text-sm text-amber-800 dark:text-amber-300/80 space-y-2 list-disc list-inside">
                <li><strong>Do not share QR codes</strong> generated by the system with anyone outside.</li>
                <li><strong>Do not share login credentials.</strong> All actions are audited.</li>
                <li><strong>Logout after use</strong>, especially on shared workstations.</li>
                <li>Use this system only on <strong>trusted, secure devices</strong>.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 7. Footer */}
        <footer className="border-t border-zinc-200 dark:border-zinc-800 pt-10 pb-12 mt-20 text-center">
          <p className="font-semibold text-zinc-900 dark:text-white mb-2">WhatsApp Multi-Device Service</p>
          <div className="flex items-center justify-center gap-3 text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
            <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Internal System
            </span>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
