import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function Home() {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full" padding="lg">
        <div className="text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-2xl">AD</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">
              Admin Dashboard Template
            </h1>
            <p className="text-xl text-text-secondary">
              Phase 4: Layout System Complete ✓
            </p>
          </div>

          {/* Features */}
          <div className="bg-elevated border border-divider rounded-lg p-6 text-left">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Completed Features:
            </h2>
            <ul className="space-y-2 text-text-secondary text-sm">
              <li>✓ Responsive layout system (desktop/tablet/mobile)</li>
              <li>✓ Collapsible sidebar with breakpoint behavior</li>
              <li>✓ Top navbar with user profile and notifications</li>
              <li>✓ Theme toggle with Redux integration</li>
              <li>✓ Pure composition layout wrapper</li>
              <li>✓ No layout shift on resize</li>
            </ul>
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Link href="/dashboard">
              <Button variant="primary" size="lg" className="w-full">
                Enter Dashboard
              </Button>
            </Link>
            <p className="text-text-muted text-sm">
              Navigate to see the responsive layout in action
            </p>
          </div>

          {/* Tech Stack */}
          <div className="pt-6 border-t border-divider">
            <p className="text-xs text-text-muted">
              Next.js • TypeScript • TailwindCSS • Redux Toolkit
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
